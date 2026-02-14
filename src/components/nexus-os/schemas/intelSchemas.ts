/**
 * Collaborative Spatial Intel Schemas
 *
 * Doctrine:
 * - Intel is a hypothesis space and may contain contradictions.
 * - Every record must preserve provenance, confidence, and TTL/decay context.
 * - Promotions are governance actions and require auditable trails.
 */

export type IntelStratum = 'PERSONAL' | 'SHARED_COMMONS' | 'OPERATIONAL' | 'COMMAND_ASSESSED';
export type IntelType = 'PIN' | 'MARKER' | 'NOTE';
export type IntelConfidenceBand = 'LOW' | 'MED' | 'HIGH';

export type IntelScopeKind = 'PERSONAL' | 'ORG' | 'OP';

export interface IntelScope {
  kind: IntelScopeKind;
  opIds?: string[];
}

export interface IntelAnchor {
  nodeId: string;
  dx?: number;
  dy?: number;
}

export interface IntelPromotionHistoryEntry {
  from: IntelStratum;
  to: IntelStratum;
  by: string;
  at: string;
  reason?: string;
}

export interface IntelEndorsement {
  by: string;
  at: string;
  note?: string;
}

export interface IntelChallenge {
  by: string;
  at: string;
  note: string;
}

export interface IntelObject {
  id: string;
  type: IntelType;
  stratum: IntelStratum;
  scope: IntelScope;
  anchor: IntelAnchor;
  title: string;
  body: string;
  tags?: string[];
  confidence: IntelConfidenceBand;
  ttlProfileId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  retiredAt?: string;
  promotionHistory: IntelPromotionHistoryEntry[];
  endorsements: IntelEndorsement[];
  challenges: IntelChallenge[];
}

export interface IntelComment {
  id: string;
  intelId: string;
  by: string;
  at: string;
  body: string;
}

export type IntentDraftKind =
  | 'DECLARE_DEPARTURE'
  | 'DECLARE_ARRIVAL'
  | 'DECLARE_HOLD'
  | 'REPORT_CONTACT'
  | 'REQUEST_SITREP'
  | 'DROP_INTEL'
  | 'PLACE_MARKER'
  | 'ENDORSE_INTEL'
  | 'CHALLENGE_INTEL'
  | 'PROMOTE_INTEL'
  | 'LINK_INTEL_TO_OP'
  | 'RETIRE_INTEL'
  | 'ATTACH_INTEL'
  | 'REQUEST_PATROL'
  | 'MARK_AVOID';

export interface IntentDraftTarget {
  nodeId?: string;
  intelId?: string;
  zoneId?: string;
}

export type IntentDraftStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface IntentDraft {
  id: string;
  kind: IntentDraftKind;
  target: IntentDraftTarget;
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  status: IntentDraftStatus;
}

export function intelConfidenceToScore(confidence: IntelConfidenceBand): number {
  if (confidence === 'HIGH') return 0.85;
  if (confidence === 'MED') return 0.6;
  return 0.35;
}
