import { createServiceClient, readJson } from './_shared/memberAuth.ts';
import { enforceJsonPost, verifyInternalAutomationRequest } from './_shared/security.ts';

/**
 * Scheduled scan - Check all active events for readiness issues
 * Runs every 30 minutes
 */
type ReadinessStatus = 'GREEN' | 'YELLOW' | 'RED';

interface ReadinessCounts {
  participants: number;
  objectives: number;
  assignedAssets: number;
  ready: number;
  inQuantum: number;
  engaged: number;
  down: number;
  distress: number;
}

interface ReadinessAssessment {
  status: ReadinessStatus;
  concerns: string[];
  recommendations: string[];
  requiresAttention: boolean;
  llmCandidate: boolean;
}

interface LlmScanOutput {
  status?: ReadinessStatus;
  concerns?: string[];
  recommendations?: string[];
  requires_attention?: boolean;
}

const MAX_EVENTS_DEFAULT = 40;
const MAX_SCAN_TIME_MS_DEFAULT = 25_000;
const MAX_LLM_INVOCATIONS_DEFAULT = 3;

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(String(Deno.env.get(name) || ''), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

function normalizeStatus(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

function summarizeCounts(event: any, participants: any[], statuses: any[]): ReadinessCounts {
  const counters: ReadinessCounts = {
    participants: participants.length,
    objectives: Array.isArray(event?.objectives) ? event.objectives.length : 0,
    assignedAssets: Array.isArray(event?.assigned_asset_ids) ? event.assigned_asset_ids.length : 0,
    ready: 0,
    inQuantum: 0,
    engaged: 0,
    down: 0,
    distress: 0,
  };

  for (const row of statuses) {
    const status = normalizeStatus((row as any)?.status);
    if (status === 'READY') counters.ready += 1;
    if (status === 'IN_QUANTUM') counters.inQuantum += 1;
    if (status === 'ENGAGED') counters.engaged += 1;
    if (status === 'DOWN') counters.down += 1;
    if (status === 'DISTRESS') counters.distress += 1;
  }

  return counters;
}

function buildDeterministicAssessment(event: any, counts: ReadinessCounts): ReadinessAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let status: ReadinessStatus = 'GREEN';
  let llmCandidate = false;

  const participantFloor = Math.max(1, counts.participants);
  const readyRatio = counts.ready / participantFloor;

  if (counts.participants === 0) {
    concerns.push('No participants are currently attached to the active event.');
    recommendations.push('Assign command and flight elements before operation continues.');
    status = 'YELLOW';
  }

  if (counts.objectives === 0) {
    concerns.push('No objectives are defined for this event.');
    recommendations.push('Publish at least one objective to anchor command intent.');
    status = status === 'RED' ? 'RED' : 'YELLOW';
  }

  if (counts.distress > 0 || counts.down > 0) {
    concerns.push(`Critical personnel state detected (DISTRESS ${counts.distress}, DOWN ${counts.down}).`);
    recommendations.push('Prioritize rescue/medical tasking and stabilize affected units.');
    status = 'RED';
  } else if (readyRatio < 0.35) {
    concerns.push(`Readiness ratio is critically low (${Math.round(readyRatio * 100)}% READY).`);
    recommendations.push('Pause escalation and run readiness recovery actions before committing.');
    status = 'RED';
  } else if (readyRatio < 0.7) {
    concerns.push(`Readiness ratio below command threshold (${Math.round(readyRatio * 100)}% READY).`);
    recommendations.push('Confirm ACK/RSVP status and hold until ready ratio improves.');
    status = status === 'RED' ? 'RED' : 'YELLOW';
    llmCandidate = counts.participants >= 4;
  }

  if (counts.assignedAssets === 0 && counts.participants > 0) {
    concerns.push('Participants are present but no assets are assigned.');
    recommendations.push('Bind operational assets or revise the plan for assetless execution.');
    status = status === 'RED' ? 'RED' : 'YELLOW';
    llmCandidate = llmCandidate || counts.participants >= 4;
  }

  if (status === 'GREEN') {
    recommendations.push('Maintain comms discipline and continue plan execution.');
  }

  return {
    status,
    concerns: concerns.slice(0, 6),
    recommendations: recommendations.slice(0, 6),
    requiresAttention: status !== 'GREEN',
    llmCandidate,
  };
}

function mergeAssessment(base: ReadinessAssessment, llm: LlmScanOutput | null): ReadinessAssessment {
  if (!llm || typeof llm !== 'object') return base;
  const status =
    llm.status === 'GREEN' || llm.status === 'YELLOW' || llm.status === 'RED'
      ? llm.status
      : base.status;
  const concerns = toStringArray(llm.concerns);
  const recommendations = toStringArray(llm.recommendations);
  const llmRequiresAttention =
    typeof llm.requires_attention === 'boolean' ? llm.requires_attention : null;
  return {
    status,
    concerns: concerns.length > 0 ? concerns : base.concerns,
    recommendations: recommendations.length > 0 ? recommendations : base.recommendations,
    requiresAttention:
      llmRequiresAttention === null ? base.requiresAttention : llmRequiresAttention,
    llmCandidate: base.llmCandidate,
  };
}

function shouldInvokeLlm(params: {
  llmMode: string;
  assessment: ReadinessAssessment;
  llmInvocations: number;
  maxLlmInvocations: number;
  hasLlm: boolean;
}): boolean {
  const { llmMode, assessment, llmInvocations, maxLlmInvocations, hasLlm } = params;
  if (!hasLlm || llmInvocations >= maxLlmInvocations) return false;
  if (llmMode === 'off') return false;
  if (llmMode === 'always') return assessment.requiresAttention;
  return assessment.requiresAttention && assessment.status === 'YELLOW' && assessment.llmCandidate;
}

function buildLlmPrompt(event: any, counts: ReadinessCounts, assessment: ReadinessAssessment): string {
  return `Readiness check for active operation.

Only use the evidence below. Do not fabricate telemetry.

Event: ${event?.title || 'Untitled Event'}
Priority: ${event?.priority || 'unknown'}
Phase: ${event?.phase || 'unknown'}
Participants: ${counts.participants}
Objectives: ${counts.objectives}
Assigned Assets: ${counts.assignedAssets}

Player Statuses:
- READY: ${counts.ready}
- IN_QUANTUM: ${counts.inQuantum}
- ENGAGED: ${counts.engaged}
- DOWN: ${counts.down}
- DISTRESS: ${counts.distress}

Deterministic baseline:
- status: ${assessment.status}
- concerns: ${assessment.concerns.join(' | ') || 'none'}

Refine concerns/recommendations for command action.`;
}

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const payload = await readJson(req);
    const internalAuth = verifyInternalAutomationRequest(req, payload, { requiredWhenSecretMissing: true });
    if (!internalAuth.ok) {
      return Response.json({ error: internalAuth.error }, { status: internalAuth.status });
    }
    const base44 = createServiceClient();
    const llmMode = String(Deno.env.get('READINESS_LLM_MODE') || 'auto').trim().toLowerCase();
    const maxEvents = envInt('READINESS_MAX_EVENTS', MAX_EVENTS_DEFAULT, 1, 500);
    const maxScanTimeMs = envInt('READINESS_MAX_SCAN_TIME_MS', MAX_SCAN_TIME_MS_DEFAULT, 5_000, 120_000);
    const maxLlmInvocations = envInt('READINESS_MAX_LLM_INVOCATIONS', MAX_LLM_INVOCATIONS_DEFAULT, 0, 20);
    const scanStart = Date.now();

    const activeEventsRaw = await base44.asServiceRole.entities.Event.filter({
      status: 'active',
    });
    const activeEvents = Array.isArray(activeEventsRaw)
      ? activeEventsRaw.slice(0, maxEvents)
      : [];

    if (activeEvents.length === 0) {
      return Response.json({
        success: true,
        scanned: 0,
        findings: 0,
        llmInvocations: 0,
        deterministicFindings: 0,
        message: 'No active events',
      });
    }

    const findings = [];
    let scanned = 0;
    let llmInvocations = 0;
    let deterministicFindings = 0;
    let truncated = false;

    for (const event of activeEvents) {
      if (Date.now() - scanStart >= maxScanTimeMs) {
        truncated = true;
        break;
      }

      scanned += 1;

      const [participantsRaw, statusesRaw] = await Promise.all([
        base44.asServiceRole.entities.EventParticipant.filter({ eventId: event.id }).catch(() => []),
        base44.asServiceRole.entities.PlayerStatus.filter({ event_id: event.id }).catch(() => []),
      ]);
      const participants = Array.isArray(participantsRaw) ? participantsRaw : [];
      const statuses = Array.isArray(statusesRaw) ? statusesRaw : [];
      const counts = summarizeCounts(event, participants, statuses);
      const deterministic = buildDeterministicAssessment(event, counts);

      const hasLlm =
        typeof base44?.asServiceRole?.integrations?.Core?.InvokeLLM === 'function';
      const invokeLlm = shouldInvokeLlm({
        llmMode,
        assessment: deterministic,
        llmInvocations,
        maxLlmInvocations,
        hasLlm,
      });

      let llmUsed = false;
      let assessment = deterministic;

      if (invokeLlm) {
        try {
          const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: buildLlmPrompt(event, counts, deterministic),
            response_json_schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['GREEN', 'YELLOW', 'RED'] },
                concerns: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                requires_attention: { type: 'boolean' },
              },
            },
          });
          assessment = mergeAssessment(deterministic, llmResult as LlmScanOutput);
          llmInvocations += 1;
          llmUsed = true;
        } catch (error) {
          console.warn('[scanReadiness] LLM refinement failed; fallback to deterministic assessment.', error);
        }
      }

      if (!assessment.requiresAttention) continue;
      if (!llmUsed) deterministicFindings += 1;

      await base44.asServiceRole.entities.AIAgentLog.create({
        agent_slug: 'tactical_ai',
        event_id: event.id,
        type: 'ALERT',
        severity: assessment.status === 'RED' ? 'HIGH' : 'MEDIUM',
        summary: `Readiness Alert: ${event.title}`,
        details: JSON.stringify({
          status: assessment.status,
          concerns: assessment.concerns,
          recommendations: assessment.recommendations,
          participant_count: counts.participants,
          ready_count: counts.ready,
          in_quantum_count: counts.inQuantum,
          engaged_count: counts.engaged,
          down_count: counts.down,
          distress_count: counts.distress,
          objectives: counts.objectives,
          assigned_assets: counts.assignedAssets,
          assessment_mode: llmUsed ? 'hybrid' : 'deterministic',
        }),
      });

      findings.push({
        event_id: event.id,
        event_title: event.title,
        status: assessment.status,
        concerns: assessment.concerns,
        assessment_mode: llmUsed ? 'hybrid' : 'deterministic',
      });

      if (assessment.status === 'RED' && event.command_staff?.commander_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: event.command_staff.commander_id,
          type: 'READINESS_ALERT',
          title: `⚠️ Readiness Alert: ${event.title}`,
          message: assessment.concerns[0] || 'Critical gaps detected',
          link: `/ops/events/${event.id}`,
          priority: 'high',
        });
      }
    }

    return Response.json({
      success: true,
      scanned,
      findings: findings.length,
      llmInvocations,
      deterministicFindings,
      truncated,
      details: findings,
    });
  } catch (error) {
    console.error('Readiness scan failed:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
