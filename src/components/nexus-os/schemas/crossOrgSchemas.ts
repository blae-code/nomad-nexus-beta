/**
 * Cross-Organization and Outreach Schemas
 *
 * Guardrails:
 * - Cross-org access is opt-in and operation-scoped by default.
 * - Classification gates are explicit and must be checked before sharing.
 * - Public outreach entries are sanitized artifacts, not raw operational logs.
 */

export type OrgKind = 'PRIMARY' | 'ALLY' | 'PUBLIC_PARTNER' | 'TEMP_TASK_FORCE';
export type AllianceStatus = 'PROPOSED' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISSOLVED';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
export type DataClassification = 'INTERNAL' | 'ALLIED' | 'PUBLIC';
export type OutreachAudience = 'PUBLIC' | 'ALLIED' | 'INTERNAL';
export type OutreachPublishStatus = 'DRAFT' | 'PUBLISHED' | 'PENDING_EXTERNAL' | 'FAILED_EXTERNAL' | 'ARCHIVED';

export interface OrganizationProfile {
  id: string;
  name: string;
  shortTag: string;
  kind: OrgKind;
  description?: string;
  contactHandle?: string;
  visibilityDefault: DataClassification;
  createdAt: string;
  updatedAt: string;
}

export interface OrgAlliance {
  id: string;
  requesterOrgId: string;
  partnerOrgId: string;
  allianceName: string;
  status: AllianceStatus;
  terms?: string;
  sharedChannelIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationInvite {
  id: string;
  opId: string;
  hostOrgId: string;
  targetOrgId: string;
  status: InviteStatus;
  message?: string;
  classification: DataClassification;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  respondedBy?: string;
  respondedAt?: string;
}

export interface GuestOperationAccess {
  id: string;
  opId: string;
  hostOrgId: string;
  guestOrgId: string;
  allowedUserIds: string[];
  allowedChannelIds: string[];
  classification: DataClassification;
  grantedBy: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface SharedOperationChannel {
  id: string;
  opId: string;
  hostOrgId: string;
  partnerOrgIds: string[];
  channelLabel: string;
  isEmergency: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PublicUpdate {
  id: string;
  slug: string;
  orgId: string;
  opId?: string;
  title: string;
  body: string;
  audience: OutreachAudience;
  classification: DataClassification;
  publishStatus: OutreachPublishStatus;
  publishedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sourceRefs: Array<{ kind: string; id: string }>;
  warnings: string[];
}

export interface EmergencyBroadcast {
  id: string;
  originOrgId: string;
  targetOrgIds: string[];
  opId?: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: string;
  acknowledgedBy: string[];
}

export interface CrossOrgPermissionResult {
  allowed: boolean;
  reason: string;
  classification: DataClassification;
}

