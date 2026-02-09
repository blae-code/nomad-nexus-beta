import { getDefaultReportTemplateIdForKind } from '../../registries/reportTemplateRegistry';
import { analyzeFitProfile, analyzeRoster } from '../forceDesignService';
import { getOperationById } from '../operationService';
import { nowIso } from '../reportFormatting';
import { createEvidence, createSection, dedupeWarnings } from './common';
import type { GeneratedReportPayload, ReportGenerationParams } from './types';

export function generateForcePosture(
  params: ReportGenerationParams,
  nowMs = Date.now()
): GeneratedReportPayload {
  const templateId = getDefaultReportTemplateIdForKind('FORCE_POSTURE');
  const opId = params.opId || params.scope.opId || '';
  const fitProfileId = params.fitProfileId || '';
  const operation = opId ? getOperationById(opId) : null;
  const analysis = opId
    ? analyzeRoster(opId, nowMs)
    : fitProfileId
    ? analyzeFitProfile(fitProfileId, nowMs)
    : null;
  const warnings = ['Force Posture report is scaffolded. Expand with scenario deltas in later package.'];
  if (!analysis) warnings.push('No opId or fitProfileId was provided.');

  return {
    kind: 'FORCE_POSTURE',
    scope: operation ? { kind: 'OP', opId: operation.id } : params.scope,
    title: operation ? `Force Posture - ${operation.name}` : 'Force Posture',
    generatedAt: nowIso(nowMs),
    generatedBy: params.generatedBy || 'system',
    templateId,
    narrative: [
      createSection(
        'coverage-posture',
        'Coverage Posture',
        analysis
          ? `Coverage rows: ${analysis.coverageMatrix.rows.length}. Gaps: ${analysis.gaps.length}. Confidence ${analysis.confidenceSummary.band}.`
          : 'Force analysis unavailable due to missing context.',
        0
      ),
    ],
    evidence: [
      createEvidence('claim-force-analysis', {
        claim: analysis
          ? `Force analysis generated with ${analysis.coverageMatrix.columns.length} elements.`
          : 'Force analysis could not be generated.',
        citations: analysis
          ? [
              {
                kind: 'FIT_PROFILE',
                refId: analysis.fitProfileId || analysis.opId || 'unknown',
                occurredAt: analysis.generatedAt,
                source: analysis.fitProfileId ? 'fitProfileService' : 'rsvpService',
              },
            ]
          : [],
        confidenceBand: analysis ? analysis.confidenceSummary.band : 'LOW',
        ttlState: 'N_A',
      }),
    ],
    inputs: {
      refs: [
        ...(operation ? [{ kind: 'operation', id: operation.id }] : []),
        ...(fitProfileId ? [{ kind: 'fit_profile', id: fitProfileId }] : []),
      ],
      gameVersionContext: params.gameVersionContext,
      dataSources: [{ source: 'forceDesignService' }],
    },
    warnings: dedupeWarnings(warnings),
    permissions: {
      viewScope: operation ? 'OP' : params.scope.kind,
      editableBy: [params.generatedBy],
    },
  };
}

