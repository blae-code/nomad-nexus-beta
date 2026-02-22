import type { ControlZone } from '../schemas/mapSchemas';
import type { Operation } from '../schemas/opSchemas';
import type { IntelRenderable } from './intelService';
import type { MapCommsOverlay } from './mapCommsOverlayService';
import { DEFAULT_ACQUISITION_MODE, isSourceAllowed, requiresConfirmation, type AcquisitionMode } from './dataAcquisitionPolicyService';

export interface MapInferenceInput {
  controlZones: ControlZone[];
  commsOverlay: MapCommsOverlay;
  intelObjects: IntelRenderable[];
  operations: Operation[];
  focusOperationId?: string;
  acquisitionMode?: AcquisitionMode;
  strictCompliance?: boolean;
  nowMs?: number;
}

export interface MapInferenceSnapshot {
  generatedAt: string;
  focusOperationId: string;
  commandRiskScore: number;
  confidenceScore: number;
  contestedZoneCount: number;
  degradedNetCount: number;
  staleIntelCount: number;
  criticalCalloutCount: number;
  projectedLoadBand: 'LOW' | 'MED' | 'HIGH';
  recommendations: string[];
  factors: Array<{
    id: 'zones' | 'comms' | 'intel' | 'tempo';
    score: number;
    weight: number;
    rationale: string;
    evidenceRefs: string[];
  }>;
  prioritizedActions: Array<{
    id: string;
    priority: 'NOW' | 'NEXT' | 'WATCH';
    title: string;
    rationale: string;
    expectedImpact: string;
  }>;
  evidence: {
    zoneSignals: number;
    commsSignals: number;
    intelSignals: number;
  };
  complianceDiagnostics: {
    mode: AcquisitionMode;
    strictCompliance: boolean;
    totalCallouts: number;
    includedCallouts: number;
    droppedCallouts: number;
    missingMetadataCallouts: number;
    untrustedCallouts: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function projectedLoadBand(score: number): MapInferenceSnapshot['projectedLoadBand'] {
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MED';
  return 'LOW';
}

function formatCalloutHint(callouts: MapCommsOverlay['callouts']): string | null {
  const highest = [...callouts]
    .filter((entry) => !entry.stale)
    .sort((a, b) => {
      const rank = { CRITICAL: 3, HIGH: 2, STANDARD: 1 };
      return rank[b.priority] - rank[a.priority];
    })[0];
  if (!highest) return null;
  const lane = highest.lane || highest.netId || 'UNKNOWN';
  return `Prioritize ${highest.priority} comms lane ${lane} and rebalance monitoring coverage.`;
}

function isTrustedCalloutForInference(
  callout: MapCommsOverlay['callouts'][number],
  mode: AcquisitionMode,
  strictCompliance: boolean
): boolean {
  if (!strictCompliance) return true;
  if (!callout.evidenceSource) return false;
  if (!isSourceAllowed(mode, callout.evidenceSource)) return false;
  if (requiresConfirmation(mode, callout.evidenceSource) && !callout.confirmed) return false;
  return true;
}

function buildFactors(input: {
  contestedZoneCount: number;
  degradedNetCount: number;
  staleIntelCount: number;
  criticalCalloutCount: number;
  highCallouts: number;
  zoneSignalCount: number;
  commsSignalCount: number;
  intelSignalCount: number;
  projectedLoadScore: number;
}) {
  const zoneFactorScore = clamp(Math.round(input.contestedZoneCount * 28 + Math.min(input.zoneSignalCount, 12) * 2), 0, 100);
  const commsFactorScore = clamp(Math.round(input.degradedNetCount * 24 + input.criticalCalloutCount * 18 + input.highCallouts * 8), 0, 100);
  const intelFactorScore = clamp(Math.round(input.staleIntelCount * 22 + Math.min(input.intelSignalCount, 8) * 2), 0, 100);
  const tempoFactorScore = clamp(Math.round(Math.min(input.projectedLoadScore, 40) * 2.2), 0, 100);
  return [
    {
      id: 'zones' as const,
      score: zoneFactorScore,
      weight: 0.3,
      rationale: input.contestedZoneCount > 0
        ? `${input.contestedZoneCount} contested zones are currently affecting control confidence.`
        : 'No contested control zones detected in scoped records.',
      evidenceRefs: [`zone-signals:${input.zoneSignalCount}`],
    },
    {
      id: 'comms' as const,
      score: commsFactorScore,
      weight: 0.32,
      rationale: input.degradedNetCount > 0 || input.criticalCalloutCount > 0
        ? `Comms pressure is elevated with ${input.degradedNetCount} degraded nets and ${input.criticalCalloutCount} critical callouts.`
        : 'Comms network quality is nominal for scoped lanes.',
      evidenceRefs: [`comms-signals:${input.commsSignalCount}`],
    },
    {
      id: 'intel' as const,
      score: intelFactorScore,
      weight: 0.18,
      rationale: input.staleIntelCount > 0
        ? `${input.staleIntelCount} stale intel records reduce confidence in current assumptions.`
        : 'Intel freshness is within expected bounds.',
      evidenceRefs: [`intel-signals:${input.intelSignalCount}`],
    },
    {
      id: 'tempo' as const,
      score: tempoFactorScore,
      weight: 0.2,
      rationale: projectedLoadBand(input.projectedLoadScore) === 'HIGH'
        ? 'Projected comms load is high and likely to reduce command bandwidth.'
        : projectedLoadBand(input.projectedLoadScore) === 'MED'
          ? 'Projected comms load is moderate and should be monitored.'
          : 'Projected command tempo remains manageable.',
      evidenceRefs: [`load-score:${Math.round(input.projectedLoadScore)}`],
    },
  ];
}

function buildPrioritizedActions(input: {
  contestedZoneCount: number;
  degradedNetCount: number;
  staleIntelCount: number;
  criticalCalloutCount: number;
  projectedLoadScore: number;
  recommendations: string[];
}) {
  const actions: MapInferenceSnapshot['prioritizedActions'] = [];
  if (input.criticalCalloutCount > 0) {
    actions.push({
      id: 'stabilize-speaking-lane',
      priority: 'NOW',
      title: 'Stabilize speaking authority',
      rationale: 'Critical callouts are active and require command-lane discipline.',
      expectedImpact: 'Reduces overlap and speeds command acknowledgement.',
    });
  }
  if (input.degradedNetCount > 0) {
    actions.push({
      id: 'rebalance-bridges',
      priority: 'NOW',
      title: 'Rebalance degraded nets',
      rationale: 'At least one net is degraded/contested and needs rerouting.',
      expectedImpact: 'Improves relay clarity and lowers missed transmissions.',
    });
  }
  if (input.contestedZoneCount > 0) {
    actions.push({
      id: 'refresh-zone-recon',
      priority: 'NEXT',
      title: 'Refresh contested zone recon',
      rationale: 'Control claims are contested and need updated evidence.',
      expectedImpact: 'Increases confidence before movement commitments.',
    });
  }
  if (input.staleIntelCount > 0) {
    actions.push({
      id: 'revalidate-stale-intel',
      priority: 'NEXT',
      title: 'Revalidate stale intel',
      rationale: 'Stale intel should not drive primary tasking decisions.',
      expectedImpact: 'Reduces probability of acting on expired assumptions.',
    });
  }
  if (projectedLoadBand(input.projectedLoadScore) !== 'LOW') {
    actions.push({
      id: 'prestage-command-overflow',
      priority: 'WATCH',
      title: 'Pre-stage overflow coordination',
      rationale: 'Projected comms load may exceed current command capacity.',
      expectedImpact: 'Protects command tempo during spike windows.',
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 'maintain-cadence',
      priority: 'WATCH',
      title: 'Maintain current cadence',
      rationale: input.recommendations[0] || 'No immediate escalations detected.',
      expectedImpact: 'Keeps operations steady while continuing periodic validation.',
    });
  }
  return actions.slice(0, 5);
}

export function computeMapInference(input: MapInferenceInput): MapInferenceSnapshot {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const acquisitionMode = input.acquisitionMode || DEFAULT_ACQUISITION_MODE;
  const strictCompliance = typeof input.strictCompliance === 'boolean' ? input.strictCompliance : acquisitionMode === 'MANUAL_ONLY';
  const totalCallouts = input.commsOverlay.callouts.length;
  const missingMetadataCallouts = input.commsOverlay.callouts.filter((entry) => !entry.evidenceSource).length;
  const trustedCallouts = input.commsOverlay.callouts.filter((entry) =>
    isTrustedCalloutForInference(entry, acquisitionMode, strictCompliance)
  );
  const untrustedCallouts = input.commsOverlay.callouts.filter(
    (entry) => entry.evidenceSource && !isTrustedCalloutForInference(entry, acquisitionMode, strictCompliance)
  ).length;
  const droppedCallouts = Math.max(0, totalCallouts - trustedCallouts.length);
  const contestedZoneCount = input.controlZones.filter((zone) => zone.contestationLevel >= 0.45).length;
  const staleIntelCount = input.intelObjects.filter((intel) => intel.ttl.stale).length;
  const degradedNetCount = input.commsOverlay.nets.filter((net) => net.quality !== 'CLEAR').length;
  const criticalCalloutCount = trustedCallouts.filter((entry) => !entry.stale && entry.priority === 'CRITICAL').length;
  const highCallouts = trustedCallouts.filter((entry) => !entry.stale && entry.priority === 'HIGH').length;
  const projectedLoadScore = input.commsOverlay.nets.reduce((acc, net) => acc + net.trafficScore, 0);
  const zoneSignalCount = input.controlZones.reduce((acc, zone) => acc + zone.signals.length, 0);
  const commsSignalCount = input.commsOverlay.nets.length + input.commsOverlay.links.length + trustedCallouts.length;
  const intelSignalCount = input.intelObjects.length;
  const evidenceTotal = zoneSignalCount + commsSignalCount + intelSignalCount;

  const commandRiskScore = clamp(
    contestedZoneCount * 18 +
    degradedNetCount * 14 +
    criticalCalloutCount * 22 +
    highCallouts * 8 +
    Math.min(staleIntelCount * 6, 22),
    0,
    100
  );

  const confidenceScore = clamp(
    Math.round((Math.min(evidenceTotal, 80) / 80) * 100) -
      staleIntelCount * 5 -
      Math.max(0, degradedNetCount - 1) * 4,
    8,
    96
  );

  const recommendations: string[] = [];
  if (criticalCalloutCount > 0) {
    recommendations.push('Escalate command posture and enforce single authoritative speaking lane.');
  }
  if (degradedNetCount > 0) {
    recommendations.push('Shift cross-net relay to hardened bridge pairs and throttle non-essential traffic.');
  }
  if (contestedZoneCount > 0) {
    recommendations.push('Queue immediate reconnaissance refresh for contested control zones before route commits.');
  }
  if (staleIntelCount > 0) {
    recommendations.push('Mark stale intel as advisory-only and require renewed confirmation before tasking.');
  }
  if (projectedLoadBand(projectedLoadScore) === 'HIGH') {
    recommendations.push('Pre-stage reserve command staff for overflow coordination and casualty response.');
  }
  const calloutHint = formatCalloutHint(trustedCallouts);
  if (calloutHint) recommendations.push(calloutHint);
  if (recommendations.length === 0) {
    recommendations.push('Maintain current command cadence and continue periodic intel/comms validation sweeps.');
  }
  const factors = buildFactors({
    contestedZoneCount,
    degradedNetCount,
    staleIntelCount,
    criticalCalloutCount,
    highCallouts,
    zoneSignalCount,
    commsSignalCount,
    intelSignalCount,
    projectedLoadScore,
  });
  const prioritizedActions = buildPrioritizedActions({
    contestedZoneCount,
    degradedNetCount,
    staleIntelCount,
    criticalCalloutCount,
    projectedLoadScore,
    recommendations,
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    focusOperationId: input.focusOperationId || '',
    commandRiskScore,
    confidenceScore,
    contestedZoneCount,
    degradedNetCount,
    staleIntelCount,
    criticalCalloutCount,
    projectedLoadBand: projectedLoadBand(projectedLoadScore),
    recommendations,
    factors,
    prioritizedActions,
    evidence: {
      zoneSignals: zoneSignalCount,
      commsSignals: commsSignalCount,
      intelSignals: intelSignalCount,
    },
    complianceDiagnostics: {
      mode: acquisitionMode,
      strictCompliance,
      totalCallouts,
      includedCallouts: trustedCallouts.length,
      droppedCallouts,
      missingMetadataCallouts,
      untrustedCallouts,
    },
  };
}

export function buildMapAiPrompt(input: MapInferenceSnapshot): string {
  return [
    'Provide a concise tactical command estimate using only provided records.',
    'Do not invent telemetry or external facts.',
    `Risk score: ${input.commandRiskScore}/100`,
    `Confidence score: ${input.confidenceScore}/100`,
    `Contested zones: ${input.contestedZoneCount}`,
    `Degraded nets: ${input.degradedNetCount}`,
    `Critical callouts: ${input.criticalCalloutCount}`,
    `Stale intel records: ${input.staleIntelCount}`,
    `Load band: ${input.projectedLoadBand}`,
    `Compliance: mode=${input.complianceDiagnostics.mode}, strict=${input.complianceDiagnostics.strictCompliance}, callouts included=${input.complianceDiagnostics.includedCallouts}/${input.complianceDiagnostics.totalCallouts}`,
    `Evidence counts - zone: ${input.evidence.zoneSignals}, comms: ${input.evidence.commsSignals}, intel: ${input.evidence.intelSignals}`,
    `Prioritized actions: ${input.prioritizedActions.map((action) => `${action.priority}:${action.title}`).join(' | ')}`,
    `Recommended actions: ${input.recommendations.join(' | ')}`,
  ].join('\n');
}

