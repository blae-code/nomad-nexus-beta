import type { Operation, OperationReadinessGate, OperationSalvageEconomics } from '../schemas/opSchemas';
import { getSalvageVariantProfile } from '../registries/operationArchetypeRegistry';

export interface SalvageExecutionSnapshot {
  variantLabel: string;
  mode: string;
  environment: string;
  extractionMethod: string;
  objectiveType: string;
  claimJurisdiction: string;
  requiredReady: number;
  requiredTotal: number;
  projectedGrossAuec: number;
  projectedNetAuec: number;
  projectedRmcScu: number;
  projectedCmScu: number;
  projectedCargoScu: number;
  hullRecoveredPct: number;
  componentsRecovered: number;
  cargoRecoveredScu: number;
  cycleTimeMinutes: number;
  contaminationIncidents: number;
  companionRefs: string[];
  warnings: string[];
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export function isSalvageOperation(operation: Operation): boolean {
  if (!operation) return false;
  if (operation.archetypeId === 'INDUSTRIAL_SALVAGE') return true;
  return Boolean(operation.scenarioConfig?.salvage);
}

export function summarizeSalvageEconomics(economics: OperationSalvageEconomics): {
  projectedGrossAuec: number;
  projectedNetAuec: number;
} {
  const projectedGrossAuec = toNumber(economics.projectedGrossAuec);
  const projectedNetAuec =
    projectedGrossAuec
    - toNumber(economics.projectedFuelCostAuec)
    - toNumber(economics.projectedProcessingCostAuec)
    - toNumber(economics.projectedRiskReserveAuec);
  return { projectedGrossAuec, projectedNetAuec };
}

export function deriveSalvageExecutionSnapshot(
  operation: Operation,
  readinessGates: OperationReadinessGate[]
): SalvageExecutionSnapshot | null {
  const salvage = operation.scenarioConfig?.salvage;
  if (!salvage) return null;

  const variant = getSalvageVariantProfile(salvage.variantId);
  const requiredTotal = readinessGates.filter((gate) => gate.required).length;
  const requiredReady = readinessGates.filter((gate) => gate.required && gate.status === 'READY').length;
  const economics = summarizeSalvageEconomics(salvage.economics);

  const warnings: string[] = [];
  if (requiredTotal > requiredReady) {
    warnings.push('Required readiness gates are not fully READY.');
  }
  if (toNumber(salvage.telemetryProjection.contaminationIncidents) > 0) {
    warnings.push('Contamination incidents projected; adjust strip and cargo protocol.');
  }
  if (toNumber(salvage.telemetryProjection.cycleTimeMinutes) > 20) {
    warnings.push('Salvage cycle time is high; optimize extraction sequencing.');
  }
  if (salvage.riskProfile.threatBand === 'HIGH' && !String(salvage.escortPolicy || '').trim()) {
    warnings.push('High-threat salvage scenario requires explicit escort policy.');
  }
  if (salvage.riskProfile.legalExposure === 'HIGH' && !String(salvage.claimJurisdiction || '').trim()) {
    warnings.push('High legal exposure requires claim jurisdiction to be defined.');
  }

  return {
    variantLabel: variant.label,
    mode: salvage.mode,
    environment: salvage.environment,
    extractionMethod: salvage.extractionMethod,
    objectiveType: salvage.objectiveType,
    claimJurisdiction: salvage.claimJurisdiction,
    requiredReady,
    requiredTotal,
    projectedGrossAuec: economics.projectedGrossAuec,
    projectedNetAuec: economics.projectedNetAuec,
    projectedRmcScu: toNumber(salvage.economics.projectedRmcScu),
    projectedCmScu: toNumber(salvage.economics.projectedCmScu),
    projectedCargoScu: toNumber(salvage.economics.projectedCargoScu),
    hullRecoveredPct: toNumber(salvage.telemetryProjection.hullRecoveredPct),
    componentsRecovered: toNumber(salvage.telemetryProjection.componentsRecovered),
    cargoRecoveredScu: toNumber(salvage.telemetryProjection.cargoRecoveredScu),
    cycleTimeMinutes: toNumber(salvage.telemetryProjection.cycleTimeMinutes),
    contaminationIncidents: toNumber(salvage.telemetryProjection.contaminationIncidents),
    companionRefs: salvage.companionLink.enabled ? salvage.companionLink.externalRefs : [],
    warnings,
  };
}
