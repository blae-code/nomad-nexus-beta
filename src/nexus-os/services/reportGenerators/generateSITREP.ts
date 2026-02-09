import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import { getOperationById, listOperationEvents } from '../operationService';
import { nowIso } from '../reportFormatting';
import { createEvidence, createSection, dedupeWarnings } from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

export function generateSITREP(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  const templateId = getDefaultReportTemplateIdForKind('SITREP');
  const opId = params.opId || params.scope.opId || '';
  const operation = opId ? getOperationById(opId) : null;
  const events = opId ? listOperationEvents(opId).slice(0, 8) : [];
  const warnings = [
    'SITREP generator is scaffolded. Expand with richer CQB/intel/comms synthesis in later package.',
  ];

  return {
    kind: 'SITREP',
    scope: operation ? { kind: 'OP', opId: operation.id } : params.scope,
    title: operation ? `SITREP - ${operation.name}` : 'SITREP - Unknown Scope',
    generatedAt: nowIso(nowMs),
    generatedBy: params.generatedBy || 'system',
    templateId,
    narrative: [
      createSection(
        'status-snapshot',
        'Status Snapshot',
        operation
          ? `Operation ${operation.name} is ${operation.status}. Recent op events: ${events.length}.`
          : 'Operation scope unknown. SITREP cannot assert current status.',
        0
      ),
    ],
    evidence: [
      createEvidence('claim-sitrep-events', {
        claim: `SITREP includes ${events.length} recent operation events.`,
        citations: events.map((event) => ({
          kind: 'OP_EVENT',
          refId: event.id,
          occurredAt: event.createdAt,
          source: 'operationService',
        })),
        confidenceBand: operation ? 'MED' : 'LOW',
        ttlState: 'N_A',
      }),
    ],
    inputs: {
      refs: operation ? [{ kind: 'operation', id: operation.id }] : [],
      gameVersionContext: params.gameVersionContext,
      dataSources: [{ source: 'operationService' }],
    },
    warnings: dedupeWarnings(warnings),
    permissions: {
      viewScope: operation ? 'OP' : params.scope.kind,
      editableBy: [params.generatedBy],
    },
  };
}

