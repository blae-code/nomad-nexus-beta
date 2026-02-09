import { getCommsTemplate } from '../../registries/commsTemplateRegistry';
import { getOperationTTLSeconds } from '../../registries/ttlProfileRegistry';
import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import type { ReportRef } from '../../schemas/reportSchemas';
import { computeRosterSummary, listAssetSlots, listRSVPEntries } from '../rsvpService';
import {
  listAssumptions,
  listDecisions,
  listObjectives,
  listPhases,
  listTasks,
} from '../planningService';
import { getOperationById, listOperationEvents } from '../operationService';
import { confidenceBandFromScore, nowIso, ttlStateFromRemainingSeconds } from '../reportFormatting';
import {
  createEvidence,
  createSection,
  dedupeDataSources,
  dedupeRefs,
  dedupeWarnings,
  formatIso,
} from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

function ttlRemainingSeconds(updatedAt: string, ttlSeconds: number, nowMs: number): number {
  const updatedAtMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs) || ttlSeconds <= 0) return 0;
  return Math.max(0, Math.floor((updatedAtMs + ttlSeconds * 1000 - nowMs) / 1000));
}

export function generateOpBrief(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  // TODO(Package 7): stabilize narrative phrasing presets by template locale/voice pack.
  const opId = params.opId || params.scope.opId || '';
  const templateId = getDefaultReportTemplateIdForKind('OP_BRIEF');
  const warnings: string[] = [];
  const refs: ReportRef[] = [];
  const dataSources = [
    { source: 'operationService' },
    { source: 'planningService' },
    { source: 'rsvpService' },
    { source: 'CommsTemplateRegistry' },
  ];

  const operation = opId ? getOperationById(opId) : null;
  if (!operation) {
    warnings.push('Operation context not found. OP_BRIEF generated with unknown placeholders.');
    return {
      kind: 'OP_BRIEF',
      scope: params.scope,
      title: `Operation Brief - Unknown Operation`,
      generatedAt: nowIso(nowMs),
      generatedBy: params.generatedBy || 'system',
      templateId,
      narrative: [
        createSection(
          'mission-context',
          'Mission Context',
          'Operation context is unknown. Report cannot assert mission baseline without op scope.',
          0
        ),
      ],
      evidence: [
        createEvidence('claim-unknown-op', {
          claim: 'Operation metadata unavailable at generation time.',
          citations: [],
          confidenceBand: 'LOW',
          ttlState: 'N_A',
          notes: 'Create/select an operation before generating OP_BRIEF.',
        }),
      ],
      inputs: {
        refs: [],
        gameVersionContext: params.gameVersionContext,
        dataSources,
      },
      warnings: dedupeWarnings(warnings),
      permissions: {
        viewScope: params.scope.kind,
        editableBy: [params.generatedBy],
      },
    };
  }

  refs.push({ kind: 'operation', id: operation.id });
  const objectives = listObjectives(operation.id);
  const phases = listPhases(operation.id);
  const tasks = listTasks(operation.id);
  const assumptions = listAssumptions(operation.id);
  const decisions = listDecisions(operation.id);
  const rsvpEntries = listRSVPEntries(operation.id);
  const assetSlots = listAssetSlots(operation.id);
  const rosterSummary = computeRosterSummary(operation.id);
  const opEvents = listOperationEvents(operation.id);
  const rescueSignalCount = opEvents.filter((event) =>
    ['RESCUE', 'MEDEVAC', 'EXTRACT', 'MEDICAL', 'CHECK_FIRE', 'CEASE_FIRE'].some((token) =>
      String(event.kind || '').toUpperCase().includes(token)
    )
  ).length;
  const commsTemplate = getCommsTemplate(operation.commsTemplateId as any);

  if (!objectives.length) warnings.push('No objectives recorded.');
  if (!phases.length) warnings.push('No phases recorded.');
  if (!tasks.length) warnings.push('No tasks recorded.');
  if (!assumptions.length) warnings.push('No assumptions recorded.');
  if (!rsvpEntries.length) warnings.push('No RSVP entries recorded.');
  if (rosterSummary.openSeats.length > 0) warnings.push('Roster has open crew seats.');

  const opTtlSeconds = getOperationTTLSeconds(operation.ttlProfileId, operation.status, 2400);
  const opRemainingTtlSeconds = ttlRemainingSeconds(operation.updatedAt, opTtlSeconds, nowMs);

  const narrative = [
    createSection(
      'mission-context',
      'Mission Context',
      [
        `Operation ${operation.name} is ${operation.status} with ${operation.posture} posture.`,
        `Area of operations anchor: ${operation.ao.nodeId}.`,
        `Comms doctrine: ${operation.commsTemplateId} (${commsTemplate?.channels.length || 0} channels).`,
      ].join('\n'),
      0,
      [{ kind: 'operation', id: operation.id }]
    ),
    createSection(
      'plan-shape',
      'Plan Shape',
      [
        `Objectives: ${objectives.length}. Phases: ${phases.length}. Tasks: ${tasks.length}.`,
        objectives.length
          ? `Primary objective: ${objectives[0].title}.`
          : 'Primary objective is unknown (none recorded).',
      ].join('\n'),
      1,
      objectives.slice(0, 3).map((item) => ({ kind: 'objective', id: item.id }))
    ),
    createSection(
      'force-readiness',
      'Force Readiness',
      [
        `RSVP submitted: ${rosterSummary.submittedCount}. Assets: ${rosterSummary.assetEntryCount}.`,
        `Open seats: ${rosterSummary.openSeats.reduce((count, seat) => count + seat.openQty, 0)}.`,
        `Compliance flags: hard ${rosterSummary.hardViolations}, soft ${rosterSummary.softFlags}.`,
      ].join('\n'),
      2,
      rsvpEntries.slice(0, 4).map((entry) => ({ kind: 'rsvp', id: entry.id }))
    ),
    createSection(
      'risk-assumptions',
      'Risk and Assumptions',
      assumptions.length
        ? assumptions
            .slice(0, 4)
            .map((assumption) => `- ${assumption.statement} (${assumption.status}, conf ${Math.round(assumption.confidence * 100)}%)`)
            .join('\n')
        : 'Assumption state unknown (no assumptions recorded).',
      3,
      assumptions.slice(0, 4).map((assumption) => ({ kind: 'assumption', id: assumption.id }))
    ),
    createSection(
      'rescue-priorities',
      'Rescue Priorities',
      [
        'KISS: preserve life, stabilize casualties, and protect extraction lanes.',
        rescueSignalCount
          ? `Historical rescue markers in this op context: ${rescueSignalCount}.`
          : 'Rescue marker history is unknown or empty; brief medical contingencies explicitly.',
      ].join('\n'),
      4,
      opEvents.slice(0, 4).map((event) => ({ kind: 'op_event', id: event.id }))
    ),
  ];

  const evidence = [
    createEvidence('claim-op-context', {
      claim: `Operation posture/status is ${operation.posture}/${operation.status} with AO ${operation.ao.nodeId}.`,
      citations: [
        {
          kind: 'REFERENCE_SPEC',
          refId: operation.commsTemplateId,
          source: 'CommsTemplateRegistry',
        },
        ...opEvents.slice(0, 1).map((event) => ({
          kind: 'OP_EVENT' as const,
          refId: event.id,
          occurredAt: event.createdAt,
          source: 'operationService',
        })),
      ],
      confidenceBand: confidenceBandFromScore(0.8),
      ttlState: ttlStateFromRemainingSeconds(opRemainingTtlSeconds),
      notes: `Operation freshness window uses ${operation.ttlProfileId} (${opTtlSeconds}s default).`,
    }),
    createEvidence('claim-plan-depth', {
      claim: `Planning artifacts include ${objectives.length} objectives, ${phases.length} phases, and ${tasks.length} tasks.`,
      citations: [
        ...objectives.slice(0, 4).map((objective) => ({
          kind: 'PLANNING' as const,
          refId: objective.id,
          occurredAt: objective.updatedAt,
          source: 'planningService',
        })),
        ...phases.slice(0, 3).map((phase) => ({
          kind: 'PLANNING' as const,
          refId: phase.id,
          occurredAt: phase.updatedAt,
          source: 'planningService',
        })),
        ...tasks.slice(0, 4).map((task) => ({
          kind: 'PLANNING' as const,
          refId: task.id,
          occurredAt: task.updatedAt,
          source: 'planningService',
        })),
      ],
      confidenceBand: confidenceBandFromScore(objectives.length + phases.length + tasks.length > 0 ? 0.72 : 0.3),
      ttlState: 'N_A',
    }),
    createEvidence('claim-roster-readiness', {
      claim: `Roster currently reports ${rosterSummary.submittedCount} submitted participants and ${assetSlots.length} asset slots.`,
      citations: [
        ...rsvpEntries.slice(0, 5).map((entry) => ({
          kind: 'RSVP' as const,
          refId: entry.id,
          occurredAt: entry.updatedAt,
          source: 'rsvpService',
        })),
        ...assetSlots.slice(0, 4).map((slot) => ({
          kind: 'RSVP' as const,
          refId: slot.id,
          occurredAt: slot.updatedAt,
          source: 'rsvpService',
        })),
      ],
      confidenceBand: confidenceBandFromScore(rsvpEntries.length > 0 ? 0.7 : 0.35),
      ttlState: 'N_A',
      notes: rosterSummary.openSeats.length > 0 ? 'Open seats remain and may constrain launch readiness.' : undefined,
    }),
    createEvidence('claim-command-anchors', {
      claim: decisions.length
        ? `Decision log contains ${decisions.length} command decisions for this operation.`
        : 'Decision log has no entries; command intent continuity is unknown.',
      citations: decisions.slice(0, 4).map((decision) => ({
        kind: 'PLANNING' as const,
        refId: decision.id,
        occurredAt: decision.createdAt,
        source: 'planningService',
      })),
      confidenceBand: confidenceBandFromScore(decisions.length ? 0.74 : 0.28),
      ttlState: 'N_A',
      notes: decisions.length ? undefined : 'Record key decisions to improve after-action traceability.',
    }),
    createEvidence('claim-rescue-emphasis', {
      claim: rescueSignalCount
        ? `Operation context includes ${rescueSignalCount} rescue-related event markers.`
        : 'Rescue emphasis requires explicit operator confirmation; event stream has no rescue markers yet.',
      citations: opEvents.slice(0, 6).map((event) => ({
        kind: 'OP_EVENT' as const,
        refId: event.id,
        occurredAt: event.createdAt,
        source: 'operationService',
      })),
      confidenceBand: confidenceBandFromScore(rescueSignalCount > 0 ? 0.68 : 0.4),
      ttlState: 'N_A',
    }),
  ];

  refs.push(
    ...objectives.map((objective) => ({ kind: 'objective', id: objective.id })),
    ...phases.map((phase) => ({ kind: 'phase', id: phase.id })),
    ...tasks.map((task) => ({ kind: 'task', id: task.id })),
    ...assumptions.map((assumption) => ({ kind: 'assumption', id: assumption.id })),
    ...decisions.map((decision) => ({ kind: 'decision', id: decision.id })),
    ...rsvpEntries.map((entry) => ({ kind: 'rsvp', id: entry.id })),
    ...assetSlots.map((slot) => ({ kind: 'asset_slot', id: slot.id })),
    ...opEvents.map((event) => ({ kind: 'op_event', id: event.id }))
  );

  dataSources.push({
    source: 'CommsTemplateRegistry',
    note: `Template ${operation.commsTemplateId} (channels ${commsTemplate?.channels.length || 0})`,
  });

  return {
    kind: 'OP_BRIEF',
    scope: { kind: 'OP', opId: operation.id },
    title: `Operation Brief - ${operation.name}`,
    generatedAt: nowIso(nowMs),
    generatedBy: params.generatedBy || 'system',
    templateId,
    narrative,
    evidence,
    inputs: {
      refs: dedupeRefs(refs),
      gameVersionContext: params.gameVersionContext,
      dataSources: dedupeDataSources(dataSources),
    },
    warnings: dedupeWarnings([
      ...warnings,
      `Generated from snapshot at ${formatIso(nowIso(nowMs))}.`,
    ]),
    permissions: {
      viewScope: 'OP',
      editableBy: [params.generatedBy, operation.createdBy].filter(Boolean),
    },
  };
}
