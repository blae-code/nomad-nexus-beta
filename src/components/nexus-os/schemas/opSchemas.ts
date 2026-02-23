/**
 * Operations Vertical Schemas
 *
 * Guardrails:
 * - Ops are scoped contexts and may run in parallel.
 * - RSVP compliance distinguishes hard/soft/advisory enforcement.
 * - Async collaboration is artifact-scoped (no global chat assumptions).
 */

import type { DataClassification } from './crossOrgSchemas';

export type OperationPosture = 'FOCUSED' | 'CASUAL';
export type OperationStatus = 'PLANNING' | 'ACTIVE' | 'WRAPPING' | 'ARCHIVED';
export type OperationArchetypeId = 'INDUSTRIAL_MINING' | 'INDUSTRIAL_SALVAGE' | 'PVP_ORG_V_ORG' | 'CUSTOM';
export type OperationReleaseTrack = 'LIVE_4_6' | 'PREVIEW_4_7';
export type OperationContentConfidence = 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'SPECULATIVE';

export interface OperationDomains {
  fps: boolean;
  ground: boolean;
  airSpace: boolean;
  logistics: boolean;
}

export interface OperationFocusRules {
  notificationPriority?: 'LOW' | 'MED' | 'HIGH';
  commsForegroundMode?: 'PRIMARY_ONLY' | 'PRIMARY_AND_MONITOR';
  backgroundAggregate?: boolean;
}

export interface OperationPermissions {
  ownerIds?: string[];
  commanderIds?: string[];
  participantIds?: string[];
  guestOrgIds?: string[];
}

export interface OperationAO {
  nodeId: string;
  note?: string;
}

export interface OperationSchedule {
  plannedStartAt: string;
  plannedEndAt: string;
  timezone: string;
}

export type OperationReadinessGateStatus = 'PENDING' | 'READY' | 'BLOCKED';

export interface OperationReadinessGate {
  id: string;
  label: string;
  ownerRole: string;
  required: boolean;
  status: OperationReadinessGateStatus;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface OperationMiningEconomics {
  estimatedYieldScu: number;
  estimatedUnitValueAuec: number;
  estimatedFuelCostAuec: number;
  estimatedRiskReserveAuec: number;
  evidenceRefs: string[];
}

export type OperationMiningTier =
  | 'SHIP_SPACE'
  | 'SHIP_SURFACE'
  | 'ROC_GEO'
  | 'HAND_MINING'
  | 'RING_SWEEP';

export type OperationMiningEnvironment =
  | 'SPACE_BELT'
  | 'PLANETARY_SURFACE'
  | 'MOON_SURFACE'
  | 'PLANETARY_RING'
  | 'CAVE_INTERIOR';

export type OperationMiningExtractionMethod = 'SHIP_LASER' | 'ROC_BEAM' | 'HAND_TOOL';

export interface OperationMiningRegolithLink {
  enabled: boolean;
  source: 'NONE' | 'MANUAL' | 'REGOLITH';
  sessionId?: string;
  workOrderId?: string;
  scoutingFindRefs: string[];
}

export interface OperationMiningTelemetryProjection {
  fractureSuccessRatePct: number;
  overchargeIncidents: number;
  recoveredScu: number;
  idleHaulMinutes: number;
  refineryQueueMinutes: number;
}

export interface OperationMiningRiskProfile {
  threatBand: 'LOW' | 'MEDIUM' | 'HIGH';
  hazardTags: string[];
  rescueCoverage: string;
}

export interface OperationMiningScenarioConfig {
  variantId: string;
  tier: OperationMiningTier;
  environment: OperationMiningEnvironment;
  extractionMethod: OperationMiningExtractionMethod;
  oreTargets: string[];
  routePlan: string;
  refineryPlan: string;
  escortPolicy: string;
  stagingNodeId?: string;
  hazardTags: string[];
  riskProfile: OperationMiningRiskProfile;
  regolithLink: OperationMiningRegolithLink;
  telemetryProjection: OperationMiningTelemetryProjection;
  economics: OperationMiningEconomics;
}

export interface OperationSalvageEconomics {
  projectedRmcScu: number;
  projectedCmScu: number;
  projectedCargoScu: number;
  projectedGrossAuec: number;
  projectedFuelCostAuec: number;
  projectedProcessingCostAuec: number;
  projectedRiskReserveAuec: number;
  evidenceRefs: string[];
}

export type OperationSalvageMode =
  | 'HULL_STRIP'
  | 'COMPONENT_RECOVERY'
  | 'CARGO_RETRIEVAL'
  | 'BLACKBOX_RECOVERY'
  | 'CONTESTED_RECOVERY';

export type OperationSalvageEnvironment =
  | 'SPACE_DERELICT'
  | 'SURFACE_WRECK'
  | 'DEBRIS_FIELD'
  | 'CONTESTED_ZONE';

export type OperationSalvageExtractionMethod = 'SCRAPER' | 'TRACTOR' | 'SALVAGE_DRONE' | 'MULTI_TOOL';

export interface OperationSalvageRiskProfile {
  threatBand: 'LOW' | 'MEDIUM' | 'HIGH';
  legalExposure: 'LOW' | 'MEDIUM' | 'HIGH';
  interdictionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  hazardTags: string[];
}

export interface OperationSalvageTelemetryProjection {
  hullRecoveredPct: number;
  componentsRecovered: number;
  cargoRecoveredScu: number;
  cycleTimeMinutes: number;
  contaminationIncidents: number;
}

export interface OperationSalvageCompanionLink {
  enabled: boolean;
  source: 'NONE' | 'MANUAL';
  externalRefs: string[];
}

export interface OperationSalvageScenarioConfig {
  variantId: string;
  mode: OperationSalvageMode;
  environment: OperationSalvageEnvironment;
  extractionMethod: OperationSalvageExtractionMethod;
  objectiveType: string;
  targetWreckType: string;
  claimJurisdiction: string;
  routePlan: string;
  processingPlan: string;
  escortPolicy: string;
  inventoryPolicy: string;
  hazardTags: string[];
  riskProfile: OperationSalvageRiskProfile;
  telemetryProjection: OperationSalvageTelemetryProjection;
  economics: OperationSalvageEconomics;
  companionLink: OperationSalvageCompanionLink;
}

export interface OperationOpponentProfile {
  orgName: string;
  doctrineSummary: string;
  estimatedStrength: string;
  assetProfile: string;
  intelConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type OperationPvpEnvironment = 'SPACE' | 'SURFACE' | 'INTERIOR' | 'MIXED';

export type OperationPvpEngagementProfile =
  | 'RAID'
  | 'BOARDING'
  | 'CONVOY_ESCORT'
  | 'INTERDICTION'
  | 'DEFENSE';

export type OperationPvpOpsecLevel = 'STANDARD' | 'RESTRICTED' | 'BLACK';

export interface OperationPvpForceProjection {
  friendlyPlanned: number;
  hostileEstimated: number;
  qrfReserve: number;
  medevacReserve: number;
}

export interface OperationPvpRiskProfile {
  threatBand: 'LOW' | 'MEDIUM' | 'HIGH';
  cyberEwarRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  deceptionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface OperationPvpTelemetryProjection {
  objectiveControlTargetPct: number;
  casualtyCap: number;
  currentCasualties: number;
  commsDisruptions: number;
  reactionLatencySec: number;
}

export interface OperationPvpCompanionLink {
  enabled: boolean;
  source: 'NONE' | 'MANUAL';
  externalRefs: string[];
}

export interface OperationPvpScenarioConfig {
  variantId: string;
  environment: OperationPvpEnvironment;
  engagementProfile: OperationPvpEngagementProfile;
  objectiveType: string;
  commandIntent: string;
  rulesOfEngagement: string;
  opsecLevel: OperationPvpOpsecLevel;
  rallyPoints: string[];
  ingressPlan: string;
  qrfPlan: string;
  sustainmentPlan: string;
  evacPlan: string;
  deconflictionPlan: string;
  intelRefs: string[];
  forceProjection: OperationPvpForceProjection;
  riskProfile: OperationPvpRiskProfile;
  telemetryProjection: OperationPvpTelemetryProjection;
  companionLink: OperationPvpCompanionLink;
  opposingForce: OperationOpponentProfile;
}

export interface OperationScenarioConfig {
  mining?: OperationMiningScenarioConfig;
  salvage?: OperationSalvageScenarioConfig;
  pvp?: OperationPvpScenarioConfig;
}

export interface OperationSecurityProjection {
  redactedOpponentLabel: string;
  redactedStrengthBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  notes?: string;
}

export interface Operation {
  id: string;
  name: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture: OperationPosture;
  status: OperationStatus;
  domains: OperationDomains;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  focusRules?: OperationFocusRules;
  linkedIntelIds?: string[];
  ao: OperationAO;
  commsTemplateId: string;
  ttlProfileId: string;
  permissions: OperationPermissions;
  archetypeId?: OperationArchetypeId;
  releaseTrack?: OperationReleaseTrack;
  schedule?: OperationSchedule;
  readinessGates?: OperationReadinessGate[];
  scenarioConfig?: OperationScenarioConfig;
  securityProjection?: OperationSecurityProjection;
  notificationMode?: 'IN_APP';
}

export type ArtifactStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'DEFERRED';

export interface Objective {
  id: string;
  opId: string;
  title: string;
  body?: string;
  priority: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
  status: ArtifactStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Phase {
  id: string;
  opId: string;
  title: string;
  orderIndex: number;
  timeHint?: string;
  status: ArtifactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  opId: string;
  domain: 'FPS' | 'GROUND' | 'AIR_SPACE' | 'LOGISTICS' | 'INTEL' | 'COMMAND' | 'OTHER';
  title: string;
  body?: string;
  ownerElement?: 'CE' | 'GCE' | 'ACE';
  prerequisites?: string[];
  successCriteria?: string;
  abortCriteria?: string;
  status: ArtifactStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assumption {
  id: string;
  opId: string;
  statement: string;
  confidence: number;
  ttlProfileId: string;
  createdBy: string;
  status: 'ACTIVE' | 'CHALLENGED' | 'RETIRED';
  challengedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRef {
  kind: 'objective' | 'phase' | 'task' | 'assumption' | 'intel' | 'comment' | 'other';
  id: string;
}

export interface Decision {
  id: string;
  opId: string;
  sourceCommentId?: string;
  title: string;
  body: string;
  linkedArtifactRefs?: ArtifactRef[];
  createdBy: string;
  createdAt: string;
}

export type RuleEnforcement = 'HARD' | 'SOFT' | 'ADVISORY';
export type RequirementKind = 'ROLE' | 'ASSET' | 'CAPABILITY' | 'COMPOSITION' | 'READINESS' | 'COMMS';

/**
 * Structured predicate for policy evaluation; no executable code.
 */
export interface RequirementPredicate {
  roleIn?: string[];
  minCount?: number;
  shipTagsAny?: string[];
  capabilityAny?: string[];
  commsRequired?: boolean;
  composition?: Record<string, number>;
}

export interface RequirementRule {
  id: string;
  enforcement: RuleEnforcement;
  kind: RequirementKind;
  predicate: RequirementPredicate;
  message: string;
}

export interface RSVPPolicy {
  id: string;
  opId: string;
  rules: RequirementRule[];
}

export type RSVPMode = 'INDIVIDUAL' | 'ASSET';

export interface RSVPCompliance {
  hardViolations: string[];
  softFlags: string[];
  advisory: string[];
  exceptionReason?: string;
}

export interface RSVPEntry {
  id: string;
  opId: string;
  userId: string;
  mode: RSVPMode;
  rolePrimary: string;
  roleSecondary?: string[];
  notes?: string;
  status: 'SUBMITTED' | 'WITHDRAWN';
  compliance: RSVPCompliance;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCapabilitySnapshot {
  tags: string[];
  shipClass?: string;
  crewSeats?: number;
  cargoClass?: string;
  medical?: boolean;
  interdiction?: boolean;
}

export interface CrewSeatEnforcementPreference {
  enforcement: 'HARD' | 'SOFT';
  predicate?: RequirementPredicate;
}

export interface CrewSeatRequest {
  id: string;
  assetSlotId: string;
  roleNeeded: string;
  qty: number;
  enforcementPreferences?: CrewSeatEnforcementPreference;
  notes?: string;
}

export interface AssetSlot {
  id: string;
  opId: string;
  rsvpEntryId: string;
  assetId: string;
  assetName: string;
  fitProfileId?: string;
  capabilitySnapshot: AssetCapabilitySnapshot;
  crewProvided: number;
  crewNeeded: CrewSeatRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface CrewSeatAssignment {
  id: string;
  opId: string;
  assetSlotId: string;
  userId: string;
  role: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
}

export interface OpComment {
  id: string;
  opId: string;
  by: string;
  at: string;
  body: string;
  parentCommentId?: string;
  linkedArtifactRefs?: ArtifactRef[];
}

export interface OperationEventStub {
  id: string;
  opId?: string;
  scopeKind?: 'OP' | 'ORG' | 'PERSONAL';
  kind: string;
  isSimulation?: boolean;
  simulationSessionId?: string;
  simulationScenarioId?: string;
  sourceDraftId?: string;
  nodeId?: string;
  intelId?: string;
  zoneId?: string;
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}
