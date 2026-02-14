/**
 * Nexus OS Core Schemas
 *
 * Guardrails:
 * - Never model fake live telemetry as authoritative truth.
 * - Every tactical record must retain timestamp + TTL + confidence.
 * - Scope and authority are first-class and must not be bypassed.
 */

export type VisibilityScope = 'PRIVATE' | 'SQUAD' | 'WING' | 'OP' | 'ORG';
export type TruthMode = 'DECLARED' | 'INFERRED';
export type CommandScope = 'user' | 'squad' | 'wing' | 'op' | 'org';
export type AuthorityLevel = 'FIRETEAM' | 'SQUAD' | 'WING' | 'COMMAND' | 'ORG';
export type IntentType =
  | 'MOVE'
  | 'HOLD'
  | 'PUSH'
  | 'EXTRACT'
  | 'SECURE'
  | 'FLANK'
  | 'BREACH'
  | 'DISENGAGE'
  | 'REGROUP'
  | 'SUPPORT';

export type CqbEventType =
  | 'CONTACT'
  | 'ENTRY'
  | 'CLEAR'
  | 'KISS'
  | 'ROGER'
  | 'STAND_BY'
  | 'WILCO'
  | 'CLEAR_COMMS'
  | 'SAY_AGAIN'
  | 'ON_ME'
  | 'MOVE_OUT'
  | 'SET_SECURITY'
  | 'SET'
  | 'GREEN'
  | 'SELF_CHECK'
  | 'WEAPON_DRY'
  | 'RELOADING'
  | 'CROSSING'
  | 'CEASE_FIRE'
  | 'CHECK_FIRE'
  | 'BREACH'
  | 'STACK'
  | 'SUPPRESS'
  | 'FLANK'
  | 'HOLD'
  | 'RETREAT'
  | 'DOWNED'
  | 'REVIVE'
  | 'EXTRACT'
  | 'OBJECTIVE_SECURED'
  | 'INTEL_MARKER'
  | 'THREAT_UPDATE';

export interface SpatialLocation {
  system?: string;
  body?: string;
  region?: string;
  site?: string;
}

export interface LocationEstimateSource {
  sourceId: string;
  sourceType: 'COMMS_CALL' | 'MANUAL_MARKER' | 'SENSOR_PROXY' | 'INTEL_REPORT' | 'COMMAND_NOTE' | 'MOBILE_GPS' | 'AR_ANCHOR';
  observedAt: string;
  confidence: number;
  notes?: string;
}

/**
 * CQB event truth record. This is event-sourced state input, not UI state.
 */
export interface CqbEvent {
  id: string;
  opId?: string;
  variantId: string;
  channelId?: string;
  authorId: string;
  eventType: CqbEventType;
  payload: Record<string, unknown>;
  confidence: number;
  ttlSeconds: number;
  createdAt: string;
}

/**
 * Command intent for directive-level coordination under uncertainty.
 */
export interface CommandIntent {
  id: string;
  issuerId: string;
  scope: CommandScope;
  spatialAnchor?: SpatialLocation;
  intentType: IntentType;
  parameters: Record<string, unknown>;
  authorityLevel: AuthorityLevel;
  ttlSeconds: number;
  createdAt: string;
}

/**
 * Best-known location estimate for a subject at a point in time.
 */
export interface LocationEstimate {
  subjectId: string;
  bestGuessLocation: SpatialLocation;
  confidence: number;
  sources: LocationEstimateSource[];
  mode: TruthMode;
  updatedAt: string;
  ttlSeconds: number;
  visibilityScope: VisibilityScope;
}

export function isValidConfidence(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

export function isStaleAt(timestamp: string, ttlSeconds: number, nowMs = Date.now()): boolean {
  const created = new Date(timestamp).getTime();
  if (!Number.isFinite(created)) return true;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return true;
  return created + ttlSeconds * 1000 <= nowMs;
}

export function clampConfidence(confidence: number, fallback = 0.5): number {
  if (!Number.isFinite(confidence)) return fallback;
  if (confidence < 0) return 0;
  if (confidence > 1) return 1;
  return confidence;
}
