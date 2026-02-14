import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import { listAllIntelObjectsForDev } from '../intelService';
import { nowIso } from '../reportFormatting';
import { createEvidence, createSection, dedupeWarnings } from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

export function generateIntelBrief(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  const templateId = getDefaultReportTemplateIdForKind('INTEL_BRIEF');
  const intel = listAllIntelObjectsForDev();
  const opId = params.opId || params.scope.opId || '';
  const scopedIntel = opId
    ? intel.filter((entry) => entry.scope.kind === 'OP' && (entry.scope.opIds || []).includes(opId))
    : intel;
  const warnings = [
    'Intel Brief generator is scaffolded. Add contradiction clustering and endorsement weighting later.',
  ];

  return {
    kind: 'INTEL_BRIEF',
    scope: params.scope,
    title: opId ? `Intel Brief - ${opId}` : 'Intel Brief - Scoped',
    generatedAt: nowIso(nowMs),
    generatedBy: params.generatedBy || 'system',
    templateId,
    narrative: [
      createSection(
        'intel-scope',
        'Intel Scope',
        scopedIntel.length
          ? `Scoped intel count: ${scopedIntel.length}. Contradictions remain preserved by doctrine.`
          : 'No scoped intel available at generation time.',
        0
      ),
    ],
    evidence: [
      createEvidence('claim-intel-snapshot', {
        claim: `Intel brief references ${scopedIntel.length} intel records.`,
        citations: scopedIntel.slice(0, 12).map((item) => ({
          kind: 'INTEL',
          refId: item.id,
          occurredAt: item.updatedAt,
          source: 'intelService',
        })),
        confidenceBand: scopedIntel.length ? 'MED' : 'LOW',
        ttlState: 'N_A',
      }),
    ],
    inputs: {
      refs: scopedIntel.map((item) => ({ kind: 'intel', id: item.id })),
      gameVersionContext: params.gameVersionContext,
      dataSources: [{ source: 'intelService' }],
    },
    warnings: dedupeWarnings(warnings),
    permissions: {
      viewScope: params.scope.kind,
      editableBy: [params.generatedBy],
    },
  };
}

