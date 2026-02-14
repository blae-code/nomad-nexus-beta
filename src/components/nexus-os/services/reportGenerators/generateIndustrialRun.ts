import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import { computePriceSummaries, listRouteHypotheses } from '../marketIntelService';
import { getOperationById } from '../operationService';
import { nowIso } from '../reportFormatting';
import { createEvidence, createSection, dedupeWarnings } from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

export function generateIndustrialRun(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  const templateId = getDefaultReportTemplateIdForKind('INDUSTRIAL_RUN');
  const opId = params.opId || params.scope.opId || '';
  const operation = opId ? getOperationById(opId) : null;
  const summaries = computePriceSummaries(nowMs).slice(0, 10);
  const routes = listRouteHypotheses().slice(0, 8);
  const warnings = [
    'Industrial Run Sheet is scaffolded. Expand with full cargo chain constraints and role handoffs later.',
  ];

  return {
    kind: 'INDUSTRIAL_RUN',
    scope: operation ? { kind: 'OP', opId: operation.id } : params.scope,
    title: operation ? `Industrial Run Sheet - ${operation.name}` : 'Industrial Run Sheet',
    generatedAt: nowIso(nowMs),
    generatedBy: params.generatedBy || 'system',
    templateId,
    narrative: [
      createSection(
        'industrial-lanes',
        'Industrial Lanes',
        `Observed price summaries: ${summaries.length}. Route hypotheses: ${routes.length}.`,
        0
      ),
    ],
    evidence: [
      createEvidence('claim-market-observations', {
        claim: `Run sheet references ${summaries.length} market summaries.`,
        citations: summaries.map((summary) => ({
          kind: 'MARKET_OBS',
          refId: `${summary.terminalId}:${summary.commodityId}`,
          reportedAt: summary.lastSeenAt,
          source: 'marketIntelService',
        })),
        confidenceBand: summaries.length ? 'MED' : 'LOW',
        ttlState: 'N_A',
      }),
    ],
    inputs: {
      refs: [
        ...(operation ? [{ kind: 'operation', id: operation.id }] : []),
        ...routes.map((route) => ({ kind: 'route_hypothesis', id: `${route.fromNodeId}->${route.toNodeId}` })),
      ],
      gameVersionContext: params.gameVersionContext,
      dataSources: [{ source: 'marketIntelService' }],
    },
    warnings: dedupeWarnings(warnings),
    permissions: {
      viewScope: operation ? 'OP' : params.scope.kind,
      editableBy: [params.generatedBy],
    },
  };
}

