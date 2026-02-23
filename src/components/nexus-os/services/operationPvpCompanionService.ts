import type { Operation, OperationReadinessGate } from '../schemas/opSchemas';
import { getPvpVariantProfile } from '../registries/operationArchetypeRegistry';
import type { OperationRoleView } from './operationAuthorityService';

export interface PvpExecutionSnapshot {
  variantLabel: string;
  environment: string;
  engagementProfile: string;
  objectiveType: string;
  commandIntent: string;
  opsecLevel: string;
  requiredReady: number;
  requiredTotal: number;
  friendlyPlanned: number;
  hostileEstimated: number;
  forceRatio: number;
  objectiveControlTargetPct: number;
  casualtyCap: number;
  currentCasualties: number;
  commsDisruptions: number;
  reactionLatencySec: number;
  opponentLabel: string;
  opponentStrength: string;
  intelConfidence: string;
  companionRefs: string[];
  redacted: boolean;
  warnings: string[];
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export function isPvpOperation(operation: Operation): boolean {
  if (!operation) return false;
  if (operation.archetypeId === 'PVP_ORG_V_ORG') return true;
  return Boolean(operation.scenarioConfig?.pvp);
}

export function derivePvpExecutionSnapshot(
  operation: Operation,
  readinessGates: OperationReadinessGate[],
  roleView: OperationRoleView
): PvpExecutionSnapshot | null {
  const pvp = operation.scenarioConfig?.pvp;
  if (!pvp) return null;

  const variant = getPvpVariantProfile(pvp.variantId);
  const requiredTotal = readinessGates.filter((gate) => gate.required).length;
  const requiredReady = readinessGates.filter((gate) => gate.required && gate.status === 'READY').length;
  const friendlyPlanned = Math.max(0, toNumber(pvp.forceProjection.friendlyPlanned));
  const hostileEstimated = Math.max(1, toNumber(pvp.forceProjection.hostileEstimated));
  const forceRatio = friendlyPlanned / hostileEstimated;
  const redacted = roleView !== 'COMMAND';

  const opponentLabel = redacted
    ? operation.securityProjection?.redactedOpponentLabel || `${pvp.opposingForce.orgName} (redacted)`
    : pvp.opposingForce.orgName;
  const opponentStrength = redacted
    ? operation.securityProjection?.redactedStrengthBand || 'UNKNOWN'
    : pvp.opposingForce.estimatedStrength;
  const commandIntent =
    roleView === 'PARTICIPANT'
      ? 'Command intent restricted; follow issued squad directives.'
      : pvp.commandIntent;

  const warnings: string[] = [];
  if (requiredTotal > requiredReady) {
    warnings.push('Required readiness gates are not fully READY.');
  }
  if (forceRatio < 0.85) {
    warnings.push('Friendly strength projection is below hostile estimate.');
  }
  if (toNumber(pvp.telemetryProjection.casualtyCap) > 0 && toNumber(pvp.telemetryProjection.currentCasualties) >= toNumber(pvp.telemetryProjection.casualtyCap)) {
    warnings.push('Casualty cap reached or exceeded.');
  }
  if (toNumber(pvp.telemetryProjection.commsDisruptions) > 3) {
    warnings.push('Comms disruption trend is above threshold.');
  }
  if (toNumber(pvp.telemetryProjection.reactionLatencySec) > 15) {
    warnings.push('Reaction latency exceeds command target.');
  }
  if (pvp.riskProfile.threatBand === 'HIGH' && pvp.opsecLevel === 'STANDARD') {
    warnings.push('High threat profile should not run with STANDARD opsec level.');
  }

  return {
    variantLabel: variant.label,
    environment: pvp.environment,
    engagementProfile: pvp.engagementProfile,
    objectiveType: pvp.objectiveType,
    commandIntent,
    opsecLevel: pvp.opsecLevel,
    requiredReady,
    requiredTotal,
    friendlyPlanned,
    hostileEstimated: toNumber(pvp.forceProjection.hostileEstimated),
    forceRatio,
    objectiveControlTargetPct: toNumber(pvp.telemetryProjection.objectiveControlTargetPct),
    casualtyCap: toNumber(pvp.telemetryProjection.casualtyCap),
    currentCasualties: toNumber(pvp.telemetryProjection.currentCasualties),
    commsDisruptions: toNumber(pvp.telemetryProjection.commsDisruptions),
    reactionLatencySec: toNumber(pvp.telemetryProjection.reactionLatencySec),
    opponentLabel,
    opponentStrength,
    intelConfidence: pvp.opposingForce.intelConfidence,
    companionRefs: pvp.companionLink.enabled ? pvp.companionLink.externalRefs : [],
    redacted,
    warnings,
  };
}
