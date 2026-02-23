/**
 * Operation Service (MVP in-memory adapter)
 *
 * Supports multiple concurrent operations with user-specific focus selection.
 * Permission and policy checks are stubs designed for later auth integration.
 */

import type {
  Operation,
  OperationEventStub,
  OperationPosture,
  OperationStatus,
  OperationFocusRules,
  OperationDomains,
  OperationArchetypeId,
  OperationSchedule,
  OperationReadinessGate,
  OperationMiningScenarioConfig,
  OperationSalvageScenarioConfig,
  OperationPvpScenarioConfig,
  OperationScenarioConfig,
  OperationSecurityProjection,
  OperationReleaseTrack,
} from '../schemas/opSchemas';
import type { CommsTemplateId } from '../registries/commsTemplateRegistry';
import type { DataClassification } from '../schemas/crossOrgSchemas';
import { canControlLifecycle } from './operationAuthorityService';
import {
  enqueueWorkspaceStateSave,
  loadWorkspaceStateSnapshot,
  workspaceStateSyncEnabled,
} from './workspaceStateBridgeService';

export interface OperationCreateInput {
  name: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture?: OperationPosture;
  status?: OperationStatus;
  domains?: Partial<OperationDomains>;
  ao?: Operation['ao'];
  commsTemplateId?: CommsTemplateId;
  ttlProfileId?: string;
  permissions?: Operation['permissions'];
  archetypeId?: OperationArchetypeId;
  releaseTrack?: OperationReleaseTrack;
  schedule?: OperationSchedule;
  readinessGates?: OperationReadinessGate[];
  scenarioConfig?: OperationScenarioConfig;
  securityProjection?: OperationSecurityProjection;
  notificationMode?: Operation['notificationMode'];
  createdBy: string;
}

export interface OperationViewContext {
  userId?: string;
  orgId?: string;
  includeArchived?: boolean;
}

export interface OperationUpdateInput {
  name?: string;
  ao?: Operation['ao'];
  linkedIntelIds?: string[];
  invitedOrgIds?: string[];
  classification?: DataClassification;
  archetypeId?: OperationArchetypeId;
  releaseTrack?: OperationReleaseTrack;
  schedule?: OperationSchedule;
  readinessGates?: OperationReadinessGate[];
  scenarioConfig?: OperationScenarioConfig;
  securityProjection?: OperationSecurityProjection;
  notificationMode?: Operation['notificationMode'];
}

export interface OperationPermissionResult {
  allowed: boolean;
  reason: string;
}

export interface OperationTemplateBlueprint {
  name: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture: OperationPosture;
  status: OperationStatus;
  domains: OperationDomains;
  ao: Operation['ao'];
  commsTemplateId: CommsTemplateId;
  ttlProfileId: string;
  permissions?: Operation['permissions'];
  archetypeId?: OperationArchetypeId;
  releaseTrack?: OperationReleaseTrack;
  schedule?: OperationSchedule;
  readinessGates?: OperationReadinessGate[];
  scenarioConfig?: OperationScenarioConfig;
  securityProjection?: OperationSecurityProjection;
  notificationMode?: Operation['notificationMode'];
}

export interface OperationTemplate {
  id: string;
  name: string;
  description?: string;
  sourceOpId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  blueprint: OperationTemplateBlueprint;
}

export interface OperationTemplateCreateInput {
  createdBy: string;
  name: string;
  description?: string;
  blueprint: Partial<OperationTemplateBlueprint>;
}

export interface OperationTemplateInstantiateInput {
  createdBy: string;
  name?: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture?: OperationPosture;
  status?: OperationStatus;
  ao?: Operation['ao'];
  schedule?: OperationSchedule;
  readinessGates?: OperationReadinessGate[];
  scenarioConfig?: OperationScenarioConfig;
  securityProjection?: OperationSecurityProjection;
  notificationMode?: Operation['notificationMode'];
  archetypeId?: OperationArchetypeId;
  releaseTrack?: OperationReleaseTrack;
}

export interface OperationCloneInput {
  createdBy: string;
  name?: string;
}

export interface OperationAuditEvent {
  id: string;
  opId: string;
  action: string;
  actorId: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface OperationStatusUpdateOptions {
  overrideReason?: string;
  actorContext?: {
    rank?: string;
    roles?: string[];
    orgId?: string;
    isAdmin?: boolean;
  };
}

type OperationListener = (state: {
  operations: Operation[];
  focusByUser: Record<string, string>;
  events: OperationEventStub[];
}) => void;

interface OperationServiceSnapshot {
  operationsStore: Operation[];
  operationEventsStore: OperationEventStub[];
  operationTemplatesStore: OperationTemplate[];
  operationAuditStore: OperationAuditEvent[];
  focusByUser: Record<string, string>;
}

const OP_SERVICE_STORAGE_KEY = 'nexus.os.operationService.v1';
const OP_REMOTE_NAMESPACE = 'operation_service_snapshot';
const OP_REMOTE_SCOPE_KEY = 'default';

let operationsStore: Operation[] = [];
let operationEventsStore: OperationEventStub[] = [];
let operationTemplatesStore: OperationTemplate[] = [];
let operationAuditStore: OperationAuditEvent[] = [];
const focusByUser: Record<string, string> = {};
const listeners = new Set<OperationListener>();
let hasHydratedFromStorage = false;
let remoteHydrateRequested = false;

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createOperationId(nowMs = Date.now()): string {
  return `op_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOperationEventId(nowMs = Date.now()): string {
  return `op_evt_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTemplateId(nowMs = Date.now()): string {
  return `op_tpl_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createAuditId(nowMs = Date.now()): string {
  return `op_audit_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortOperations(records: Operation[]): Operation[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function sortOperationEvents(records: OperationEventStub[]): OperationEventStub[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function sortOperationTemplates(records: OperationTemplate[]): OperationTemplate[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function sortOperationAudit(records: OperationAuditEvent[]): OperationAuditEvent[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function createSnapshot(): OperationServiceSnapshot {
  return {
    operationsStore,
    operationEventsStore,
    operationTemplatesStore,
    operationAuditStore,
    focusByUser: { ...focusByUser },
  };
}

function parseTimestampMs(value: unknown): number {
  const parsed = Date.parse(String(value || ''));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function addHoursIso(baseIso: string, hours: number): string {
  const baseMs = parseTimestampMs(baseIso) || Date.now();
  return nowIso(baseMs + hours * 60 * 60 * 1000);
}

function normalizeSchedule(schedule: OperationSchedule | undefined, fallbackIso: string): OperationSchedule {
  const fallbackStart = parseTimestampMs(fallbackIso) ? fallbackIso : nowIso();
  const startAt =
    schedule && parseTimestampMs(schedule.plannedStartAt)
      ? new Date(schedule.plannedStartAt).toISOString()
      : fallbackStart;
  const endAtCandidate =
    schedule && parseTimestampMs(schedule.plannedEndAt)
      ? new Date(schedule.plannedEndAt).toISOString()
      : addHoursIso(startAt, 2);
  const endAt = parseTimestampMs(endAtCandidate) > parseTimestampMs(startAt)
    ? endAtCandidate
    : addHoursIso(startAt, 2);
  return {
    plannedStartAt: startAt,
    plannedEndAt: endAt,
    timezone: String(schedule?.timezone || 'UTC').trim() || 'UTC',
  };
}

function normalizeReadinessGateStatus(value: unknown): OperationReadinessGate['status'] {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'READY' || token === 'BLOCKED') return token;
  return 'PENDING';
}

function normalizeReadinessGates(
  gates: OperationReadinessGate[] | undefined,
  fallbackBy: string,
  fallbackAt: string
): OperationReadinessGate[] {
  if (!Array.isArray(gates)) return [];
  return gates
    .map((gate, index) => {
      const id = String(gate?.id || `gate_${index + 1}`).trim() || `gate_${index + 1}`;
      const label = String(gate?.label || `Gate ${index + 1}`).trim() || `Gate ${index + 1}`;
      return {
        id,
        label,
        ownerRole: String(gate?.ownerRole || 'Command').trim() || 'Command',
        required: Boolean(gate?.required),
        status: normalizeReadinessGateStatus(gate?.status),
        note: String(gate?.note || '').trim() || undefined,
        updatedAt: parseTimestampMs(gate?.updatedAt) ? new Date(gate.updatedAt).toISOString() : fallbackAt,
        updatedBy: String(gate?.updatedBy || fallbackBy).trim() || fallbackBy,
      } satisfies OperationReadinessGate;
    })
    .slice(0, 16);
}

const MINING_VARIANT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  MINING_GROUND: 'MINING_GEO',
  MINING_SURFACE_GROUND: 'MINING_GEO',
  MINING_ROC_GROUND: 'MINING_ROC_SURFACE',
  MINING_RING: 'MINING_PLANETARY_RING',
});

const SALVAGE_VARIANT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  SALVAGE_SURFACE_RECOVERY: 'SALVAGE_SURFACE_WRECK_RECOVERY',
  SALVAGE_SURFACE_COMPONENT_RECOVERY: 'SALVAGE_SURFACE_WRECK_RECOVERY',
  SALVAGE_BLACKBOX: 'SALVAGE_BLACKBOX_RETRIEVAL',
});

const PVP_VARIANT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  PVP_RAID: 'PVP_CQB_RAID',
  PVP_BOARDING: 'PVP_CQB_BOARDING',
  ORG_V_ORG_CONVOY: 'CONVOY_ESCORT',
});

const SALVAGE_METHOD_ALIASES: Readonly<Record<string, OperationSalvageScenarioConfig['extractionMethod']>> = Object.freeze({
  SALVAGE_BEAM: 'SCRAPER',
  HULL_SCRAPER: 'SCRAPER',
  TRACTOR_BEAM: 'TRACTOR',
  DRONE: 'SALVAGE_DRONE',
  REMOTE_DRONE: 'SALVAGE_DRONE',
});

function normalizeReleaseTrack(value: unknown): OperationReleaseTrack {
  const token = String(value || '').trim().toUpperCase();
  return token === 'PREVIEW_4_7' ? 'PREVIEW_4_7' : 'LIVE_4_6';
}

function normalizeMiningTier(value: unknown): OperationMiningScenarioConfig['tier'] {
  const token = String(value || '').trim().toUpperCase();
  if (
    token === 'SHIP_SPACE' ||
    token === 'SHIP_SURFACE' ||
    token === 'ROC_GEO' ||
    token === 'HAND_MINING' ||
    token === 'RING_SWEEP'
  ) {
    return token;
  }
  return 'SHIP_SURFACE';
}

function normalizeMiningEnvironment(value: unknown): OperationMiningScenarioConfig['environment'] {
  const token = String(value || '').trim().toUpperCase();
  if (
    token === 'SPACE_BELT' ||
    token === 'PLANETARY_SURFACE' ||
    token === 'MOON_SURFACE' ||
    token === 'PLANETARY_RING' ||
    token === 'CAVE_INTERIOR'
  ) {
    return token;
  }
  return 'PLANETARY_SURFACE';
}

function normalizeMiningExtractionMethod(value: unknown): OperationMiningScenarioConfig['extractionMethod'] {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'SHIP_LASER' || token === 'ROC_BEAM' || token === 'HAND_TOOL') return token;
  return 'SHIP_LASER';
}

function normalizeMiningVariant(variantId: unknown): string {
  const token = String(variantId || '').trim().toUpperCase();
  if (!token) return 'MINING_GEO';
  return MINING_VARIANT_ALIASES[token] || token;
}

function normalizeSalvageMode(value: unknown): OperationSalvageScenarioConfig['mode'] {
  const token = String(value || '').trim().toUpperCase();
  if (
    token === 'HULL_STRIP' ||
    token === 'COMPONENT_RECOVERY' ||
    token === 'CARGO_RETRIEVAL' ||
    token === 'BLACKBOX_RECOVERY' ||
    token === 'CONTESTED_RECOVERY'
  ) {
    return token;
  }
  return 'HULL_STRIP';
}

function normalizeSalvageEnvironment(value: unknown): OperationSalvageScenarioConfig['environment'] {
  const token = String(value || '').trim().toUpperCase();
  if (
    token === 'SPACE_DERELICT' ||
    token === 'SURFACE_WRECK' ||
    token === 'DEBRIS_FIELD' ||
    token === 'CONTESTED_ZONE'
  ) {
    return token;
  }
  return 'SPACE_DERELICT';
}

function normalizeSalvageExtractionMethod(value: unknown): OperationSalvageScenarioConfig['extractionMethod'] {
  const token = String(value || '').trim().toUpperCase();
  if (SALVAGE_METHOD_ALIASES[token]) return SALVAGE_METHOD_ALIASES[token];
  if (token === 'SCRAPER' || token === 'TRACTOR' || token === 'SALVAGE_DRONE' || token === 'MULTI_TOOL') return token;
  return 'SCRAPER';
}

function normalizeSalvageVariant(variantId: unknown): string {
  const token = String(variantId || '').trim().toUpperCase();
  if (!token) return 'SALVAGE_HULL_STRIP';
  return SALVAGE_VARIANT_ALIASES[token] || token;
}

function normalizePvpEnvironment(value: unknown): OperationPvpScenarioConfig['environment'] {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'SPACE' || token === 'SURFACE' || token === 'INTERIOR' || token === 'MIXED') return token;
  return 'INTERIOR';
}

function normalizePvpEngagementProfile(value: unknown): OperationPvpScenarioConfig['engagementProfile'] {
  const token = String(value || '').trim().toUpperCase();
  if (
    token === 'RAID' ||
    token === 'BOARDING' ||
    token === 'CONVOY_ESCORT' ||
    token === 'INTERDICTION' ||
    token === 'DEFENSE'
  ) {
    return token;
  }
  return 'RAID';
}

function normalizePvpOpsecLevel(value: unknown): OperationPvpScenarioConfig['opsecLevel'] {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'STANDARD' || token === 'RESTRICTED' || token === 'BLACK') return token;
  return 'RESTRICTED';
}

function normalizePvpRiskBand(value: unknown): 'LOW' | 'MEDIUM' | 'HIGH' {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'LOW' || token === 'MEDIUM' || token === 'HIGH') return token;
  return 'MEDIUM';
}

function normalizePvpVariant(variantId: unknown): string {
  const token = String(variantId || '').trim().toUpperCase();
  if (!token) return 'PVP_CQB_RAID';
  return PVP_VARIANT_ALIASES[token] || token;
}

function defaultMiningProfileForVariant(variantId: string): {
  tier: OperationMiningScenarioConfig['tier'];
  environment: OperationMiningScenarioConfig['environment'];
  extractionMethod: OperationMiningScenarioConfig['extractionMethod'];
} {
  const token = variantId.toUpperCase();
  if (token === 'MINING_ASTEROID_0G') {
    return { tier: 'SHIP_SPACE', environment: 'SPACE_BELT', extractionMethod: 'SHIP_LASER' };
  }
  if (token === 'MINING_PLANETARY_RING') {
    return { tier: 'RING_SWEEP', environment: 'PLANETARY_RING', extractionMethod: 'SHIP_LASER' };
  }
  if (token === 'MINING_HAND_CAVE') {
    return { tier: 'HAND_MINING', environment: 'CAVE_INTERIOR', extractionMethod: 'HAND_TOOL' };
  }
  if (token === 'MINING_ROC_SURFACE') {
    return { tier: 'ROC_GEO', environment: 'PLANETARY_SURFACE', extractionMethod: 'ROC_BEAM' };
  }
  if (token === 'MINING_SHIP_SURFACE') {
    return { tier: 'SHIP_SURFACE', environment: 'PLANETARY_SURFACE', extractionMethod: 'SHIP_LASER' };
  }
  if (token === 'MINING_SHIP_MOON') {
    return { tier: 'SHIP_SURFACE', environment: 'MOON_SURFACE', extractionMethod: 'SHIP_LASER' };
  }
  return { tier: 'SHIP_SURFACE', environment: 'PLANETARY_SURFACE', extractionMethod: 'SHIP_LASER' };
}

function defaultSalvageProfileForVariant(variantId: string): {
  mode: OperationSalvageScenarioConfig['mode'];
  environment: OperationSalvageScenarioConfig['environment'];
  extractionMethod: OperationSalvageScenarioConfig['extractionMethod'];
} {
  const token = variantId.toUpperCase();
  if (token === 'SALVAGE_RECOVERY_HOT_ZONE') {
    return { mode: 'CONTESTED_RECOVERY', environment: 'CONTESTED_ZONE', extractionMethod: 'MULTI_TOOL' };
  }
  if (token === 'SALVAGE_COMPONENT_RECOVERY') {
    return { mode: 'COMPONENT_RECOVERY', environment: 'SPACE_DERELICT', extractionMethod: 'TRACTOR' };
  }
  if (token === 'SALVAGE_CARGO_RECLAMATION') {
    return { mode: 'CARGO_RETRIEVAL', environment: 'DEBRIS_FIELD', extractionMethod: 'TRACTOR' };
  }
  if (token === 'SALVAGE_SURFACE_WRECK_RECOVERY') {
    return { mode: 'COMPONENT_RECOVERY', environment: 'SURFACE_WRECK', extractionMethod: 'SALVAGE_DRONE' };
  }
  if (token === 'SALVAGE_BLACKBOX_RETRIEVAL') {
    return { mode: 'BLACKBOX_RECOVERY', environment: 'SPACE_DERELICT', extractionMethod: 'MULTI_TOOL' };
  }
  return { mode: 'HULL_STRIP', environment: 'SPACE_DERELICT', extractionMethod: 'SCRAPER' };
}

function defaultPvpProfileForVariant(variantId: string): {
  environment: OperationPvpScenarioConfig['environment'];
  engagementProfile: OperationPvpScenarioConfig['engagementProfile'];
} {
  const token = variantId.toUpperCase();
  if (token === 'PVP_CQB_BOARDING') {
    return { environment: 'INTERIOR', engagementProfile: 'BOARDING' };
  }
  if (token === 'CONVOY_ESCORT') {
    return { environment: 'SPACE', engagementProfile: 'CONVOY_ESCORT' };
  }
  if (token === 'BOUNTY_INTERDICTION') {
    return { environment: 'SPACE', engagementProfile: 'INTERDICTION' };
  }
  if (token === 'SECURITY_SITE_DEFENSE') {
    return { environment: 'INTERIOR', engagementProfile: 'DEFENSE' };
  }
  return { environment: 'INTERIOR', engagementProfile: 'RAID' };
}

function collectScenarioNormalizationDiffs(
  rawScenario: OperationScenarioConfig | undefined,
  normalizedScenario: OperationScenarioConfig | undefined
): string[] {
  if (!rawScenario || !normalizedScenario) return [];
  const diffs: string[] = [];

  if (rawScenario.mining && normalizedScenario.mining) {
    const rawVariant = String(rawScenario.mining.variantId || '').trim();
    const normalizedVariant = String(normalizedScenario.mining.variantId || '').trim();
    if (rawVariant && rawVariant.toUpperCase() !== normalizedVariant.toUpperCase()) {
      diffs.push(`MINING.variantId:${rawVariant}->${normalizedVariant}`);
    }
  }

  if (rawScenario.salvage && normalizedScenario.salvage) {
    const rawVariant = String(rawScenario.salvage.variantId || '').trim();
    const normalizedVariant = String(normalizedScenario.salvage.variantId || '').trim();
    if (rawVariant && rawVariant.toUpperCase() !== normalizedVariant.toUpperCase()) {
      diffs.push(`SALVAGE.variantId:${rawVariant}->${normalizedVariant}`);
    }
    const rawMethod = String(rawScenario.salvage.extractionMethod || '').trim();
    const normalizedMethod = String(normalizedScenario.salvage.extractionMethod || '').trim();
    if (rawMethod && rawMethod.toUpperCase() !== normalizedMethod.toUpperCase()) {
      diffs.push(`SALVAGE.extractionMethod:${rawMethod}->${normalizedMethod}`);
    }
  }

  if (rawScenario.pvp && normalizedScenario.pvp) {
    const rawVariant = String(rawScenario.pvp.variantId || '').trim();
    const normalizedVariant = String(normalizedScenario.pvp.variantId || '').trim();
    if (rawVariant && rawVariant.toUpperCase() !== normalizedVariant.toUpperCase()) {
      diffs.push(`PVP.variantId:${rawVariant}->${normalizedVariant}`);
    }
  }

  return [...new Set(diffs)];
}

function normalizeScenarioConfig(config: OperationScenarioConfig | undefined): OperationScenarioConfig {
  if (!config || typeof config !== 'object') return {};
  const mining = config.mining
    ? (() => {
        const variantId = normalizeMiningVariant(config.mining.variantId);
        const defaults = defaultMiningProfileForVariant(variantId);
        return {
        variantId,
        tier: config.mining.tier ? normalizeMiningTier(config.mining.tier) : defaults.tier,
        environment: config.mining.environment ? normalizeMiningEnvironment(config.mining.environment) : defaults.environment,
        extractionMethod: config.mining.extractionMethod ? normalizeMiningExtractionMethod(config.mining.extractionMethod) : defaults.extractionMethod,
        oreTargets: [...new Set((config.mining.oreTargets || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        routePlan: String(config.mining.routePlan || '').trim(),
        refineryPlan: String(config.mining.refineryPlan || '').trim(),
        escortPolicy: String(config.mining.escortPolicy || '').trim(),
        stagingNodeId: String(config.mining.stagingNodeId || '').trim() || undefined,
        hazardTags: [...new Set((config.mining.hazardTags || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        riskProfile: {
          threatBand:
            config.mining.riskProfile?.threatBand === 'LOW' ||
            config.mining.riskProfile?.threatBand === 'MEDIUM' ||
            config.mining.riskProfile?.threatBand === 'HIGH'
              ? config.mining.riskProfile.threatBand
              : 'MEDIUM',
          hazardTags: [...new Set((config.mining.riskProfile?.hazardTags || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
          rescueCoverage: String(config.mining.riskProfile?.rescueCoverage || '').trim(),
        },
        regolithLink: {
          enabled: Boolean(config.mining.regolithLink?.enabled),
          source:
            config.mining.regolithLink?.source === 'MANUAL' || config.mining.regolithLink?.source === 'REGOLITH'
              ? config.mining.regolithLink.source
              : 'NONE',
          sessionId: String(config.mining.regolithLink?.sessionId || '').trim() || undefined,
          workOrderId: String(config.mining.regolithLink?.workOrderId || '').trim() || undefined,
          scoutingFindRefs: [...new Set((config.mining.regolithLink?.scoutingFindRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
        telemetryProjection: {
          fractureSuccessRatePct: Number(config.mining.telemetryProjection?.fractureSuccessRatePct || 0),
          overchargeIncidents: Number(config.mining.telemetryProjection?.overchargeIncidents || 0),
          recoveredScu: Number(config.mining.telemetryProjection?.recoveredScu || 0),
          idleHaulMinutes: Number(config.mining.telemetryProjection?.idleHaulMinutes || 0),
          refineryQueueMinutes: Number(config.mining.telemetryProjection?.refineryQueueMinutes || 0),
        },
        economics: {
          estimatedYieldScu: Number(config.mining.economics?.estimatedYieldScu || 0),
          estimatedUnitValueAuec: Number(config.mining.economics?.estimatedUnitValueAuec || 0),
          estimatedFuelCostAuec: Number(config.mining.economics?.estimatedFuelCostAuec || 0),
          estimatedRiskReserveAuec: Number(config.mining.economics?.estimatedRiskReserveAuec || 0),
          evidenceRefs: [...new Set((config.mining.economics?.evidenceRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
      };
      })()
    : undefined;
  const salvage = config.salvage
    ? (() => {
        const variantId = normalizeSalvageVariant(config.salvage.variantId);
        const defaults = defaultSalvageProfileForVariant(variantId);
        return {
        variantId,
        mode: config.salvage.mode ? normalizeSalvageMode(config.salvage.mode) : defaults.mode,
        environment: config.salvage.environment ? normalizeSalvageEnvironment(config.salvage.environment) : defaults.environment,
        extractionMethod: config.salvage.extractionMethod ? normalizeSalvageExtractionMethod(config.salvage.extractionMethod) : defaults.extractionMethod,
        objectiveType: String(config.salvage.objectiveType || '').trim(),
        targetWreckType: String(config.salvage.targetWreckType || '').trim(),
        claimJurisdiction: String(config.salvage.claimJurisdiction || '').trim(),
        routePlan: String(config.salvage.routePlan || '').trim(),
        processingPlan: String(config.salvage.processingPlan || '').trim(),
        escortPolicy: String(config.salvage.escortPolicy || '').trim(),
        inventoryPolicy: String(config.salvage.inventoryPolicy || '').trim(),
        hazardTags: [...new Set((config.salvage.hazardTags || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        riskProfile: {
          threatBand: normalizePvpRiskBand(config.salvage.riskProfile?.threatBand),
          legalExposure: normalizePvpRiskBand(config.salvage.riskProfile?.legalExposure),
          interdictionRisk: normalizePvpRiskBand(config.salvage.riskProfile?.interdictionRisk),
          hazardTags: [...new Set((config.salvage.riskProfile?.hazardTags || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
        telemetryProjection: {
          hullRecoveredPct: Number(config.salvage.telemetryProjection?.hullRecoveredPct || 0),
          componentsRecovered: Number(config.salvage.telemetryProjection?.componentsRecovered || 0),
          cargoRecoveredScu: Number(config.salvage.telemetryProjection?.cargoRecoveredScu || 0),
          cycleTimeMinutes: Number(config.salvage.telemetryProjection?.cycleTimeMinutes || 0),
          contaminationIncidents: Number(config.salvage.telemetryProjection?.contaminationIncidents || 0),
        },
        economics: {
          projectedRmcScu: Number(config.salvage.economics?.projectedRmcScu || 0),
          projectedCmScu: Number(config.salvage.economics?.projectedCmScu || 0),
          projectedCargoScu: Number(config.salvage.economics?.projectedCargoScu || 0),
          projectedGrossAuec: Number(config.salvage.economics?.projectedGrossAuec || 0),
          projectedFuelCostAuec: Number(config.salvage.economics?.projectedFuelCostAuec || 0),
          projectedProcessingCostAuec: Number(config.salvage.economics?.projectedProcessingCostAuec || 0),
          projectedRiskReserveAuec: Number(config.salvage.economics?.projectedRiskReserveAuec || 0),
          evidenceRefs: [...new Set((config.salvage.economics?.evidenceRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
        companionLink: {
          enabled: Boolean(config.salvage.companionLink?.enabled),
          source: config.salvage.companionLink?.source === 'MANUAL' ? 'MANUAL' : 'NONE',
          externalRefs: [...new Set((config.salvage.companionLink?.externalRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
      };
      })()
    : undefined;
  const pvp = config.pvp
    ? (() => {
        const variantId = normalizePvpVariant(config.pvp.variantId);
        const defaults = defaultPvpProfileForVariant(variantId);
        return {
        variantId,
        environment: config.pvp.environment ? normalizePvpEnvironment(config.pvp.environment) : defaults.environment,
        engagementProfile: config.pvp.engagementProfile ? normalizePvpEngagementProfile(config.pvp.engagementProfile) : defaults.engagementProfile,
        objectiveType: String(config.pvp.objectiveType || '').trim(),
        commandIntent: String(config.pvp.commandIntent || '').trim(),
        rulesOfEngagement: String(config.pvp.rulesOfEngagement || '').trim(),
        opsecLevel: normalizePvpOpsecLevel(config.pvp.opsecLevel),
        rallyPoints: [...new Set((config.pvp.rallyPoints || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        ingressPlan: String(config.pvp.ingressPlan || '').trim(),
        qrfPlan: String(config.pvp.qrfPlan || '').trim(),
        sustainmentPlan: String(config.pvp.sustainmentPlan || '').trim(),
        evacPlan: String(config.pvp.evacPlan || '').trim(),
        deconflictionPlan: String(config.pvp.deconflictionPlan || '').trim(),
        intelRefs: [...new Set((config.pvp.intelRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        forceProjection: {
          friendlyPlanned: Number(config.pvp.forceProjection?.friendlyPlanned || 0),
          hostileEstimated: Number(config.pvp.forceProjection?.hostileEstimated || 0),
          qrfReserve: Number(config.pvp.forceProjection?.qrfReserve || 0),
          medevacReserve: Number(config.pvp.forceProjection?.medevacReserve || 0),
        },
        riskProfile: {
          threatBand: normalizePvpRiskBand(config.pvp.riskProfile?.threatBand),
          cyberEwarRisk: normalizePvpRiskBand(config.pvp.riskProfile?.cyberEwarRisk),
          deceptionRisk: normalizePvpRiskBand(config.pvp.riskProfile?.deceptionRisk),
        },
        telemetryProjection: {
          objectiveControlTargetPct: Number(config.pvp.telemetryProjection?.objectiveControlTargetPct || 0),
          casualtyCap: Number(config.pvp.telemetryProjection?.casualtyCap || 0),
          currentCasualties: Number(config.pvp.telemetryProjection?.currentCasualties || 0),
          commsDisruptions: Number(config.pvp.telemetryProjection?.commsDisruptions || 0),
          reactionLatencySec: Number(config.pvp.telemetryProjection?.reactionLatencySec || 0),
        },
        companionLink: {
          enabled: Boolean(config.pvp.companionLink?.enabled),
          source: config.pvp.companionLink?.source === 'MANUAL' ? 'MANUAL' : 'NONE',
          externalRefs: [...new Set((config.pvp.companionLink?.externalRefs || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
        },
        opposingForce: {
          orgName: String(config.pvp.opposingForce?.orgName || 'Opposing Org').trim() || 'Opposing Org',
          doctrineSummary: String(config.pvp.opposingForce?.doctrineSummary || '').trim(),
          estimatedStrength: String(config.pvp.opposingForce?.estimatedStrength || 'unknown').trim() || 'unknown',
          assetProfile: String(config.pvp.opposingForce?.assetProfile || '').trim(),
          intelConfidence: normalizePvpRiskBand(config.pvp.opposingForce?.intelConfidence),
        },
      };
      })()
    : undefined;
  return { mining, salvage, pvp };
}

function normalizeSecurityProjection(
  projection: OperationSecurityProjection | undefined,
  scenarioConfig: OperationScenarioConfig
): OperationSecurityProjection | undefined {
  if (projection) {
    return {
      redactedOpponentLabel: String(projection.redactedOpponentLabel || 'Opposing Org (redacted)').trim() || 'Opposing Org (redacted)',
      redactedStrengthBand:
        projection.redactedStrengthBand === 'LOW' ||
        projection.redactedStrengthBand === 'MEDIUM' ||
        projection.redactedStrengthBand === 'HIGH'
          ? projection.redactedStrengthBand
          : 'UNKNOWN',
      notes: String(projection.notes || '').trim() || undefined,
    };
  }
  if (scenarioConfig.pvp) {
    return {
      redactedOpponentLabel: `${scenarioConfig.pvp.opposingForce.orgName} (redacted)`,
      redactedStrengthBand: 'UNKNOWN',
      notes: 'Opponent doctrine details restricted to command view.',
    };
  }
  return undefined;
}

function normalizeOperationRecord(operation: Operation): Operation {
  const createdAt = parseTimestampMs(operation.createdAt) ? new Date(operation.createdAt).toISOString() : nowIso();
  const updatedAt = parseTimestampMs(operation.updatedAt) ? new Date(operation.updatedAt).toISOString() : createdAt;
  const scenarioConfig = normalizeScenarioConfig(operation.scenarioConfig);
  return {
    ...operation,
    createdAt,
    updatedAt,
    archetypeId: operation.archetypeId || 'CUSTOM',
    releaseTrack: normalizeReleaseTrack(operation.releaseTrack),
    schedule: normalizeSchedule(operation.schedule, createdAt),
    readinessGates: normalizeReadinessGates(operation.readinessGates, operation.createdBy || 'system', updatedAt),
    scenarioConfig,
    securityProjection: normalizeSecurityProjection(operation.securityProjection, scenarioConfig),
    notificationMode: operation.notificationMode || 'IN_APP',
  };
}

function normalizeTemplateBlueprint(
  blueprint: OperationTemplateBlueprint | Partial<OperationTemplateBlueprint>,
  createdBy: string
): OperationTemplateBlueprint {
  const posture = blueprint.posture || 'CASUAL';
  const status = blueprint.status || 'PLANNING';
  const createdAt = nowIso();
  const scenarioConfig = normalizeScenarioConfig(blueprint.scenarioConfig);
  return {
    name: String(blueprint.name || 'Untitled Operation').trim() || 'Untitled Operation',
    hostOrgId: blueprint.hostOrgId || 'ORG-LOCAL',
    invitedOrgIds: [...new Set(blueprint.invitedOrgIds || [])],
    classification: blueprint.classification || 'INTERNAL',
    posture,
    status,
    domains: {
      fps: blueprint.domains?.fps ?? true,
      ground: blueprint.domains?.ground ?? true,
      airSpace: blueprint.domains?.airSpace ?? false,
      logistics: blueprint.domains?.logistics ?? true,
    },
    ao: blueprint.ao || { nodeId: 'system-stanton' },
    commsTemplateId: (blueprint.commsTemplateId || defaultCommsTemplateByPosture(posture)) as CommsTemplateId,
    ttlProfileId: blueprint.ttlProfileId || defaultTTlProfileByPosture(posture),
    permissions: {
      commanderIds: [...new Set(blueprint.permissions?.commanderIds || [])],
      guestOrgIds: [...new Set(blueprint.permissions?.guestOrgIds || [])],
      ownerIds: [...new Set(blueprint.permissions?.ownerIds || [createdBy])],
      participantIds: [...new Set(blueprint.permissions?.participantIds || [createdBy])],
    },
    archetypeId: blueprint.archetypeId || 'CUSTOM',
    releaseTrack: normalizeReleaseTrack(blueprint.releaseTrack),
    schedule: normalizeSchedule(blueprint.schedule, createdAt),
    readinessGates: normalizeReadinessGates(blueprint.readinessGates, createdBy, createdAt),
    scenarioConfig,
    securityProjection: normalizeSecurityProjection(blueprint.securityProjection, scenarioConfig),
    notificationMode: blueprint.notificationMode || 'IN_APP',
  };
}

function normalizeTemplateRecord(template: OperationTemplate): OperationTemplate {
  return {
    ...template,
    blueprint: normalizeTemplateBlueprint(template.blueprint, template.createdBy),
  };
}

function snapshotFreshnessMs(snapshot: Partial<OperationServiceSnapshot> | null | undefined, persistedAt?: string): number {
  if (!snapshot) return parseTimestampMs(persistedAt);
  let latest = parseTimestampMs(persistedAt);
  for (const op of snapshot.operationsStore || []) {
    latest = Math.max(latest, parseTimestampMs(op?.updatedAt || op?.createdAt));
  }
  for (const entry of snapshot.operationEventsStore || []) {
    latest = Math.max(latest, parseTimestampMs(entry?.createdAt));
  }
  for (const template of snapshot.operationTemplatesStore || []) {
    latest = Math.max(latest, parseTimestampMs(template?.updatedAt || template?.createdAt));
  }
  for (const audit of snapshot.operationAuditStore || []) {
    latest = Math.max(latest, parseTimestampMs(audit?.createdAt));
  }
  return latest;
}

function currentStoreFreshnessMs(): number {
  return snapshotFreshnessMs(createSnapshot());
}

function applySnapshot(snapshot: Partial<OperationServiceSnapshot>) {
  if (Array.isArray(snapshot.operationsStore)) {
    operationsStore = sortOperations(snapshot.operationsStore.map((entry) => normalizeOperationRecord(entry)));
  }
  if (Array.isArray(snapshot.operationEventsStore)) {
    operationEventsStore = sortOperationEvents(snapshot.operationEventsStore);
  }
  if (Array.isArray(snapshot.operationTemplatesStore)) {
    operationTemplatesStore = sortOperationTemplates(snapshot.operationTemplatesStore.map((entry) => normalizeTemplateRecord(entry)));
  }
  if (Array.isArray(snapshot.operationAuditStore)) {
    operationAuditStore = sortOperationAudit(snapshot.operationAuditStore);
  }
  if (snapshot.focusByUser && typeof snapshot.focusByUser === 'object') {
    for (const key of Object.keys(focusByUser)) delete focusByUser[key];
    Object.assign(focusByUser, snapshot.focusByUser);
  }
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function requestRemoteHydration() {
  if (remoteHydrateRequested || !workspaceStateSyncEnabled()) return;
  remoteHydrateRequested = true;
  void loadWorkspaceStateSnapshot<OperationServiceSnapshot>({
    namespace: OP_REMOTE_NAMESPACE,
    scopeKey: OP_REMOTE_SCOPE_KEY,
  }).then((remote) => {
    if (!remote?.state || typeof remote.state !== 'object') return;
    const remoteState = remote.state as Partial<OperationServiceSnapshot>;
    const remoteFreshness = snapshotFreshnessMs(remoteState, remote.persistedAt);
    const localFreshness = currentStoreFreshnessMs();
    if (localFreshness > 0 && remoteFreshness > 0 && remoteFreshness < localFreshness) return;
    applySnapshot(remoteState);
    notifyListeners();
  }).catch(() => {
    // best effort remote hydration
  });
}

function persistSnapshot() {
  const snapshot = createSnapshot();
  if (hasBrowserStorage()) {
    try {
      window.localStorage.setItem(OP_SERVICE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Persistence is best-effort only.
    }
  }
  enqueueWorkspaceStateSave({
    namespace: OP_REMOTE_NAMESPACE,
    scopeKey: OP_REMOTE_SCOPE_KEY,
    schemaVersion: 1,
    state: snapshot,
    debounceMs: 850,
  });
}

function hydrateSnapshot() {
  if (hasHydratedFromStorage) return;
  hasHydratedFromStorage = true;
  if (hasBrowserStorage()) {
    try {
      const raw = window.localStorage.getItem(OP_SERVICE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OperationServiceSnapshot>;
        applySnapshot(parsed);
      }
    } catch {
      // Ignore invalid snapshots.
    }
  }
  requestRemoteHydration();
}

function defaultCommsTemplateByPosture(posture: OperationPosture): CommsTemplateId {
  return posture === 'FOCUSED' ? 'COMMAND_NET' : 'SQUAD_NETS';
}

function defaultTTlProfileByPosture(posture: OperationPosture): string {
  return posture === 'FOCUSED' ? 'TTL-OP-FOCUSED' : 'TTL-OP-CASUAL';
}

function defaultFocusRulesByPosture(posture: OperationPosture): OperationFocusRules {
  if (posture === 'FOCUSED') {
    return {
      notificationPriority: 'HIGH',
      commsForegroundMode: 'PRIMARY_AND_MONITOR',
      backgroundAggregate: true,
    };
  }
  return {
    notificationPriority: 'MED',
    commsForegroundMode: 'PRIMARY_ONLY',
    backgroundAggregate: true,
  };
}

function hasManageRights(op: Operation, actorId: string | undefined): boolean {
  if (!actorId) return false;
  if (op.createdBy === actorId) return true;
  if (op.permissions.ownerIds?.includes(actorId)) return true;
  if (op.permissions.commanderIds?.includes(actorId)) return true;
  return false;
}

function hasLifecycleRights(
  op: Operation,
  actorId: string | undefined,
  actorContext?: OperationStatusUpdateOptions['actorContext']
): boolean {
  if (!actorId) return false;
  if (hasManageRights(op, actorId)) return true;
  if (!actorContext) return false;
  return canControlLifecycle(
    {
      actorId,
      rank: actorContext.rank,
      roles: actorContext.roles,
      orgId: actorContext.orgId,
      isAdmin: actorContext.isAdmin,
    },
    op
  ).allowed;
}

function hasOperationAccess(op: Operation, actorId: string | undefined): boolean {
  if (!actorId) return false;
  if (hasManageRights(op, actorId)) return true;
  if (op.permissions.participantIds?.includes(actorId)) return true;
  return false;
}

function requireActorId(actorId: string | undefined, actionLabel: string): string {
  const trimmed = String(actorId || '').trim();
  if (!trimmed) {
    throw new Error(`${actionLabel} requires actorId`);
  }
  return trimmed;
}

function appendAuditEvent(
  opId: string,
  action: string,
  actorId: string,
  summary: string,
  details?: Record<string, unknown>,
  nowMs = Date.now()
) {
  const record: OperationAuditEvent = {
    id: createAuditId(nowMs),
    opId,
    action,
    actorId,
    summary,
    details,
    createdAt: nowIso(nowMs),
  };
  operationAuditStore = sortOperationAudit([record, ...operationAuditStore]);
}

function buildOperationRecord(input: OperationCreateInput, nowMs = Date.now()): Operation {
  const posture = input.posture || 'CASUAL';
  const status = input.status || 'PLANNING';
  const createdAt = nowIso(nowMs);
  const scenarioConfig = normalizeScenarioConfig(input.scenarioConfig);
  const draft: Operation = {
    id: createOperationId(nowMs),
    name: input.name.trim() || 'Untitled Operation',
    hostOrgId: input.hostOrgId || 'ORG-LOCAL',
    invitedOrgIds: [...new Set(input.invitedOrgIds || [])],
    classification: input.classification || 'INTERNAL',
    posture,
    status,
    domains: {
      fps: input.domains?.fps ?? true,
      ground: input.domains?.ground ?? true,
      airSpace: input.domains?.airSpace ?? false,
      logistics: input.domains?.logistics ?? true,
    },
    createdBy: input.createdBy,
    createdAt,
    updatedAt: createdAt,
    focusRules: defaultFocusRulesByPosture(posture),
    linkedIntelIds: [],
    ao: input.ao || { nodeId: 'system-stanton' },
    commsTemplateId: input.commsTemplateId || defaultCommsTemplateByPosture(posture),
    ttlProfileId: input.ttlProfileId || defaultTTlProfileByPosture(posture),
    permissions: {
      ownerIds: [...new Set([input.createdBy, ...(input.permissions?.ownerIds || [])])],
      commanderIds: [...new Set(input.permissions?.commanderIds || [])],
      participantIds: [...new Set([input.createdBy, ...(input.permissions?.participantIds || [])])],
      guestOrgIds: [...new Set(input.permissions?.guestOrgIds || [])],
    },
    archetypeId: input.archetypeId || 'CUSTOM',
    releaseTrack: normalizeReleaseTrack(input.releaseTrack),
    schedule: normalizeSchedule(input.schedule, createdAt),
    readinessGates: normalizeReadinessGates(input.readinessGates, input.createdBy, createdAt),
    scenarioConfig,
    securityProjection: normalizeSecurityProjection(input.securityProjection, scenarioConfig),
    notificationMode: input.notificationMode || 'IN_APP',
  };
  return normalizeOperationRecord(draft);
}

function notifyListeners() {
  hydrateSnapshot();
  const snapshot = {
    operations: sortOperations(operationsStore).map((entry) => normalizeOperationRecord(entry)),
    focusByUser: { ...focusByUser },
    events: sortOperationEvents(operationEventsStore),
  };
  persistSnapshot();
  for (const listener of listeners) listener(snapshot);
}

export function canManageOperation(opId: string, actorId: string): OperationPermissionResult {
  hydrateSnapshot();
  const op = operationsStore.find((entry) => entry.id === opId);
  if (!op) return { allowed: false, reason: 'Operation not found' };
  const allowed = hasManageRights(op, actorId);
  return {
    allowed,
    reason: allowed ? 'Authorized by stub op permissions.' : 'Only owners/commanders may manage this operation.',
  };
}

export function createOperation(input: OperationCreateInput, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operation = buildOperationRecord(input, nowMs);
  const normalizationDiffs = collectScenarioNormalizationDiffs(input.scenarioConfig, operation.scenarioConfig);

  operationsStore = sortOperations([operation, ...operationsStore]);
  if (!focusByUser[input.createdBy]) focusByUser[input.createdBy] = operation.id;
  appendAuditEvent(
    operation.id,
    'OP_CREATED',
    input.createdBy,
    `Operation ${operation.name} created.`,
    {
      posture: operation.posture,
      status: operation.status,
      classification: operation.classification,
      aoNodeId: operation.ao?.nodeId,
    },
    nowMs
  );
  if (normalizationDiffs.length > 0) {
    appendAuditEvent(
      operation.id,
      'OP_SCENARIO_NORMALIZED',
      input.createdBy,
      'Scenario aliases normalized to canonical variant/method values.',
      { diffs: normalizationDiffs },
      nowMs
    );
  }
  notifyListeners();
  return operation;
}

export function listOperationsForUser(viewContext: OperationViewContext = {}): Operation[] {
  hydrateSnapshot();
  const includeArchived = Boolean(viewContext.includeArchived);
  const scopedByOrg = (op: Operation) => {
    if (!viewContext.orgId) return true;
    if (op.hostOrgId === viewContext.orgId) return true;
    if ((op.invitedOrgIds || []).includes(viewContext.orgId)) return true;
    if ((op.permissions.guestOrgIds || []).includes(viewContext.orgId)) return true;
    return false;
  };
  if (!viewContext.userId) {
    return sortOperations(operationsStore).map((op) => normalizeOperationRecord(op)).filter(
      (op) => (includeArchived ? true : op.status !== 'ARCHIVED') && scopedByOrg(op)
    );
  }

  return sortOperations(operationsStore).map((op) => normalizeOperationRecord(op)).filter((op) => {
    if (!includeArchived && op.status === 'ARCHIVED') return false;
    if (!scopedByOrg(op)) return false;
    return hasOperationAccess(op, viewContext.userId);
  });
}

export function listOperationsForOrg(orgId: string, includeArchived = false): Operation[] {
  hydrateSnapshot();
  const targetOrg = String(orgId || '').trim();
  if (!targetOrg) return [];
  return sortOperations(operationsStore).map((op) => normalizeOperationRecord(op)).filter((op) => {
    if (!includeArchived && op.status === 'ARCHIVED') return false;
    if (op.hostOrgId === targetOrg) return true;
    if ((op.invitedOrgIds || []).includes(targetOrg)) return true;
    if ((op.permissions.guestOrgIds || []).includes(targetOrg)) return true;
    return false;
  });
}

export function getOperationById(opId: string): Operation | null {
  hydrateSnapshot();
  const found = operationsStore.find((entry) => entry.id === opId);
  return found ? normalizeOperationRecord(found) : null;
}

export function joinOperation(opId: string, userId: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const actorId = requireActorId(userId, 'joinOperation');
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  const next: Operation = {
    ...existing,
    permissions: {
      ...existing.permissions,
      participantIds: [...new Set([...(existing.permissions.participantIds || []), actorId])],
    },
    updatedAt: nowIso(nowMs),
  };
  operationsStore = sortOperations(operationsStore.map((entry) => (entry.id === opId ? next : entry)));
  if (!focusByUser[actorId]) focusByUser[actorId] = next.id;
  appendAuditEvent(opId, 'OP_MEMBER_JOINED', actorId, `${actorId} joined operation.`, undefined, nowMs);
  notifyListeners();
  return next;
}

export function setFocusOperation(userId: string, opId: string | null): string | null {
  hydrateSnapshot();
  const actorId = requireActorId(userId, 'setFocusOperation');
  if (!opId) {
    delete focusByUser[actorId];
    notifyListeners();
    return null;
  }
  const op = getOperationById(opId);
  if (!op) throw new Error(`Operation ${opId} not found`);
  if (!hasOperationAccess(op, actorId)) {
    throw new Error('Cannot focus operation without membership');
  }
  focusByUser[actorId] = opId;
  appendAuditEvent(opId, 'OP_FOCUS_SET', actorId, `${actorId} set operation focus.`, undefined);
  notifyListeners();
  return opId;
}

export function getFocusOperationId(userId: string): string | null {
  hydrateSnapshot();
  return focusByUser[userId] || null;
}

function patchOperation(
  opId: string,
  mutate: (operation: Operation) => Operation,
  options: { notify?: boolean } = {}
): Operation {
  hydrateSnapshot();
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  const updated = mutate(existing);
  operationsStore = sortOperations(operationsStore.map((entry) => (entry.id === opId ? updated : entry)));
  if (options.notify !== false) notifyListeners();
  return updated;
}

export function updateOperation(opId: string, input: OperationUpdateInput, actorId?: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'updateOperation');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const scenarioConfig = input.scenarioConfig ? normalizeScenarioConfig(input.scenarioConfig) : undefined;
  const normalizationDiffs = collectScenarioNormalizationDiffs(input.scenarioConfig, scenarioConfig);
  const updated = patchOperation(opId, (operation) => ({
    ...normalizeOperationRecord({
      ...operation,
      name: input.name?.trim() || operation.name,
      ao: input.ao || operation.ao,
      linkedIntelIds: input.linkedIntelIds ? [...new Set(input.linkedIntelIds)] : operation.linkedIntelIds,
      invitedOrgIds: input.invitedOrgIds ? [...new Set(input.invitedOrgIds)] : operation.invitedOrgIds,
      classification: input.classification || operation.classification,
      archetypeId: input.archetypeId || operation.archetypeId || 'CUSTOM',
      releaseTrack: input.releaseTrack || operation.releaseTrack || 'LIVE_4_6',
      schedule: input.schedule || operation.schedule,
      readinessGates: input.readinessGates || operation.readinessGates,
      scenarioConfig: scenarioConfig || operation.scenarioConfig,
      securityProjection: input.securityProjection || operation.securityProjection,
      notificationMode: input.notificationMode || operation.notificationMode || 'IN_APP',
      updatedAt: nowIso(nowMs),
    }),
  }), { notify: false });
  appendAuditEvent(
    opId,
    'OP_METADATA_UPDATED',
    operatorId,
    'Operation metadata updated.',
    {
      name: updated.name,
      classification: updated.classification,
      aoNodeId: updated.ao?.nodeId,
    },
    nowMs
  );
  if (normalizationDiffs.length > 0) {
    appendAuditEvent(
      opId,
      'OP_SCENARIO_NORMALIZED',
      operatorId,
      'Scenario aliases normalized to canonical variant/method values.',
      { diffs: normalizationDiffs },
      nowMs
    );
  }
  notifyListeners();
  return updated;
}

export function updateStatus(
  opId: string,
  status: OperationStatus,
  actorId?: string,
  nowMs = Date.now(),
  options: OperationStatusUpdateOptions = {}
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'updateStatus');
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  if (!hasLifecycleRights(existing, operatorId, options.actorContext)) {
    throw new Error('Lifecycle update requires operation command authority or rank/role lifecycle permission.');
  }
  const pendingRequiredGates = (existing.readinessGates || []).filter((gate) => gate.required && gate.status !== 'READY');
  const overrideReason = String(options.overrideReason || '').trim();
  const overrideApplied = status === 'ACTIVE' && pendingRequiredGates.length > 0;
  if (overrideApplied && !overrideReason) {
    throw new Error('Activation blocked: required readiness gates are not READY. Provide override reason.');
  }
  const updated = patchOperation(opId, (operation) => normalizeOperationRecord({
    ...operation,
    status,
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(opId, 'OP_STATUS_UPDATED', operatorId, `Operation status set to ${status}.`, {
    status,
    overrideApplied,
    overrideReason: overrideReason || undefined,
    pendingRequiredGateIds: pendingRequiredGates.map((gate) => gate.id),
  }, nowMs);
  if (overrideApplied) {
    appendAuditEvent(
      opId,
      'OP_STATUS_OVERRIDE',
      operatorId,
      `Status override applied for ${status}.`,
      { status, overrideReason, pendingRequiredGateIds: pendingRequiredGates.map((gate) => gate.id) },
      nowMs
    );
  }
  notifyListeners();
  return updated;
}

export function listOperationReadinessGates(opId: string): OperationReadinessGate[] {
  hydrateSnapshot();
  const op = getOperationById(opId);
  if (!op) return [];
  return [...(op.readinessGates || [])];
}

export function setOperationReadinessGateStatus(
  opId: string,
  gateId: string,
  status: OperationReadinessGate['status'],
  actorId?: string,
  note?: string,
  nowMs = Date.now(),
  actorContext?: OperationStatusUpdateOptions['actorContext']
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'setOperationReadinessGateStatus');
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  if (!hasLifecycleRights(existing, operatorId, actorContext)) {
    throw new Error('Only command-authorized operators may update readiness gates.');
  }
  const updated = patchOperation(
    opId,
    (operation) => {
      const gates = (operation.readinessGates || []).map((gate) =>
        gate.id === gateId
          ? {
              ...gate,
              status: normalizeReadinessGateStatus(status),
              note: String(note || gate.note || '').trim() || undefined,
              updatedAt: nowIso(nowMs),
              updatedBy: operatorId,
            }
          : gate
      );
      return normalizeOperationRecord({
        ...operation,
        readinessGates: gates,
        updatedAt: nowIso(nowMs),
      });
    },
    { notify: false }
  );
  appendAuditEvent(
    opId,
    'OP_READINESS_GATE_UPDATED',
    operatorId,
    `Readiness gate ${gateId} set to ${status}.`,
    { gateId, status, note: note || undefined },
    nowMs
  );
  notifyListeners();
  return updated;
}

export function setPosture(
  opId: string,
  posture: OperationPosture,
  actorId?: string,
  nowMs = Date.now(),
  actorContext?: OperationStatusUpdateOptions['actorContext']
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'setPosture');
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  if (!hasLifecycleRights(existing, operatorId, actorContext)) {
    throw new Error('Lifecycle posture change requires operation command authority or rank/role lifecycle permission.');
  }
  const updated = patchOperation(opId, (operation) => normalizeOperationRecord({
    ...operation,
    posture,
    focusRules: defaultFocusRulesByPosture(posture),
    commsTemplateId: defaultCommsTemplateByPosture(posture),
    ttlProfileId: defaultTTlProfileByPosture(posture),
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(opId, 'OP_POSTURE_UPDATED', operatorId, `Operation posture set to ${posture}.`, { posture }, nowMs);
  notifyListeners();
  return updated;
}

export function applyCommsTemplate(
  opId: string,
  templateId: CommsTemplateId,
  actorId?: string,
  nowMs = Date.now()
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'applyCommsTemplate');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const updated = patchOperation(opId, (operation) => normalizeOperationRecord({
    ...operation,
    commsTemplateId: templateId,
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(
    opId,
    'OP_COMMS_TEMPLATE_APPLIED',
    operatorId,
    `Comms template set to ${templateId}.`,
    { templateId },
    nowMs
  );
  notifyListeners();
  return updated;
}

export function createOperationTemplateFromOperation(
  opId: string,
  actorId: string,
  options: { name?: string; description?: string } = {},
  nowMs = Date.now()
): OperationTemplate {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'createOperationTemplateFromOperation');
  const operation = getOperationById(opId);
  if (!operation) throw new Error(`Operation ${opId} not found`);
  if (!hasManageRights(operation, operatorId)) {
    throw new Error('Only owners/commanders may create templates from this operation.');
  }

  const createdAt = nowIso(nowMs);
  const templateDraft: OperationTemplate = {
    id: createTemplateId(nowMs),
    name: options.name?.trim() || `${operation.name} Template`,
    description: options.description?.trim() || '',
    sourceOpId: operation.id,
    createdBy: operatorId,
    createdAt,
    updatedAt: createdAt,
    blueprint: {
      name: operation.name,
      hostOrgId: operation.hostOrgId,
      invitedOrgIds: [...new Set(operation.invitedOrgIds || [])],
      classification: operation.classification,
      posture: operation.posture,
      status: operation.status,
      domains: { ...operation.domains },
      ao: { ...operation.ao },
      commsTemplateId: operation.commsTemplateId as CommsTemplateId,
      ttlProfileId: operation.ttlProfileId,
      permissions: {
        commanderIds: [...new Set(operation.permissions.commanderIds || [])],
        guestOrgIds: [...new Set(operation.permissions.guestOrgIds || [])],
      },
      archetypeId: operation.archetypeId,
      releaseTrack: operation.releaseTrack,
      schedule: operation.schedule,
      readinessGates: operation.readinessGates,
      scenarioConfig: operation.scenarioConfig,
      securityProjection: operation.securityProjection,
      notificationMode: operation.notificationMode,
    },
  };
  const template = normalizeTemplateRecord(templateDraft);

  operationTemplatesStore = sortOperationTemplates([template, ...operationTemplatesStore]);
  appendAuditEvent(opId, 'OP_TEMPLATE_SAVED', operatorId, `Template ${template.name} saved from operation.`, { templateId: template.id }, nowMs);
  notifyListeners();
  return template;
}

export function createOperationTemplate(input: OperationTemplateCreateInput, nowMs = Date.now()): OperationTemplate {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'createOperationTemplate');
  const createdAt = nowIso(nowMs);
  const template: OperationTemplate = normalizeTemplateRecord({
    id: createTemplateId(nowMs),
    name: input.name.trim() || 'Untitled Template',
    description: input.description?.trim() || '',
    createdBy: operatorId,
    createdAt,
    updatedAt: createdAt,
    blueprint: normalizeTemplateBlueprint(input.blueprint || {}, operatorId),
  });

  operationTemplatesStore = sortOperationTemplates([template, ...operationTemplatesStore]);
  notifyListeners();
  return template;
}

export function listOperationTemplates(viewContext: { createdBy?: string; orgId?: string; userId?: string } = {}): OperationTemplate[] {
  hydrateSnapshot();
  const creator = String(viewContext.createdBy || '').trim();
  const orgId = String(viewContext.orgId || '').trim();
  const userId = String(viewContext.userId || '').trim();
  return sortOperationTemplates(operationTemplatesStore).map((entry) => normalizeTemplateRecord(entry)).filter((entry) => {
    if (creator && entry.createdBy !== creator) return false;
    if (!orgId) return true;
    const hostOrgId = String(entry.blueprint.hostOrgId || '').trim();
    const invitedOrgIds = entry.blueprint.invitedOrgIds || [];
    const matchesOrg = hostOrgId === orgId || invitedOrgIds.includes(orgId);
    if (matchesOrg) return true;
    return Boolean(userId) && userId === entry.createdBy;
  });
}

export function instantiateOperationFromTemplate(
  templateId: string,
  input: OperationTemplateInstantiateInput,
  nowMs = Date.now()
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'instantiateOperationFromTemplate');
  const templateEntry = operationTemplatesStore.find((entry) => entry.id === templateId);
  const template = templateEntry ? normalizeTemplateRecord(templateEntry) : null;
  if (!template) throw new Error(`Operation template ${templateId} not found`);

  const operation = createOperation(
    {
      createdBy: operatorId,
      name: input.name?.trim() || template.blueprint.name,
      hostOrgId: input.hostOrgId || template.blueprint.hostOrgId,
      invitedOrgIds: input.invitedOrgIds || template.blueprint.invitedOrgIds,
      classification: input.classification || template.blueprint.classification,
      posture: input.posture || template.blueprint.posture,
      status: input.status || template.blueprint.status,
      domains: template.blueprint.domains,
      ao: input.ao || template.blueprint.ao,
      commsTemplateId: template.blueprint.commsTemplateId,
      ttlProfileId: template.blueprint.ttlProfileId,
      permissions: template.blueprint.permissions,
      archetypeId: input.archetypeId || template.blueprint.archetypeId,
      releaseTrack: input.releaseTrack || template.blueprint.releaseTrack,
      schedule: input.schedule || template.blueprint.schedule,
      readinessGates: input.readinessGates || template.blueprint.readinessGates,
      scenarioConfig: input.scenarioConfig || template.blueprint.scenarioConfig,
      securityProjection: input.securityProjection || template.blueprint.securityProjection,
      notificationMode: input.notificationMode || template.blueprint.notificationMode,
    },
    nowMs
  );
  appendAuditEvent(
    operation.id,
    'OP_TEMPLATE_APPLIED',
    operatorId,
    `Operation instantiated from template ${template.name}.`,
    { templateId: template.id, templateName: template.name },
    nowMs
  );
  notifyListeners();
  return operation;
}

export function cloneOperation(sourceOpId: string, input: OperationCloneInput, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'cloneOperation');
  const source = getOperationById(sourceOpId);
  if (!source) throw new Error(`Operation ${sourceOpId} not found`);
  if (!hasOperationAccess(source, operatorId)) {
    throw new Error('Cannot clone operation without membership');
  }
  const clone = createOperation(
    {
      createdBy: operatorId,
      name: input.name?.trim() || `${source.name} Copy`,
      hostOrgId: source.hostOrgId,
      invitedOrgIds: source.invitedOrgIds,
      classification: source.classification,
      posture: source.posture,
      status: 'PLANNING',
      domains: source.domains,
      ao: source.ao,
      commsTemplateId: source.commsTemplateId as CommsTemplateId,
      ttlProfileId: source.ttlProfileId,
      permissions: {
        commanderIds: source.permissions.commanderIds,
        guestOrgIds: source.permissions.guestOrgIds,
      },
      archetypeId: source.archetypeId,
      releaseTrack: source.releaseTrack,
      schedule: source.schedule,
      readinessGates: source.readinessGates,
      scenarioConfig: source.scenarioConfig,
      securityProjection: source.securityProjection,
      notificationMode: source.notificationMode,
    },
    nowMs
  );
  appendAuditEvent(
    clone.id,
    'OP_CLONED_FROM',
    operatorId,
    `Operation cloned from ${source.id}.`,
    { sourceOpId: source.id, sourceOpName: source.name },
    nowMs
  );
  appendAuditEvent(
    source.id,
    'OP_CLONED_TO',
    operatorId,
    `Operation cloned into ${clone.id}.`,
    { cloneOpId: clone.id, cloneOpName: clone.name },
    nowMs
  );
  notifyListeners();
  return clone;
}

export function appendOperationEvent(
  input: Omit<OperationEventStub, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  nowMs = Date.now()
): OperationEventStub {
  hydrateSnapshot();
  const scopeKind = input.scopeKind || (input.opId ? 'OP' : 'PERSONAL');
  const record: OperationEventStub = {
    id: input.id || createOperationEventId(nowMs),
    opId: input.opId,
    scopeKind,
    kind: input.kind,
    isSimulation: Boolean(input.isSimulation),
    simulationSessionId: input.simulationSessionId,
    simulationScenarioId: input.simulationScenarioId,
    sourceDraftId: input.sourceDraftId,
    nodeId: input.nodeId,
    intelId: input.intelId,
    zoneId: input.zoneId,
    payload: input.payload || {},
    createdBy: input.createdBy,
    createdAt: input.createdAt || nowIso(nowMs),
  };
  operationEventsStore = sortOperationEvents([record, ...operationEventsStore]);
  notifyListeners();
  return record;
}

export function listOperationEvents(opId?: string): OperationEventStub[] {
  hydrateSnapshot();
  const events = sortOperationEvents(operationEventsStore);
  if (!opId) return events;
  return events.filter((entry) => entry.opId === opId);
}

export function listLiveOperationEvents(opId?: string): OperationEventStub[] {
  return listOperationEvents(opId).filter((entry) => !entry.isSimulation);
}

export function listSimulationOperationEvents(opId?: string, sessionId?: string): OperationEventStub[] {
  hydrateSnapshot();
  return listOperationEvents(opId).filter((entry) => {
    if (!entry.isSimulation) return false;
    if (sessionId && entry.simulationSessionId !== sessionId) return false;
    return true;
  });
}

export function listOperationAuditEvents(opId?: string, limit = 60): OperationAuditEvent[] {
  hydrateSnapshot();
  const events = sortOperationAudit(operationAuditStore);
  const scoped = opId ? events.filter((entry) => entry.opId === opId) : events;
  return scoped.slice(0, Math.max(1, limit));
}

export function subscribeOperations(listener: OperationListener): () => void {
  hydrateSnapshot();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOperationServiceState() {
  hydrateSnapshot();
  operationsStore = [];
  operationEventsStore = [];
  operationTemplatesStore = [];
  operationAuditStore = [];
  remoteHydrateRequested = false;
  for (const key of Object.keys(focusByUser)) delete focusByUser[key];
  if (hasBrowserStorage()) {
    try {
      window.localStorage.removeItem(OP_SERVICE_STORAGE_KEY);
    } catch {
      // no-op
    }
  }
  notifyListeners();
}
