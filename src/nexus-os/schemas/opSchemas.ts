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
