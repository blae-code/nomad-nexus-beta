/**
 * Cross-Organization and Outreach Service (MVP in-memory adapter)
 *
 * Purpose:
 * - Model alliances and operation invite flows across organizations.
 * - Enforce scoped guest access for joint operations.
 * - Provide outreach/public update artifacts with sanitization and publish state.
 *
 * Guardrails:
 * - Cross-org access defaults to least privilege and operation scope only.
 * - Classification gates are enforced before returning shared/public data.
 * - Emergency broadcast is explicit and auditable.
 */

import type {
  AllianceStatus,
  CrossOrgPermissionResult,
  DataClassification,
  EmergencyBroadcast,
  GuestOperationAccess,
  OperationInvite,
  OrganizationProfile,
  OrgAlliance,
  OutreachAudience,
  PublicUpdate,
  SharedOperationChannel,
} from '../schemas/crossOrgSchemas';
import { getOperationById, listOperationsForOrg, updateOperation } from './operationService';

export interface OrganizationCreateInput {
  name: string;
  shortTag: string;
  kind?: OrganizationProfile['kind'];
  description?: string;
  contactHandle?: string;
  visibilityDefault?: DataClassification;
}

export interface OrgAllianceCreateInput {
  requesterOrgId: string;
  partnerOrgId: string;
  allianceName: string;
  terms?: string;
  createdBy: string;
}

export interface OperationInviteCreateInput {
  opId: string;
  hostOrgId: string;
  targetOrgId: string;
  message?: string;
  classification?: DataClassification;
  expiresAt?: string;
  createdBy: string;
}

export interface GuestOperationAccessInput {
  opId: string;
  hostOrgId: string;
  guestOrgId: string;
  allowedUserIds?: string[];
  allowedChannelIds?: string[];
  classification?: DataClassification;
  grantedBy: string;
}

export interface SharedChannelCreateInput {
  opId: string;
  hostOrgId: string;
  partnerOrgIds: string[];
  channelLabel: string;
  isEmergency?: boolean;
  createdBy: string;
}

export interface PublicUpdateCreateInput {
  orgId: string;
  opId?: string;
  title: string;
  body: string;
  audience?: OutreachAudience;
  classification?: DataClassification;
  createdBy: string;
  sourceRefs?: PublicUpdate['sourceRefs'];
}

export interface EmergencyBroadcastCreateInput {
  originOrgId: string;
  targetOrgIds?: string[];
  opId?: string;
  title: string;
  message: string;
  createdBy: string;
}

export interface PublicUpdateFilters {
  orgId?: string;
  opId?: string;
  publishStatus?: PublicUpdate['publishStatus'];
  audience?: OutreachAudience;
}

export interface OperationInviteFilters {
  opId?: string;
  hostOrgId?: string;
  targetOrgId?: string;
  status?: OperationInvite['status'];
}

type CrossOrgListener = (state: {
  organizations: OrganizationProfile[];
  alliances: OrgAlliance[];
  invites: OperationInvite[];
  guestAccess: GuestOperationAccess[];
  sharedChannels: SharedOperationChannel[];
  publicUpdates: PublicUpdate[];
  broadcasts: EmergencyBroadcast[];
}) => void;

let organizationsStore: OrganizationProfile[] = [];
let alliancesStore: OrgAlliance[] = [];
let operationInviteStore: OperationInvite[] = [];
let guestOperationAccessStore: GuestOperationAccess[] = [];
let sharedChannelsStore: SharedOperationChannel[] = [];
let publicUpdatesStore: PublicUpdate[] = [];
let broadcastsStore: EmergencyBroadcast[] = [];
const listeners = new Set<CrossOrgListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUnique(values: string[] = []): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function sortByUpdated<T extends { updatedAt?: string; createdAt: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });
}

function sortByCreated<T extends { createdAt: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const byTime = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function notifyListeners() {
  const snapshot = {
    organizations: sortByUpdated(organizationsStore),
    alliances: sortByUpdated(alliancesStore),
    invites: sortByUpdated(operationInviteStore),
    guestAccess: sortByUpdated(guestOperationAccessStore),
    sharedChannels: sortByCreated(sharedChannelsStore),
    publicUpdates: sortByUpdated(publicUpdatesStore),
    broadcasts: sortByCreated(broadcastsStore),
  };
  for (const listener of listeners) listener(snapshot);
}

function getAllianceStatusRank(status: AllianceStatus): number {
  if (status === 'ACTIVE') return 5;
  if (status === 'PENDING') return 4;
  if (status === 'PROPOSED') return 3;
  if (status === 'SUSPENDED') return 2;
  return 1;
}

function sanitizePublicBody(body: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];
  let sanitized = String(body || '').trim();
  if (!sanitized) return { sanitized: 'No details provided.', warnings: ['Public update body was empty.'] };

  // Redact precise coordinate-like tuples.
  const coordinatePattern = /(-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,})/g;
  if (coordinatePattern.test(sanitized)) {
    sanitized = sanitized.replace(coordinatePattern, '[REDACTED_COORDINATES]');
    warnings.push('Potential precise coordinates were redacted.');
  }

  // Redact direct op IDs to avoid easy internal lookup leakage.
  const opIdPattern = /\bop_[a-z0-9_]+\b/gi;
  if (opIdPattern.test(sanitized)) {
    sanitized = sanitized.replace(opIdPattern, '[REDACTED_OPERATION_ID]');
    warnings.push('Internal operation identifiers were redacted.');
  }

  return { sanitized, warnings };
}

function hasActiveAlliance(orgA: string, orgB: string): boolean {
  return alliancesStore.some((alliance) => {
    if (alliance.status !== 'ACTIVE') return false;
    const pairMatches =
      (alliance.requesterOrgId === orgA && alliance.partnerOrgId === orgB) ||
      (alliance.requesterOrgId === orgB && alliance.partnerOrgId === orgA);
    return pairMatches;
  });
}

function resolveClassification(base: DataClassification | undefined, fallback: DataClassification): DataClassification {
  return base || fallback;
}

export function registerOrganization(input: OrganizationCreateInput, nowMs = Date.now()): OrganizationProfile {
  const name = String(input.name || '').trim();
  const shortTag = String(input.shortTag || '').trim().toUpperCase();
  if (!name) throw new Error('Organization name is required');
  if (!shortTag) throw new Error('Organization shortTag is required');

  const existing = organizationsStore.find(
    (organization) => organization.shortTag === shortTag || organization.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    const updated: OrganizationProfile = {
      ...existing,
      name,
      kind: input.kind || existing.kind,
      description: input.description?.trim() || existing.description,
      contactHandle: input.contactHandle?.trim() || existing.contactHandle,
      visibilityDefault: input.visibilityDefault || existing.visibilityDefault,
      updatedAt: nowIso(nowMs),
    };
    organizationsStore = sortByUpdated(organizationsStore.map((org) => (org.id === existing.id ? updated : org)));
    notifyListeners();
    return updated;
  }

  const created: OrganizationProfile = {
    id: createId('org', nowMs),
    name,
    shortTag,
    kind: input.kind || 'ALLY',
    description: input.description?.trim(),
    contactHandle: input.contactHandle?.trim(),
    visibilityDefault: input.visibilityDefault || 'INTERNAL',
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  organizationsStore = sortByUpdated([created, ...organizationsStore]);
  notifyListeners();
  return created;
}

export function listOrganizations(): OrganizationProfile[] {
  return sortByUpdated(organizationsStore);
}

export function getOrganizationById(orgId: string): OrganizationProfile | null {
  return organizationsStore.find((organization) => organization.id === orgId) || null;
}

export function createAlliance(input: OrgAllianceCreateInput, nowMs = Date.now()): OrgAlliance {
  if (input.requesterOrgId === input.partnerOrgId) {
    throw new Error('Requester and partner orgs must differ');
  }
  if (!getOrganizationById(input.requesterOrgId) || !getOrganizationById(input.partnerOrgId)) {
    throw new Error('Both organizations must exist before creating an alliance');
  }

  const existing = alliancesStore.find(
    (alliance) =>
      (alliance.requesterOrgId === input.requesterOrgId && alliance.partnerOrgId === input.partnerOrgId) ||
      (alliance.requesterOrgId === input.partnerOrgId && alliance.partnerOrgId === input.requesterOrgId)
  );

  if (existing) {
    const nextStatus = getAllianceStatusRank(existing.status) >= getAllianceStatusRank('PENDING')
      ? existing.status
      : 'PENDING';
    const updated: OrgAlliance = {
      ...existing,
      allianceName: input.allianceName.trim() || existing.allianceName,
      terms: input.terms?.trim() || existing.terms,
      status: nextStatus,
      updatedAt: nowIso(nowMs),
    };
    alliancesStore = sortByUpdated(alliancesStore.map((alliance) => (alliance.id === existing.id ? updated : alliance)));
    notifyListeners();
    return updated;
  }

  const created: OrgAlliance = {
    id: createId('alliance', nowMs),
    requesterOrgId: input.requesterOrgId,
    partnerOrgId: input.partnerOrgId,
    allianceName: input.allianceName.trim() || 'Untitled Alliance',
    status: 'PENDING',
    terms: input.terms?.trim(),
    sharedChannelIds: [],
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  alliancesStore = sortByUpdated([created, ...alliancesStore]);
  notifyListeners();
  return created;
}

export function respondAlliance(
  allianceId: string,
  responderOrgId: string,
  decision: 'ACCEPT' | 'SUSPEND' | 'DISSOLVE',
  nowMs = Date.now()
): OrgAlliance {
  const existing = alliancesStore.find((alliance) => alliance.id === allianceId);
  if (!existing) throw new Error(`Alliance ${allianceId} not found`);
  if (![existing.requesterOrgId, existing.partnerOrgId].includes(responderOrgId)) {
    throw new Error('Responder org is not part of this alliance');
  }
  const status: AllianceStatus =
    decision === 'ACCEPT' ? 'ACTIVE' : decision === 'SUSPEND' ? 'SUSPENDED' : 'DISSOLVED';
  const updated: OrgAlliance = {
    ...existing,
    status,
    updatedAt: nowIso(nowMs),
  };
  alliancesStore = sortByUpdated(alliancesStore.map((alliance) => (alliance.id === allianceId ? updated : alliance)));
  notifyListeners();
  return updated;
}

export function listAlliancesForOrg(orgId: string, includeInactive = true): OrgAlliance[] {
  return sortByUpdated(alliancesStore).filter((alliance) => {
    const involved = alliance.requesterOrgId === orgId || alliance.partnerOrgId === orgId;
    if (!involved) return false;
    if (includeInactive) return true;
    return alliance.status === 'ACTIVE' || alliance.status === 'PENDING';
  });
}

export function sendOperationInvite(input: OperationInviteCreateInput, nowMs = Date.now()): OperationInvite {
  const operation = getOperationById(input.opId);
  if (!operation) throw new Error(`Operation ${input.opId} not found`);
  if (!hasActiveAlliance(input.hostOrgId, input.targetOrgId)) {
    throw new Error('No active alliance between host and target org');
  }

  const classification = resolveClassification(input.classification, operation.classification || 'INTERNAL');
  const created: OperationInvite = {
    id: createId('op_invite', nowMs),
    opId: input.opId,
    hostOrgId: input.hostOrgId,
    targetOrgId: input.targetOrgId,
    status: 'PENDING',
    message: input.message?.trim(),
    classification,
    expiresAt: input.expiresAt,
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
  };
  operationInviteStore = sortByUpdated([created, ...operationInviteStore]);

  // Keep operation invited org scope in sync for visibility filtering.
  try {
    updateOperation(
      input.opId,
      {
        invitedOrgIds: normalizeUnique([...(operation.invitedOrgIds || []), input.targetOrgId]),
        classification,
      },
      input.createdBy,
      nowMs
    );
  } catch {
    // Non-fatal: cross-org invite should still exist even if op update is blocked by permission.
  }

  notifyListeners();
  return created;
}

export function respondOperationInvite(
  inviteId: string,
  responderOrgId: string,
  decision: 'ACCEPT' | 'DECLINE',
  respondedBy: string,
  nowMs = Date.now()
): OperationInvite {
  const invite = operationInviteStore.find((entry) => entry.id === inviteId);
  if (!invite) throw new Error(`Invite ${inviteId} not found`);
  if (invite.targetOrgId !== responderOrgId) throw new Error('Responder org mismatch');
  if (invite.status !== 'PENDING') throw new Error('Invite is no longer pending');

  const status: OperationInvite['status'] = decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const updated: OperationInvite = {
    ...invite,
    status,
    respondedBy,
    respondedAt: nowIso(nowMs),
  };
  operationInviteStore = sortByUpdated(operationInviteStore.map((entry) => (entry.id === inviteId ? updated : entry)));

  if (status === 'ACCEPTED') {
    const existingGuest = guestOperationAccessStore.find(
      (entry) => entry.opId === invite.opId && entry.guestOrgId === invite.targetOrgId && !entry.revokedAt
    );
    if (!existingGuest) {
      guestOperationAccessStore = sortByUpdated([
        {
          id: createId('guest_access', nowMs),
          opId: invite.opId,
          hostOrgId: invite.hostOrgId,
          guestOrgId: invite.targetOrgId,
          allowedUserIds: [],
          allowedChannelIds: [],
          classification: invite.classification,
          grantedBy: respondedBy,
          grantedAt: nowIso(nowMs),
        },
        ...guestOperationAccessStore,
      ]);
    }
  }

  notifyListeners();
  return updated;
}

export function listOperationInvites(filters: OperationInviteFilters = {}): OperationInvite[] {
  return sortByUpdated(operationInviteStore).filter((invite) => {
    if (filters.opId && invite.opId !== filters.opId) return false;
    if (filters.hostOrgId && invite.hostOrgId !== filters.hostOrgId) return false;
    if (filters.targetOrgId && invite.targetOrgId !== filters.targetOrgId) return false;
    if (filters.status && invite.status !== filters.status) return false;
    return true;
  });
}

export function grantGuestOperationAccess(
  input: GuestOperationAccessInput,
  nowMs = Date.now()
): GuestOperationAccess {
  const operation = getOperationById(input.opId);
  if (!operation) throw new Error(`Operation ${input.opId} not found`);

  const existing = guestOperationAccessStore.find(
    (entry) => entry.opId === input.opId && entry.guestOrgId === input.guestOrgId && !entry.revokedAt
  );
  if (existing) {
    const updated: GuestOperationAccess = {
      ...existing,
      allowedUserIds: normalizeUnique([...(existing.allowedUserIds || []), ...(input.allowedUserIds || [])]),
      allowedChannelIds: normalizeUnique([...(existing.allowedChannelIds || []), ...(input.allowedChannelIds || [])]),
      classification: input.classification || existing.classification,
      grantedBy: input.grantedBy,
      grantedAt: nowIso(nowMs),
    };
    guestOperationAccessStore = sortByUpdated(
      guestOperationAccessStore.map((entry) => (entry.id === existing.id ? updated : entry))
    );
    notifyListeners();
    return updated;
  }

  const created: GuestOperationAccess = {
    id: createId('guest_access', nowMs),
    opId: input.opId,
    hostOrgId: input.hostOrgId,
    guestOrgId: input.guestOrgId,
    allowedUserIds: normalizeUnique(input.allowedUserIds || []),
    allowedChannelIds: normalizeUnique(input.allowedChannelIds || []),
    classification: input.classification || operation.classification || 'ALLIED',
    grantedBy: input.grantedBy,
    grantedAt: nowIso(nowMs),
  };
  guestOperationAccessStore = sortByUpdated([created, ...guestOperationAccessStore]);
  notifyListeners();
  return created;
}

export function revokeGuestOperationAccess(opId: string, guestOrgId: string, nowMs = Date.now()): number {
  let revokedCount = 0;
  guestOperationAccessStore = sortByUpdated(
    guestOperationAccessStore.map((entry) => {
      if (entry.opId !== opId || entry.guestOrgId !== guestOrgId || entry.revokedAt) return entry;
      revokedCount += 1;
      return { ...entry, revokedAt: nowIso(nowMs) };
    })
  );
  if (revokedCount > 0) notifyListeners();
  return revokedCount;
}

export function listGuestOperationAccess(opId?: string): GuestOperationAccess[] {
  const entries = sortByUpdated(guestOperationAccessStore).filter((entry) => !entry.revokedAt);
  if (!opId) return entries;
  return entries.filter((entry) => entry.opId === opId);
}

export function createSharedOperationChannel(
  input: SharedChannelCreateInput,
  nowMs = Date.now()
): SharedOperationChannel {
  const created: SharedOperationChannel = {
    id: createId('shared_channel', nowMs),
    opId: input.opId,
    hostOrgId: input.hostOrgId,
    partnerOrgIds: normalizeUnique(input.partnerOrgIds),
    channelLabel: input.channelLabel.trim() || `Joint-${input.opId}`,
    isEmergency: Boolean(input.isEmergency),
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
  };
  sharedChannelsStore = sortByCreated([created, ...sharedChannelsStore]);
  notifyListeners();
  return created;
}

export function listSharedOperationChannels(opId?: string): SharedOperationChannel[] {
  const rows = sortByCreated(sharedChannelsStore);
  if (!opId) return rows;
  return rows.filter((channel) => channel.opId === opId);
}

export function canAccessOperationContext(input: {
  opId: string;
  requesterOrgId?: string;
  requesterUserId?: string;
  requiredClassification?: DataClassification;
}): CrossOrgPermissionResult {
  const operation = getOperationById(input.opId);
  if (!operation) {
    return { allowed: false, reason: 'Operation not found.', classification: 'INTERNAL' };
  }
  const classification = operation.classification || 'INTERNAL';
  const required = input.requiredClassification || classification;

  if (!input.requesterOrgId) {
    return { allowed: false, reason: 'Organization context required.', classification };
  }
  if (operation.hostOrgId && operation.hostOrgId === input.requesterOrgId) {
    return { allowed: true, reason: 'Host organization access.', classification };
  }

  const invited = (operation.invitedOrgIds || []).includes(input.requesterOrgId);
  const hasGuestGrant = guestOperationAccessStore.some(
    (entry) =>
      entry.opId === input.opId &&
      entry.guestOrgId === input.requesterOrgId &&
      !entry.revokedAt &&
      (entry.allowedUserIds.length === 0 || (input.requesterUserId ? entry.allowedUserIds.includes(input.requesterUserId) : true))
  );
  if (!invited && !hasGuestGrant) {
    return { allowed: false, reason: 'Organization not invited to operation context.', classification };
  }

  const isAllowedByClassification =
    required === 'PUBLIC' ||
    (required === 'ALLIED' && classification !== 'INTERNAL') ||
    (required === 'INTERNAL' && operation.hostOrgId === input.requesterOrgId);

  if (!isAllowedByClassification) {
    return { allowed: false, reason: 'Classification gate denied.', classification };
  }

  return { allowed: true, reason: 'Guest operation scope access granted.', classification };
}

export function createPublicUpdate(input: PublicUpdateCreateInput, nowMs = Date.now()): PublicUpdate {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  if (!title) throw new Error('Public update title is required');
  if (!body) throw new Error('Public update body is required');

  const audience = input.audience || 'PUBLIC';
  const classification = input.classification || (audience === 'PUBLIC' ? 'PUBLIC' : 'ALLIED');
  const { sanitized, warnings } = sanitizePublicBody(body);

  const publishStatus: PublicUpdate['publishStatus'] =
    classification === 'INTERNAL' ? 'DRAFT' : audience === 'PUBLIC' ? 'PUBLISHED' : 'DRAFT';
  if (classification === 'INTERNAL') {
    warnings.push('Internal classification cannot be published publicly.');
  }

  const created: PublicUpdate = {
    id: createId('public_update', nowMs),
    slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`,
    orgId: input.orgId,
    opId: input.opId,
    title,
    body: sanitized,
    audience,
    classification,
    publishStatus,
    publishedAt: publishStatus === 'PUBLISHED' ? nowIso(nowMs) : undefined,
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
    sourceRefs: [...(input.sourceRefs || [])],
    warnings,
  };
  publicUpdatesStore = sortByUpdated([created, ...publicUpdatesStore]);
  notifyListeners();
  return created;
}

export function publishPublicUpdate(updateId: string, nowMs = Date.now()): PublicUpdate {
  const existing = publicUpdatesStore.find((update) => update.id === updateId);
  if (!existing) throw new Error(`Public update ${updateId} not found`);
  if (existing.classification === 'INTERNAL') throw new Error('Internal update cannot be published');

  const updated: PublicUpdate = {
    ...existing,
    publishStatus: 'PUBLISHED',
    publishedAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  publicUpdatesStore = sortByUpdated(publicUpdatesStore.map((update) => (update.id === updateId ? updated : update)));
  notifyListeners();
  return updated;
}

export function markPublicUpdateExternalFailure(updateId: string, reason: string, nowMs = Date.now()): PublicUpdate {
  const existing = publicUpdatesStore.find((update) => update.id === updateId);
  if (!existing) throw new Error(`Public update ${updateId} not found`);
  const updated: PublicUpdate = {
    ...existing,
    publishStatus: 'FAILED_EXTERNAL',
    warnings: normalizeUnique([...(existing.warnings || []), reason || 'External publish failed.']),
    updatedAt: nowIso(nowMs),
  };
  publicUpdatesStore = sortByUpdated(publicUpdatesStore.map((update) => (update.id === updateId ? updated : update)));
  notifyListeners();
  return updated;
}

export function listPublicUpdates(filters: PublicUpdateFilters = {}): PublicUpdate[] {
  return sortByUpdated(publicUpdatesStore).filter((update) => {
    if (filters.orgId && update.orgId !== filters.orgId) return false;
    if (filters.opId && update.opId !== filters.opId) return false;
    if (filters.publishStatus && update.publishStatus !== filters.publishStatus) return false;
    if (filters.audience && update.audience !== filters.audience) return false;
    return true;
  });
}

export function getPublicUpdateBySlug(slug: string): PublicUpdate | null {
  const entry = publicUpdatesStore.find((update) => update.slug === slug) || null;
  if (!entry) return null;
  if (entry.publishStatus !== 'PUBLISHED') return null;
  if (entry.audience !== 'PUBLIC') return null;
  if (entry.classification !== 'PUBLIC') return null;
  return entry;
}

export function createEmergencyBroadcast(
  input: EmergencyBroadcastCreateInput,
  nowMs = Date.now()
): EmergencyBroadcast {
  const targetOrgIds =
    input.targetOrgIds && input.targetOrgIds.length > 0
      ? normalizeUnique(input.targetOrgIds)
      : normalizeUnique(
          listAlliancesForOrg(input.originOrgId, false).map((alliance) =>
            alliance.requesterOrgId === input.originOrgId ? alliance.partnerOrgId : alliance.requesterOrgId
          )
        );
  const created: EmergencyBroadcast = {
    id: createId('emergency_broadcast', nowMs),
    originOrgId: input.originOrgId,
    targetOrgIds,
    opId: input.opId,
    title: input.title.trim() || 'Emergency Broadcast',
    message: input.message.trim() || 'Mutual aid requested.',
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    acknowledgedBy: [],
  };
  broadcastsStore = sortByCreated([created, ...broadcastsStore]);
  notifyListeners();
  return created;
}

export function acknowledgeEmergencyBroadcast(
  broadcastId: string,
  orgId: string,
  nowMs = Date.now()
): EmergencyBroadcast {
  const existing = broadcastsStore.find((broadcast) => broadcast.id === broadcastId);
  if (!existing) throw new Error(`Broadcast ${broadcastId} not found`);
  const updated: EmergencyBroadcast = {
    ...existing,
    acknowledgedBy: normalizeUnique([...(existing.acknowledgedBy || []), orgId]),
    createdAt: existing.createdAt || nowIso(nowMs),
  };
  broadcastsStore = sortByCreated(broadcastsStore.map((broadcast) => (broadcast.id === broadcastId ? updated : broadcast)));
  notifyListeners();
  return updated;
}

export function listEmergencyBroadcasts(orgId?: string): EmergencyBroadcast[] {
  const rows = sortByCreated(broadcastsStore);
  if (!orgId) return rows;
  return rows.filter((broadcast) => broadcast.originOrgId === orgId || broadcast.targetOrgIds.includes(orgId));
}

export function listJointOperationsForOrg(orgId: string): ReturnType<typeof listOperationsForOrg> {
  return listOperationsForOrg(orgId, false).filter(
    (operation) =>
      operation.hostOrgId === orgId
        ? (operation.invitedOrgIds || []).length > 0
        : Boolean(operation.hostOrgId) && operation.hostOrgId !== orgId
  );
}

export function subscribeCrossOrg(listener: CrossOrgListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetCrossOrgServiceState() {
  organizationsStore = [];
  alliancesStore = [];
  operationInviteStore = [];
  guestOperationAccessStore = [];
  sharedChannelsStore = [];
  publicUpdatesStore = [];
  broadcastsStore = [];
  notifyListeners();
}

