import { getAuthContext, isAiFeaturesEnabled, readJson } from './_shared/memberAuth.ts';

type NarrativeMode = 'MISSION_BRIEF' | 'STORY_SO_FAR' | 'AAR_EPILOGUE' | 'IC_SUMMARY';

function toText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value : '';
  return text.trim() || fallback;
}

function toArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function toMode(value: unknown): NarrativeMode {
  const candidate = toText(value, 'STORY_SO_FAR').toUpperCase();
  if (candidate === 'MISSION_BRIEF') return 'MISSION_BRIEF';
  if (candidate === 'AAR_EPILOGUE') return 'AAR_EPILOGUE';
  if (candidate === 'IC_SUMMARY') return 'IC_SUMMARY';
  return 'STORY_SO_FAR';
}

function buildNarrativePrompt(payload: any, actorLabel: string) {
  const mode = toMode(payload.mode);
  const title = toText(payload.title, 'Narrative Update');
  const notes = toText(payload.notes, '');
  const styleHint = toText(payload.styleHint, 'Mission-control, concise, immersive but restrained.');
  const context = payload.context && typeof payload.context === 'object' ? payload.context : {};
  const operation = context.operation && typeof context.operation === 'object' ? context.operation : {};
  const timeline = toArray(context.timeline).slice(0, 16);
  const refs = toArray(payload.refs).slice(0, 20);

  const timelineLines = timeline.length
    ? timeline.map((entry: any, index) => `- ${index + 1}. ${toText(entry.summary || entry.kind || entry.title || JSON.stringify(entry))}`).join('\n')
    : '- No structured timeline events supplied.';
  const refLines = refs.length
    ? refs.map((ref: any) => `- ${toText(ref.kind, 'ref')}:${toText(ref.id, 'unknown')}`).join('\n')
    : '- No explicit references supplied.';

  const operationContext = [
    `Operation Id: ${toText(payload.opId || operation.id, 'unknown')}`,
    `Operation Name: ${toText(operation.name, 'unknown')}`,
    `Status/Posture: ${toText(operation.status, 'unknown')}/${toText(operation.posture, 'unknown')}`,
    `AO: ${toText(operation.ao?.nodeId, 'unknown')}`,
  ].join('\n');

  // Doctrine prompt enforces rescue-first framing and explicit unknown handling.
  const prompt = `You are the Nomad Nexus Narrative Assistant.
Generate a ${mode} entry using mission-control style.

Hard doctrine:
1) Rescue-first framing: prioritize survivability, extraction, aid, and de-escalation.
2) Do not invent facts. If data is missing, state "unknown".
3) Keep language immersive but professional and concise.
4) No omniscient claims. Keep scope grounded to supplied context.
5) Include at least one explicit line that starts with "KISS:" to reinforce brevity.

Requested title: ${title}
Operator: ${actorLabel}
Style hint: ${styleHint}
Additional notes: ${notes || 'none'}

Operation context:
${operationContext}

Timeline hints:
${timelineLines}

Reference hints:
${refLines}

Return JSON with:
- title (string)
- narrative (string, markdown allowed)
- warnings (array of strings)
- refs (array of { kind, id })
`;

  return { mode, prompt, title };
}

async function tryPersistArtifacts(base44: any, payload: any, generated: any, actorLabel: string) {
  const result = {
    reportId: null as string | null,
    narrativeEventId: null as string | null,
    eventLogId: null as string | null,
    warnings: [] as string[],
  };

  const eventId = toText(payload.persistToEventId || payload.eventId, '');
  const persistNarrative = payload.persist !== false;

  if (!persistNarrative) return result;

  if (eventId) {
    try {
      const reportRecord = await base44.entities.EventReport.create({
        event_id: eventId,
        report_type: 'NARRATIVE',
        title: generated.title,
        content: generated.narrative,
        generated_by: 'AI_NARRATIVE_TOOLKIT',
        key_findings: generated.warnings || [],
      });
      result.reportId = reportRecord?.id || null;
    } catch {
      result.warnings.push('EventReport persistence unavailable for this environment.');
    }

    try {
      const eventLog = await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'NOTE',
        severity: 'LOW',
        summary: `Narrative generated: ${generated.title}`,
        details: {
          source: 'AI_NARRATIVE_TOOLKIT',
          actor: actorLabel,
          refs: generated.refs || [],
        },
      });
      result.eventLogId = eventLog?.id || null;
    } catch {
      result.warnings.push('EventLog persistence unavailable for this environment.');
    }
  }

  try {
    const narrativeEvent = await base44.entities.NarrativeEvent.create({
      op_id: toText(payload.opId, null as any),
      title: generated.title,
      content: generated.narrative,
      source_kind: 'AI',
      visibility: 'OP',
      in_character: false,
      actor_label: actorLabel,
      refs: generated.refs || [],
      meta: {
        generated_by: 'AI_NARRATIVE_TOOLKIT',
        rescue_first: true,
        warnings: generated.warnings || [],
      },
    });
    result.narrativeEventId = narrativeEvent?.id || null;
  } catch {
    result.warnings.push('NarrativeEvent entity unavailable; saved output can still be consumed client-side.');
  }

  return result;
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (actorType === 'member' && !isAiFeaturesEnabled(memberProfile)) {
      return Response.json({ success: false, error: 'AI features are disabled for this profile.' }, { status: 403 });
    }

    const actorLabel =
      toText(memberProfile?.display_callsign) ||
      toText(memberProfile?.callsign) ||
      toText(adminUser?.full_name) ||
      'Operator';

    const { mode, prompt, title } = buildNarrativePrompt(payload, actorLabel);

    // Sample payload shape:
    // {
    //   mode: 'STORY_SO_FAR',
    //   opId: 'op_123',
    //   context: { operation: { name: 'Redscar Echo', status: 'ACTIVE' }, timeline: [{ summary: 'Medic stabilized pilot' }] },
    //   refs: [{ kind: 'operation', id: 'op_123' }]
    // }
    const llm = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          narrative: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
          refs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string' },
                id: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const generated = {
      title: toText(llm?.title, title),
      narrative: toText(
        llm?.narrative,
        `KISS: concise update only.\nNarrative generation returned no content. Context remains unknown.`
      ),
      warnings: toArray(llm?.warnings).map((entry) => toText(entry)).filter(Boolean),
      refs: toArray(llm?.refs)
        .map((ref) => ({
          kind: toText(ref?.kind, ''),
          id: toText(ref?.id, ''),
        }))
        .filter((ref) => ref.kind && ref.id),
    };

    const persisted = await tryPersistArtifacts(base44, payload, generated, actorLabel);

    return Response.json({
      success: true,
      mode,
      title: generated.title,
      narrative: generated.narrative,
      warnings: [...generated.warnings, ...persisted.warnings],
      refs: generated.refs,
      generatedBy: 'AI_NARRATIVE_TOOLKIT',
      model: 'Core.InvokeLLM',
      persisted,
      doctrine: {
        rescueFirst: true,
        noFabrication: true,
      },
    });
  } catch (error: any) {
    console.error('generateNarrative error:', error);
    return Response.json(
      {
        success: false,
        error: error?.message || 'Narrative generation failed',
      },
      { status: 500 }
    );
  }
});
