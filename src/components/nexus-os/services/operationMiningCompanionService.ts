import type {
  Operation,
  OperationReadinessGate,
  OperationMiningEconomics,
  OperationMiningScenarioConfig,
} from '../schemas/opSchemas';
import { getMiningVariantProfile } from '../registries/operationArchetypeRegistry';

const REGOLITH_APP_BASE_URL = 'https://app.regolith.rocks';

export interface OperationRegolithLink {
  label: string;
  url: string;
}

export interface OperationRegolithDraft {
  operationId: string;
  operationName: string;
  variantId: string;
  tier: OperationMiningScenarioConfig['tier'];
  environment: OperationMiningScenarioConfig['environment'];
  plannedStartAt?: string;
  plannedEndAt?: string;
  oreTargets: string[];
  routePlan: string;
  refineryPlan: string;
}

export interface MiningExecutionSnapshot {
  variantLabel: string;
  tier: OperationMiningScenarioConfig['tier'];
  environment: OperationMiningScenarioConfig['environment'];
  extractionMethod: OperationMiningScenarioConfig['extractionMethod'];
  oreTargetCount: number;
  requiredReady: number;
  requiredTotal: number;
  grossAuec: number;
  netAuec: number;
  regolithStatus: 'DISABLED' | 'PENDING_LINK' | 'LINKED';
  telemetry: OperationMiningScenarioConfig['telemetryProjection'];
  warnings: string[];
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function normalizeEconomics(economics: OperationMiningEconomics): OperationMiningEconomics {
  return {
    estimatedYieldScu: toFiniteNumber(economics.estimatedYieldScu),
    estimatedUnitValueAuec: toFiniteNumber(economics.estimatedUnitValueAuec),
    estimatedFuelCostAuec: toFiniteNumber(economics.estimatedFuelCostAuec),
    estimatedRiskReserveAuec: toFiniteNumber(economics.estimatedRiskReserveAuec),
    evidenceRefs: economics.evidenceRefs || [],
  };
}

export function isMiningOperation(operation: Operation): boolean {
  if (!operation) return false;
  if (operation.archetypeId === 'INDUSTRIAL_MINING') return true;
  return Boolean(operation.scenarioConfig?.mining);
}

export function summarizeMiningEconomics(economics: OperationMiningEconomics): {
  grossAuec: number;
  netAuec: number;
} {
  const normalized = normalizeEconomics(economics);
  const grossAuec = normalized.estimatedYieldScu * normalized.estimatedUnitValueAuec;
  const netAuec = grossAuec - normalized.estimatedFuelCostAuec - normalized.estimatedRiskReserveAuec;
  return { grossAuec, netAuec };
}

export function buildRegolithLinks(operation: Operation): OperationRegolithLink[] {
  const mining = operation.scenarioConfig?.mining;
  if (!mining?.regolithLink?.enabled) return [];
  const links: OperationRegolithLink[] = [];
  const sessionId = String(mining.regolithLink.sessionId || '').trim();
  if (sessionId) {
    links.push({ label: 'Regolith Session', url: `${REGOLITH_APP_BASE_URL}/sessions/${encodeURIComponent(sessionId)}` });
  }
  const workOrderId = String(mining.regolithLink.workOrderId || '').trim();
  if (workOrderId) {
    links.push({ label: 'Regolith Work Order', url: `${REGOLITH_APP_BASE_URL}/work-orders/${encodeURIComponent(workOrderId)}` });
  }
  return links;
}

export function buildRegolithDraft(operation: Operation): OperationRegolithDraft | null {
  const mining = operation.scenarioConfig?.mining;
  if (!mining) return null;
  return {
    operationId: operation.id,
    operationName: operation.name,
    variantId: mining.variantId,
    tier: mining.tier,
    environment: mining.environment,
    plannedStartAt: operation.schedule?.plannedStartAt,
    plannedEndAt: operation.schedule?.plannedEndAt,
    oreTargets: mining.oreTargets || [],
    routePlan: mining.routePlan,
    refineryPlan: mining.refineryPlan,
  };
}

export function deriveMiningExecutionSnapshot(
  operation: Operation,
  readinessGates: OperationReadinessGate[]
): MiningExecutionSnapshot | null {
  const mining = operation.scenarioConfig?.mining;
  if (!mining) return null;
  const variant = getMiningVariantProfile(mining.variantId);
  const requiredTotal = readinessGates.filter((gate) => gate.required).length;
  const requiredReady = readinessGates.filter((gate) => gate.required && gate.status === 'READY').length;
  const economics = summarizeMiningEconomics(mining.economics);
  const regolithStatus: MiningExecutionSnapshot['regolithStatus'] =
    mining.regolithLink.enabled
      ? mining.regolithLink.sessionId || mining.regolithLink.workOrderId
        ? 'LINKED'
        : 'PENDING_LINK'
      : 'DISABLED';

  const warnings: string[] = [];
  if (requiredTotal > requiredReady) {
    warnings.push('Required readiness gates are not fully READY.');
  }
  if (toFiniteNumber(mining.telemetryProjection.overchargeIncidents) > 0) {
    warnings.push('Overcharge incidents projected; tighten fracture discipline.');
  }
  if (toFiniteNumber(mining.telemetryProjection.idleHaulMinutes) >= 20) {
    warnings.push('Hauler idle projection is high; adjust haul rotation.');
  }

  return {
    variantLabel: variant.label,
    tier: mining.tier,
    environment: mining.environment,
    extractionMethod: mining.extractionMethod,
    oreTargetCount: (mining.oreTargets || []).length,
    requiredReady,
    requiredTotal,
    grossAuec: economics.grossAuec,
    netAuec: economics.netAuec,
    regolithStatus,
    telemetry: mining.telemetryProjection,
    warnings,
  };
}
