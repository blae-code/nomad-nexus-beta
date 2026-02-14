import type { MapCommsOverlay } from './mapCommsOverlayService';
import type { MapInferenceSnapshot } from './mapInferenceService';

export type TacticalMacroId =
  | 'ISSUE_CRITICAL_CALLOUT'
  | 'PRIORITY_OVERRIDE'
  | 'LOCK_COMMAND_DISCIPLINE'
  | 'ENABLE_SECURE_NET'
  | 'REQUEST_SITREP_BURST';

export interface MapCommandAlert {
  id: string;
  level: 'LOW' | 'MED' | 'HIGH';
  title: string;
  detail: string;
  source: 'inference' | 'comms' | 'intel' | 'control';
}

export interface MapMacroRecommendation {
  macroId: TacticalMacroId;
  priority: 'NOW' | 'NEXT' | 'WATCH';
  rationale: string;
}

export interface MapCommandSurfaceSnapshot {
  generatedAt: string;
  alerts: MapCommandAlert[];
  recommendedMacros: MapMacroRecommendation[];
  disciplineMode: string;
  pendingSpeakRequestCount: number;
  degradedNetCount: number;
}

interface BuildMapCommandSurfaceInput {
  mapInference: MapInferenceSnapshot;
  commsOverlay: Pick<MapCommsOverlay, 'nets' | 'callouts' | 'discipline' | 'speakRequests' | 'commandBus'>;
  nowMs?: number;
}

function pushAlert(
  alerts: MapCommandAlert[],
  alert: MapCommandAlert,
  max = 10
) {
  if (alerts.length >= max) return;
  alerts.push(alert);
}

export function buildMapCommandSurface(input: BuildMapCommandSurfaceInput): MapCommandSurfaceSnapshot {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const alerts: MapCommandAlert[] = [];
  const degradedNetCount = input.commsOverlay.nets.filter((net) => net.quality !== 'CLEAR').length;
  const pendingSpeakRequests = input.commsOverlay.speakRequests.filter((entry) => entry.status === 'PENDING');
  const criticalCallouts = input.commsOverlay.callouts.filter((entry) => entry.priority === 'CRITICAL' && !entry.stale);

  if (criticalCallouts.length > 0) {
    pushAlert(alerts, {
      id: 'critical-callouts',
      level: 'HIGH',
      title: 'Critical callouts active',
      detail: `${criticalCallouts.length} critical callouts require immediate command-lane response.`,
      source: 'comms',
    });
  }
  if (degradedNetCount > 0) {
    pushAlert(alerts, {
      id: 'degraded-nets',
      level: degradedNetCount > 1 ? 'HIGH' : 'MED',
      title: 'Degraded comms lanes',
      detail: `${degradedNetCount} nets are degraded or contested.`,
      source: 'comms',
    });
  }
  if (input.mapInference.contestedZoneCount > 0) {
    pushAlert(alerts, {
      id: 'contested-zones',
      level: input.mapInference.contestedZoneCount >= 2 ? 'HIGH' : 'MED',
      title: 'Contested control zones',
      detail: `${input.mapInference.contestedZoneCount} zones need recon refresh before route commitment.`,
      source: 'control',
    });
  }
  if (input.mapInference.staleIntelCount > 0) {
    pushAlert(alerts, {
      id: 'stale-intel',
      level: 'MED',
      title: 'Stale intel present',
      detail: `${input.mapInference.staleIntelCount} stale records should be treated as advisory only.`,
      source: 'intel',
    });
  }
  if (pendingSpeakRequests.length > 0) {
    pushAlert(alerts, {
      id: 'pending-speak-requests',
      level: pendingSpeakRequests.length > 2 ? 'MED' : 'LOW',
      title: 'Pending speak requests',
      detail: `${pendingSpeakRequests.length} members are waiting for transmit authorization.`,
      source: 'comms',
    });
  }

  const recommendedMacros: MapMacroRecommendation[] = [];
  if (criticalCallouts.length > 0) {
    recommendedMacros.push({
      macroId: 'ISSUE_CRITICAL_CALLOUT',
      priority: 'NOW',
      rationale: 'Critical callouts are already active and need explicit command synchronization.',
    });
  }
  if (degradedNetCount > 0) {
    recommendedMacros.push({
      macroId: 'PRIORITY_OVERRIDE',
      priority: 'NOW',
      rationale: 'Degraded nets benefit from temporary command traffic prioritization.',
    });
    recommendedMacros.push({
      macroId: 'LOCK_COMMAND_DISCIPLINE',
      priority: 'NEXT',
      rationale: 'Restricting comms discipline reduces overlap while network quality recovers.',
    });
  }
  if (input.mapInference.projectedLoadBand === 'HIGH') {
    recommendedMacros.push({
      macroId: 'REQUEST_SITREP_BURST',
      priority: 'NEXT',
      rationale: 'High projected load needs synchronized SITREP collection across lanes.',
    });
  }
  recommendedMacros.push({
    macroId: 'ENABLE_SECURE_NET',
    priority: degradedNetCount > 0 ? 'NEXT' : 'WATCH',
    rationale: 'Secure mode can harden command lane transport for sensitive coordination.',
  });

  const dedupedMacros = recommendedMacros.filter((entry, index, array) =>
    array.findIndex((candidate) => candidate.macroId === entry.macroId) === index
  );

  return {
    generatedAt: new Date(nowMs).toISOString(),
    alerts,
    recommendedMacros: dedupedMacros,
    disciplineMode: input.commsOverlay.discipline?.mode || 'PTT',
    pendingSpeakRequestCount: pendingSpeakRequests.length,
    degradedNetCount,
  };
}
