import type { ControlZone } from '../schemas/mapSchemas';
import type { Operation } from '../schemas/opSchemas';
import type { IntelRenderable } from './intelService';
import type { MapCommsOverlay } from './mapCommsOverlayService';

export interface MapInferenceInput {
  controlZones: ControlZone[];
  commsOverlay: MapCommsOverlay;
  intelObjects: IntelRenderable[];
  operations: Operation[];
  focusOperationId?: string;
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
  evidence: {
    zoneSignals: number;
    commsSignals: number;
    intelSignals: number;
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

function formatCalloutHint(input: MapInferenceInput): string | null {
  const highest = [...input.commsOverlay.callouts]
    .filter((entry) => !entry.stale)
    .sort((a, b) => {
      const rank = { CRITICAL: 3, HIGH: 2, STANDARD: 1 };
      return rank[b.priority] - rank[a.priority];
    })[0];
  if (!highest) return null;
  const lane = highest.lane || highest.netId || 'UNKNOWN';
  return `Prioritize ${highest.priority} comms lane ${lane} and rebalance monitoring coverage.`;
}

export function computeMapInference(input: MapInferenceInput): MapInferenceSnapshot {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const contestedZoneCount = input.controlZones.filter((zone) => zone.contestationLevel >= 0.45).length;
  const staleIntelCount = input.intelObjects.filter((intel) => intel.ttl.stale).length;
  const degradedNetCount = input.commsOverlay.nets.filter((net) => net.quality !== 'CLEAR').length;
  const criticalCalloutCount = input.commsOverlay.callouts.filter((entry) => !entry.stale && entry.priority === 'CRITICAL').length;
  const highCallouts = input.commsOverlay.callouts.filter((entry) => !entry.stale && entry.priority === 'HIGH').length;
  const projectedLoadScore = input.commsOverlay.nets.reduce((acc, net) => acc + net.trafficScore, 0);
  const zoneSignalCount = input.controlZones.reduce((acc, zone) => acc + zone.signals.length, 0);
  const commsSignalCount = input.commsOverlay.nets.length + input.commsOverlay.links.length + input.commsOverlay.callouts.length;
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
  const calloutHint = formatCalloutHint(input);
  if (calloutHint) recommendations.push(calloutHint);
  if (recommendations.length === 0) {
    recommendations.push('Maintain current command cadence and continue periodic intel/comms validation sweeps.');
  }

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
    evidence: {
      zoneSignals: zoneSignalCount,
      commsSignals: commsSignalCount,
      intelSignals: intelSignalCount,
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
    `Evidence counts - zone: ${input.evidence.zoneSignals}, comms: ${input.evidence.commsSignals}, intel: ${input.evidence.intelSignals}`,
    `Recommended actions: ${input.recommendations.join(' | ')}`,
  ].join('\n');
}

