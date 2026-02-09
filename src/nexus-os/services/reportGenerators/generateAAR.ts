import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import type { ReportRef } from '../../schemas/reportSchemas';
import { analyzeRoster } from '../forceDesignService';
import { listAllIntelObjectsForDev } from '../intelService';
import { getOperationById, listOperationEvents } from '../operationService';
import { listComments } from '../opThreadService';
import {
  listAssumptions,
  listDecisions,
  listObjectives,
  listTasks,
} from '../planningService';
import { listAssetSlots, listRSVPEntries } from '../rsvpService';
import { confidenceBandFromScore, nowIso } from '../reportFormatting';
import {
  createEvidence,
  createSection,
  dedupeDataSources,
  dedupeRefs,
  dedupeWarnings,
} from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

export function generateAAR(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  // TODO(Package 7): add deterministic ranking weights for deviation and intel-delta ordering.
  const opId = params.opId || params.scope.opId || '';
  const templateId = getDefaultReportTemplateIdForKind('AAR');
  const warnings: string[] = [];
  const refs: ReportRef[] = [];
  const dataSources = [
    { source: 'operationService' },
    { source: 'planningService' },
    { source: 'intelService' },
    { source: 'rsvpService' },
    { source: 'forceDesignService' },
  ];

  const operation = opId ? getOperationById(opId) : null;
  if (!operation) {
    warnings.push('Operation context not found. AAR generated with unknown placeholders.');
    return {
      kind: 'AAR',
      scope: params.scope,
      title: 'After Action Report - Unknown Operation',
      generatedAt: nowIso(nowMs),
      generatedBy: params.generatedBy || 'system',
      templateId,
      narrative: [
        createSection(
          'outcome-summary',
          'Outcome Summary',
          'Operation context unavailable. Outcome cannot be reconstructed deterministically.',
          0
        ),
      ],
      evidence: [
        createEvidence('claim-aar-unknown-op', {
          claim: 'AAR generation lacked operation scope.',
          citations: [],
          confidenceBand: 'LOW',
          ttlState: 'N_A',
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
  const tasks = listTasks(operation.id);
  const assumptions = listAssumptions(operation.id);
  const decisions = listDecisions(operation.id);
  const comments = listComments(operation.id);
  const events = listOperationEvents(operation.id);
  const entries = listRSVPEntries(operation.id);
  const slots = listAssetSlots(operation.id);
  const force = analyzeRoster(operation.id, nowMs);

  const allIntel = listAllIntelObjectsForDev();
  const intelForOp = allIntel.filter((intel) => {
    const scopeMatch = intel.scope.kind === 'OP' && (intel.scope.opIds || []).includes(operation.id);
    const linkedMatch = (operation.linkedIntelIds || []).includes(intel.id);
    return scopeMatch || linkedMatch;
  });
  const intelChanges = intelForOp.filter(
    (intel) => intel.promotionHistory.length > 0 || Boolean(intel.retiredAt)
  );

  const challengedAssumptions = assumptions.filter((assumption) => assumption.status === 'CHALLENGED');
  const blockedOrDeferredTasks = tasks.filter(
    (task) => task.status === 'BLOCKED' || task.status === 'DEFERRED'
  );
  const deviationEvents = events.filter((event) =>
    ['MARK_AVOID', 'REQUEST_PATROL', 'DECLARE_HOLD', 'REPORT_CONTACT'].includes(event.kind)
  );
  const rescueOrRecoveryEvents = events.filter((event) =>
    ['EXTRACT', 'RESCUE', 'MEDEVAC', 'RECOVERY', 'CHECK_FIRE', 'CEASE_FIRE'].some((token) =>
      String(event.kind || '').toUpperCase().includes(token)
    )
  );

  if (!decisions.length) warnings.push('No decisions logged; command trace is incomplete.');
  if (!intelChanges.length) warnings.push('No intel promotion/retirement events found for this op.');
  if (!challengedAssumptions.length) {
    warnings.push('No challenged assumptions recorded; assumptions-that-failed section remains unknown.');
  }
  if (!deviationEvents.length && !blockedOrDeferredTasks.length) {
    warnings.push('No explicit deviation markers found; deviation analysis may be incomplete.');
  }

  const narrative = [
    createSection(
      'outcome-summary',
      'Outcome Summary',
      [
        `Operation ${operation.name} closed in status ${operation.status}.`,
        `Recorded op events: ${events.length}.`,
        `Decisions captured: ${decisions.length}.`,
        rescueOrRecoveryEvents.length
          ? `Rescue/recovery markers logged: ${rescueOrRecoveryEvents.length}.`
          : 'Rescue/recovery outcome: unknown (no explicit rescue markers logged).',
      ].join('\n'),
      0,
      [{ kind: 'operation', id: operation.id }]
    ),
    createSection(
      'decision-trace',
      'Decision Trace',
      decisions.length
        ? decisions
            .slice(0, 6)
            .map((decision, index) => `${index + 1}. ${decision.title} (${new Date(decision.createdAt).toISOString()})`)
            .join('\n')
        : 'Decision trace unknown: no decisions recorded.',
      1,
      decisions.slice(0, 6).map((decision) => ({ kind: 'decision', id: decision.id }))
    ),
    createSection(
      'intel-delta',
      'Intel Delta',
      intelChanges.length
        ? intelChanges
            .slice(0, 6)
            .map((intel) => {
              const action = intel.retiredAt ? 'retired' : 'updated';
              return `- ${intel.title} (${intel.stratum}) ${action}; promotions ${intel.promotionHistory.length}.`;
            })
            .join('\n')
        : 'No op-scoped intel promotions/retirements were recorded.',
      2,
      intelChanges.slice(0, 6).map((intel) => ({ kind: 'intel', id: intel.id }))
    ),
    createSection(
      'deviations-lessons',
      'Deviations and Failed Assumptions',
      [
        challengedAssumptions.length
          ? `Challenged assumptions (${challengedAssumptions.length}): ${challengedAssumptions.map((item) => item.statement).join(' | ')}`
          : 'Assumptions that failed: unknown (no challenged assumptions).',
        blockedOrDeferredTasks.length
          ? `Blocked/deferred tasks (${blockedOrDeferredTasks.length}) indicate plan deviation.`
          : 'No blocked/deferred tasks recorded.',
        deviationEvents.length
          ? `Deviation events logged (${deviationEvents.length}) via op event stream.`
          : 'No explicit deviation events recorded.',
      ].join('\n'),
      3,
      challengedAssumptions.map((assumption) => ({ kind: 'assumption', id: assumption.id }))
    ),
    createSection(
      'rescue-preservation',
      'Rescue and Preservation of Life',
      rescueOrRecoveryEvents.length
        ? rescueOrRecoveryEvents
            .slice(0, 6)
            .map((event) => `- ${event.kind} at ${new Date(event.createdAt).toISOString()} by ${event.createdBy}`)
            .join('\n')
        : 'No explicit rescue events were recorded; treat rescue outcome as unknown, not absent.',
      4,
      rescueOrRecoveryEvents.slice(0, 6).map((event) => ({ kind: 'op_event', id: event.id }))
    ),
    createSection(
      'force-posture',
      'Force Posture Snapshot',
      [
        `Coverage rows: ${force.coverageMatrix.rows.length}.`,
        `Detected gaps: ${force.gaps.length}.`,
        `Confidence: ${force.confidenceSummary.band}.`,
      ].join('\n'),
      5,
      slots.slice(0, 6).map((slot) => ({ kind: 'asset_slot', id: slot.id }))
    ),
  ];

  const evidence = [
    createEvidence('claim-outcome', {
      claim: `AAR snapshot includes ${events.length} operation events and ${comments.length} thread comments.`,
      citations: [
        ...events.slice(0, 6).map((event) => ({
          kind: 'OP_EVENT' as const,
          refId: event.id,
          occurredAt: event.createdAt,
          source: 'operationService',
        })),
        ...comments.slice(0, 4).map((comment) => ({
          kind: 'PLANNING' as const,
          refId: comment.id,
          occurredAt: comment.at,
          source: 'opThreadService',
        })),
      ],
      confidenceBand: confidenceBandFromScore(events.length ? 0.78 : 0.4),
      ttlState: 'N_A',
    }),
    createEvidence('claim-assumptions', {
      claim: challengedAssumptions.length
        ? `${challengedAssumptions.length} assumptions were challenged during execution.`
        : 'No challenged assumptions were recorded; failure analysis is partially unknown.',
      citations: challengedAssumptions.slice(0, 6).map((assumption) => ({
        kind: 'PLANNING' as const,
        refId: assumption.id,
        occurredAt: assumption.updatedAt,
        source: 'planningService',
      })),
      confidenceBand: confidenceBandFromScore(challengedAssumptions.length ? 0.76 : 0.3),
      ttlState: 'N_A',
    }),
    createEvidence('claim-deviations', {
      claim:
        blockedOrDeferredTasks.length || deviationEvents.length
          ? `Deviation markers detected from tasks (${blockedOrDeferredTasks.length}) and events (${deviationEvents.length}).`
          : 'No deviation markers detected in recorded tasks/events.',
      citations: [
        ...blockedOrDeferredTasks.slice(0, 6).map((task) => ({
          kind: 'PLANNING' as const,
          refId: task.id,
          occurredAt: task.updatedAt,
          source: 'planningService',
        })),
        ...deviationEvents.slice(0, 6).map((event) => ({
          kind: 'OP_EVENT' as const,
          refId: event.id,
          occurredAt: event.createdAt,
          source: 'operationService',
        })),
      ],
      confidenceBand: confidenceBandFromScore(
        blockedOrDeferredTasks.length + deviationEvents.length > 0 ? 0.73 : 0.35
      ),
      ttlState: 'N_A',
    }),
    createEvidence('claim-intel-delta', {
      claim: intelChanges.length
        ? `Intel change log contains ${intelChanges.length} promoted/retired items.`
        : 'Intel delta is unknown for this operation scope.',
      citations: intelChanges.slice(0, 6).map((intel) => ({
        kind: 'INTEL' as const,
        refId: intel.id,
        occurredAt: intel.updatedAt,
        source: 'intelService',
      })),
      confidenceBand: confidenceBandFromScore(intelChanges.length ? 0.74 : 0.3),
      ttlState: 'N_A',
    }),
    createEvidence('claim-rescue-outcomes', {
      claim: rescueOrRecoveryEvents.length
        ? `Rescue/recovery stream recorded ${rescueOrRecoveryEvents.length} events.`
        : 'Rescue/recovery outcomes are unknown: no explicit rescue markers found.',
      citations: rescueOrRecoveryEvents.slice(0, 6).map((event) => ({
        kind: 'OP_EVENT' as const,
        refId: event.id,
        occurredAt: event.createdAt,
        source: 'operationService',
      })),
      confidenceBand: confidenceBandFromScore(rescueOrRecoveryEvents.length > 0 ? 0.79 : 0.28),
      ttlState: 'N_A',
    }),
    createEvidence('claim-force-posture', {
      claim: `Force analysis reports ${force.gaps.length} gaps with ${force.confidenceSummary.band} confidence.`,
      citations: [
        ...entries.slice(0, 5).map((entry) => ({
          kind: 'RSVP' as const,
          refId: entry.id,
          occurredAt: entry.updatedAt,
          source: 'rsvpService',
        })),
        ...slots
          .filter((slot) => Boolean(slot.fitProfileId))
          .slice(0, 5)
          .map((slot) => ({
            kind: 'FIT_PROFILE' as const,
            refId: String(slot.fitProfileId),
            occurredAt: slot.updatedAt,
            source: 'fitProfileService',
          })),
      ],
      confidenceBand: force.confidenceSummary.band,
      ttlState: 'N_A',
      notes: force.gaps.length ? force.gaps[0].message : 'No major gaps detected in current snapshot.',
    }),
  ];

  refs.push(
    ...objectives.map((objective) => ({ kind: 'objective', id: objective.id })),
    ...tasks.map((task) => ({ kind: 'task', id: task.id })),
    ...assumptions.map((assumption) => ({ kind: 'assumption', id: assumption.id })),
    ...decisions.map((decision) => ({ kind: 'decision', id: decision.id })),
    ...events.map((event) => ({ kind: 'op_event', id: event.id })),
    ...intelChanges.map((intel) => ({ kind: 'intel', id: intel.id })),
    ...entries.map((entry) => ({ kind: 'rsvp', id: entry.id })),
    ...slots.map((slot) => ({ kind: 'asset_slot', id: slot.id }))
  );

  return {
    kind: 'AAR',
    scope: { kind: 'OP', opId: operation.id },
    title: `After Action Report - ${operation.name}`,
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
    warnings: dedupeWarnings(warnings),
    permissions: {
      viewScope: 'OP',
      editableBy: [params.generatedBy, operation.createdBy].filter(Boolean),
    },
  };
}
