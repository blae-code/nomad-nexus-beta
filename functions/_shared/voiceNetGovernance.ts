import { isAdminMember } from './memberAuth.ts';

export type VoiceNetLifecycleScope = 'permanent' | 'temp_adhoc' | 'temp_operation';

const DEFAULT_SYSTEM_ADMIN_IDENTIFIERS = ['blae@katrasoluta.com'];
const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'operations', 'comms', 'communications']);
const CLOSED_NET_STATUSES = new Set(['closed', 'inactive', 'archived', 'deleted', 'merged', 'retired']);

function normalizeIdentifier(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function collectActorIdentifiers(actor: any): string[] {
  if (!actor) return [];
  const identifiers = [
    actor?.email,
    actor?.full_name,
    actor?.callsign,
    actor?.display_callsign,
    actor?.login_callsign,
    actor?.username,
  ]
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
  return Array.from(new Set(identifiers));
}

function getSystemAdminIdentifierSet() {
  const configured = String(Deno.env.get('SYSTEM_ADMIN_IDENTIFIERS') || '');
  const configuredList = configured
    .split(',')
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
  return new Set([
    ...DEFAULT_SYSTEM_ADMIN_IDENTIFIERS.map((entry) => normalizeIdentifier(entry)),
    ...configuredList,
  ]);
}

export function hasSystemAdminIdentity(actor: any): boolean {
  if (!actor) return false;
  const allowlist = getSystemAdminIdentifierSet();
  const identifiers = collectActorIdentifiers(actor);
  return identifiers.some((entry) => allowlist.has(entry));
}

export function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function toIso(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toUpper(value: unknown): string {
  return text(value).toUpperCase();
}

export function toLower(value: unknown): string {
  return text(value).toLowerCase();
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const token = toLower(value);
  if (!token) return false;
  if (token === 'true' || token === 'yes' || token === 'on' || token === '1') return true;
  if (token === 'false' || token === 'no' || token === 'off' || token === '0') return false;
  return false;
}

export function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

export function resolveVoiceNetActorAuthority(input: {
  actorType: 'admin' | 'member' | null;
  adminUser: any;
  memberProfile: any;
}) {
  const rank = toUpper(input.memberProfile?.rank);
  const roles = Array.isArray(input.memberProfile?.roles)
    ? input.memberProfile.roles.map((entry: unknown) => toLower(entry))
    : [];
  const isPlatformAdmin = input.actorType === 'admin';
  const isAllowlistedAdmin = hasSystemAdminIdentity(input.adminUser) || hasSystemAdminIdentity(input.memberProfile);
  const isSystemAdmin = isPlatformAdmin || isAllowlistedAdmin;
  const isPioneer = rank === 'PIONEER';
  const hasGlobalOverride = isSystemAdmin || isPioneer;
  const isCommandStaff =
    hasGlobalOverride ||
    isAdminMember(input.memberProfile) ||
    COMMAND_RANKS.has(rank) ||
    roles.some((role) => COMMAND_ROLES.has(role));

  return {
    rank,
    roles,
    actorMemberId: text(input.memberProfile?.id) || null,
    isSystemAdmin,
    isPioneer,
    hasGlobalOverride,
    isCommandStaff,
  };
}

export async function listVoiceNets(base44: any): Promise<any[]> {
  if (base44?.entities?.VoiceNet?.list) {
    const rows = await base44.entities.VoiceNet.list('-created_date', 600).catch(() => []);
    if (Array.isArray(rows)) return rows;
  }
  if (base44?.entities?.VoiceNet?.filter) {
    const rows = await base44.entities.VoiceNet.filter({}, '-created_date', 600).catch(() => []);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export async function getVoiceNet(base44: any, netId: string): Promise<any | null> {
  const normalizedId = text(netId);
  if (!normalizedId) return null;
  if (base44?.entities?.VoiceNet?.get) {
    const row = await base44.entities.VoiceNet.get(normalizedId).catch(() => null);
    if (row) return row;
  }
  if (base44?.entities?.VoiceNet?.filter) {
    const rows = await base44.entities.VoiceNet.filter({ id: normalizedId }).catch(() => []);
    if (rows?.[0]) return rows[0];
  }
  const all = await listVoiceNets(base44);
  return all.find((entry) => text(entry?.id) === normalizedId || text(entry?.code) === normalizedId) || null;
}

async function createFirstSuccessful(entity: any, attempts: Record<string, unknown>[]) {
  let lastError: any = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

async function updateFirstSuccessful(entity: any, id: string, attempts: Record<string, unknown>[]) {
  let lastError: any = null;
  for (const payload of attempts) {
    try {
      return await entity.update(id, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Update failed');
}

export function readLifecycleScope(net: any): VoiceNetLifecycleScope {
  const scope = toLower(net?.lifecycle_scope || net?.lifecycleScope || net?.scope);
  if (scope === 'permanent') return 'permanent';
  if (scope === 'temp_operation' || scope === 'operation' || scope === 'op') return 'temp_operation';
  if (scope === 'temp_adhoc' || scope === 'adhoc' || scope === 'temporary') return 'temp_adhoc';
  const eventId = text(net?.event_id || net?.eventId);
  if (eventId) return 'temp_operation';
  const temporary =
    toBoolean(net?.is_temporary) || toBoolean(net?.temporary) || toBoolean(net?.isTemporary) || toBoolean(net?.is_temp);
  return temporary ? 'temp_adhoc' : 'permanent';
}

export function readOwnerMemberId(net: any): string | null {
  const owner =
    text(net?.owner_member_profile_id) ||
    text(net?.ownerMemberProfileId) ||
    text(net?.owner_id) ||
    text(net?.created_by_member_profile_id) ||
    text(net?.createdByMemberProfileId);
  return owner || null;
}

export function readCleanupGraceMinutes(net: any, fallback = 5): number {
  const raw = Number(net?.cleanup_grace_minutes || net?.cleanupGraceMinutes);
  if (Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  return fallback;
}

export function readPlannedActivationAt(net: any): string | null {
  return toIso(net?.planned_activation_at || net?.plannedActivationAt);
}

export function isTemporaryNet(net: any): boolean {
  if (!net) return false;
  if (toBoolean(net?.is_temporary) || toBoolean(net?.temporary) || toBoolean(net?.isTemporary) || toBoolean(net?.is_temp)) {
    return true;
  }
  const scope = readLifecycleScope(net);
  return scope === 'temp_adhoc' || scope === 'temp_operation';
}

export function isClosedNetStatus(statusValue: unknown): boolean {
  const status = toLower(statusValue);
  return CLOSED_NET_STATUSES.has(status);
}

export function isNetActive(net: any): boolean {
  return !isClosedNetStatus(net?.status);
}

export function normalizeVoiceNetForUi(net: any, policyOverrides: Partial<Record<string, unknown>> = {}) {
  const scope = (policyOverrides.lifecycle_scope as string) || readLifecycleScope(net);
  const owner = (policyOverrides.owner_member_profile_id as string) || readOwnerMemberId(net);
  const temporary =
    typeof policyOverrides.temporary === 'boolean' ? Boolean(policyOverrides.temporary) : isTemporaryNet({ ...net, ...policyOverrides });
  const status = text(policyOverrides.status || net?.status || 'active').toLowerCase();
  return {
    id: text(net?.id),
    code: text(net?.code),
    label: text(net?.label || net?.name),
    type: text(net?.type || 'general'),
    discipline: text(net?.discipline || 'casual').toLowerCase(),
    priority: toNumber(policyOverrides.priority ?? net?.priority, 3),
    status,
    lifecycle_scope: scope,
    temporary,
    owner_member_profile_id: owner || null,
    event_id: text(policyOverrides.event_id || net?.event_id || net?.eventId) || null,
    planned_activation_at: text(policyOverrides.planned_activation_at || readPlannedActivationAt(net)) || null,
    cleanup_grace_minutes: toNumber(policyOverrides.cleanup_grace_minutes || readCleanupGraceMinutes(net), 5),
    updated_at: text(policyOverrides.updated_at || net?.updated_date || net?.created_date) || null,
    raw: net,
  };
}

export async function createVoiceNet(base44: any, payload: Record<string, unknown>) {
  if (!base44?.entities?.VoiceNet?.create) {
    throw new Error('VoiceNet entity unavailable');
  }

  const normalizedScope = text(payload.lifecycle_scope || payload.lifecycleScope) || 'permanent';
  const normalizedTemporary = toBoolean(payload.is_temporary ?? payload.temporary ?? payload.isTemporary ?? (normalizedScope !== 'permanent'));

  const basePayload = {
    ...payload,
    lifecycle_scope: normalizedScope,
    is_temporary: normalizedTemporary,
    temporary: normalizedTemporary,
    isTemporary: normalizedTemporary,
    owner_member_profile_id: text(payload.owner_member_profile_id || payload.ownerMemberProfileId) || undefined,
    planned_activation_at: toIso(payload.planned_activation_at || payload.plannedActivationAt) || undefined,
    cleanup_grace_minutes: toNumber(payload.cleanup_grace_minutes || payload.cleanupGraceMinutes, 5),
  };

  return createFirstSuccessful(base44.entities.VoiceNet, [
    basePayload,
    {
      code: basePayload.code,
      label: basePayload.label,
      type: basePayload.type,
      discipline: basePayload.discipline,
      status: basePayload.status,
      priority: basePayload.priority,
      event_id: basePayload.event_id,
      is_temporary: basePayload.is_temporary,
      temporary: basePayload.temporary,
      lifecycle_scope: basePayload.lifecycle_scope,
      owner_member_profile_id: basePayload.owner_member_profile_id,
      planned_activation_at: basePayload.planned_activation_at,
      cleanup_grace_minutes: basePayload.cleanup_grace_minutes,
      min_rank_to_tx: basePayload.min_rank_to_tx,
      min_rank_to_rx: basePayload.min_rank_to_rx,
      stage_mode: basePayload.stage_mode,
    },
    {
      code: basePayload.code,
      label: basePayload.label,
      type: basePayload.type,
      status: basePayload.status,
      priority: basePayload.priority,
      event_id: basePayload.event_id,
      temporary: basePayload.temporary,
    },
  ]);
}

export async function updateVoiceNet(base44: any, netId: string, payload: Record<string, unknown>) {
  if (!base44?.entities?.VoiceNet?.update) {
    throw new Error('VoiceNet entity unavailable');
  }
  const normalizedScope = text(payload.lifecycle_scope || payload.lifecycleScope);
  const normalizedTemporary =
    Object.prototype.hasOwnProperty.call(payload, 'is_temporary') ||
    Object.prototype.hasOwnProperty.call(payload, 'temporary') ||
    Object.prototype.hasOwnProperty.call(payload, 'isTemporary')
      ? toBoolean(payload.is_temporary ?? payload.temporary ?? payload.isTemporary)
      : undefined;

  const basePayload: Record<string, unknown> = {
    ...payload,
  };
  if (normalizedScope) basePayload.lifecycle_scope = normalizedScope;
  if (typeof normalizedTemporary === 'boolean') {
    basePayload.is_temporary = normalizedTemporary;
    basePayload.temporary = normalizedTemporary;
    basePayload.isTemporary = normalizedTemporary;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'planned_activation_at') || Object.prototype.hasOwnProperty.call(payload, 'plannedActivationAt')) {
    basePayload.planned_activation_at = toIso(payload.planned_activation_at || payload.plannedActivationAt);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'cleanup_grace_minutes') || Object.prototype.hasOwnProperty.call(payload, 'cleanupGraceMinutes')) {
    basePayload.cleanup_grace_minutes = toNumber(payload.cleanup_grace_minutes || payload.cleanupGraceMinutes, 5);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'owner_member_profile_id') || Object.prototype.hasOwnProperty.call(payload, 'ownerMemberProfileId')) {
    basePayload.owner_member_profile_id = text(payload.owner_member_profile_id || payload.ownerMemberProfileId) || null;
  }

  return updateFirstSuccessful(base44.entities.VoiceNet, netId, [
    basePayload,
    {
      status: basePayload.status,
      label: basePayload.label,
      type: basePayload.type,
      discipline: basePayload.discipline,
      priority: basePayload.priority,
      owner_member_profile_id: basePayload.owner_member_profile_id,
      planned_activation_at: basePayload.planned_activation_at,
      cleanup_grace_minutes: basePayload.cleanup_grace_minutes,
      lifecycle_scope: basePayload.lifecycle_scope,
      temporary: basePayload.temporary,
      is_temporary: basePayload.is_temporary,
    },
  ]);
}

export async function getEvent(base44: any, eventId: string) {
  const normalized = text(eventId);
  if (!normalized || !base44?.entities?.Event) return null;
  if (base44.entities.Event.get) {
    const byGet = await base44.entities.Event.get(normalized).catch(() => null);
    if (byGet) return byGet;
  }
  if (base44.entities.Event.filter) {
    const rows = await base44.entities.Event.filter({ id: normalized }).catch(() => []);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

export async function listEvents(base44: any): Promise<any[]> {
  if (base44?.entities?.Event?.list) {
    const rows = await base44.entities.Event.list('-start_time', 600).catch(() => []);
    if (Array.isArray(rows)) return rows;
  }
  if (base44?.entities?.Event?.filter) {
    const rows = await base44.entities.Event.filter({}, '-start_time', 600).catch(() => []);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export async function listEventDutyAssignments(base44: any, eventId: string): Promise<any[]> {
  const normalized = text(eventId);
  if (!normalized || !base44?.entities?.EventDutyAssignment) return [];
  if (base44.entities.EventDutyAssignment.filter) {
    return (await base44.entities.EventDutyAssignment.filter({ event_id: normalized }, '-created_date', 300).catch(() => [])) || [];
  }
  if (base44.entities.EventDutyAssignment.list) {
    const rows = await base44.entities.EventDutyAssignment.list('-created_date', 600).catch(() => []);
    return (rows || []).filter((entry: any) => text(entry?.event_id) === normalized);
  }
  return [];
}

export function eventCreatorMemberId(event: any): string | null {
  const candidate =
    text(event?.host_id) ||
    text(event?.host_member_profile_id) ||
    text(event?.created_by_member_profile_id) ||
    text(event?.owner_member_profile_id) ||
    text(event?.created_by) ||
    text(event?.hostId);
  return candidate || null;
}

function roleAuthorityWeight(roleName: string): number {
  const token = toLower(roleName);
  if (!token) return 0;
  if (token.includes('fleet commander') || token.includes('commander')) return 90;
  if (token.includes('wing leader') || token.includes('wing commander')) return 80;
  if (token.includes('squad leader') || token.includes('squad commander')) return 70;
  if (token.includes('operations') || token.includes('command net')) return 65;
  if (token.includes('signal') || token.includes('radio') || token.includes('comms')) return 60;
  return 0;
}

export function hasOperationRoleAuthority(actorMemberId: string | null, assignments: any[]): boolean {
  const actor = text(actorMemberId);
  if (!actor) return false;
  return assignments.some((entry) => {
    const memberId = text(entry?.member_profile_id || entry?.user_id || entry?.memberProfileId);
    if (!memberId || memberId !== actor) return false;
    return roleAuthorityWeight(text(entry?.role_name || entry?.role || entry?.duty)) >= 60;
  });
}

export function canManageOperationNet(input: {
  hasGlobalOverride: boolean;
  actorMemberId: string | null;
  memberProfile: any;
  event: any;
  assignments: any[];
}) {
  if (input.hasGlobalOverride) return true;
  const actorMemberId = text(input.actorMemberId);
  if (!actorMemberId) return false;
  if (eventCreatorMemberId(input.event) === actorMemberId) return true;
  if (hasOperationRoleAuthority(actorMemberId, input.assignments)) return true;

  const rank = toUpper(input.memberProfile?.rank);
  if (rank === 'COMMANDER') return true;
  const roles = Array.isArray(input.memberProfile?.roles)
    ? input.memberProfile.roles.map((entry: unknown) => toLower(entry))
    : [];
  return roles.includes('command') || roles.includes('officer') || roles.includes('operations');
}

export async function listPresenceByNetId(base44: any): Promise<Record<string, any[]>> {
  const rows = base44?.entities?.UserPresence?.list
    ? await base44.entities.UserPresence.list('-last_activity', 1200).catch(() => [])
    : base44?.entities?.UserPresence?.filter
      ? await base44.entities.UserPresence.filter({}, '-last_activity', 1200).catch(() => [])
      : [];

  const byNet: Record<string, any[]> = {};
  for (const row of rows || []) {
    const netId = text(row?.net_id || row?.netId || row?.current_net?.id);
    if (!netId) continue;
    if (!byNet[netId]) byNet[netId] = [];
    byNet[netId].push(row);
  }
  return byNet;
}

export async function writeVoiceNetEventLog(
  base44: any,
  input: {
    type: string;
    summary: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
    eventId?: string | null;
    actorMemberProfileId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  if (!base44?.entities?.EventLog?.create) return null;
  const payload = {
    type: text(input.type) || 'VOICE_NET_POLICY_SET',
    severity: text(input.severity || 'LOW') || 'LOW',
    summary: text(input.summary) || 'Voice net policy update',
    ...(input.eventId ? { event_id: input.eventId } : {}),
    ...(input.actorMemberProfileId ? { actor_member_profile_id: input.actorMemberProfileId } : {}),
    details: input.details || {},
  };
  try {
    return await base44.entities.EventLog.create(payload);
  } catch {
    return await base44.entities.EventLog.create({
      type: payload.type,
      severity: payload.severity,
      summary: payload.summary,
      details: payload.details,
    }).catch(() => null);
  }
}

export async function listEventLogs(base44: any, limit = 3000): Promise<any[]> {
  if (!base44?.entities?.EventLog?.list) return [];
  const rows = await base44.entities.EventLog.list('-created_date', limit).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

function eventIdForLog(entry: any): string {
  return text(entry?.details?.event_id || entry?.event_id || entry?.related_entity_id);
}

function netIdForLog(entry: any): string {
  return text(entry?.details?.net_id || entry?.details?.voice_net_id || entry?.details?.id);
}

export function deriveVoiceNetPolicyFromLogs(net: any, logs: any[]) {
  const netId = text(net?.id);
  const scoped = (logs || [])
    .filter((entry) => {
      const entryNetId = netIdForLog(entry);
      return entryNetId && netId && entryNetId === netId;
    })
    .sort((a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime());

  const derived: Record<string, unknown> = {};
  for (const entry of scoped) {
    const type = toUpper(entry?.type);
    const details = entry?.details || {};
    if (type === 'VOICE_NET_POLICY_SET') {
      if (details.lifecycle_scope) derived.lifecycle_scope = text(details.lifecycle_scope);
      if (details.owner_member_profile_id) derived.owner_member_profile_id = text(details.owner_member_profile_id);
      if (Object.prototype.hasOwnProperty.call(details, 'temporary')) derived.temporary = Boolean(details.temporary);
      if (details.planned_activation_at) derived.planned_activation_at = text(details.planned_activation_at);
      if (details.cleanup_grace_minutes != null) derived.cleanup_grace_minutes = toNumber(details.cleanup_grace_minutes, 5);
      if (details.status) derived.status = toLower(details.status);
      if (details.event_id) derived.event_id = text(details.event_id);
    } else if (type === 'VOICE_NET_OWNER_TRANSFERRED') {
      if (details.to_owner_member_profile_id) derived.owner_member_profile_id = text(details.to_owner_member_profile_id);
      if (details.event_id) derived.event_id = text(details.event_id);
    } else if (type === 'VOICE_NET_OPERATION_PLANNED') {
      derived.lifecycle_scope = 'temp_operation';
      derived.temporary = true;
      if (details.planned_activation_at) derived.planned_activation_at = text(details.planned_activation_at);
      if (details.event_id) derived.event_id = text(details.event_id);
      derived.status = toLower(text(details.status || 'planned'));
    } else if (type === 'VOICE_NET_OPERATION_ACTIVATED') {
      derived.status = 'active';
      if (details.event_id) derived.event_id = text(details.event_id);
    } else if (type === 'VOICE_NET_LIFECYCLE_CLOSED') {
      derived.status = 'closed';
      if (details.event_id) derived.event_id = text(details.event_id);
    }
  }

  return derived;
}

export function deriveEventTypeToken(event: any): string {
  return toLower(event?.event_type || event?.type || 'casual') || 'casual';
}

export function deriveOperationRecommendedNets(event: any): Array<{ code: string; label: string; type: string; discipline: string; priority: number }> {
  const eventType = deriveEventTypeToken(event);
  const focused = eventType === 'focused' || eventType === 'combat' || eventType === 'raid';
  const discipline = focused ? 'focused' : 'casual';

  const titleToken = text(event?.title || event?.id || 'OP').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const prefix = (titleToken || 'OP').slice(0, 8) || 'OP';

  const defaults = [
    { code: `${prefix}-CMD`, label: 'Command Net', type: 'command', discipline, priority: 1 },
    { code: `${prefix}-OPS`, label: 'Operations Net', type: 'squad', discipline, priority: 2 },
    { code: `${prefix}-FLT`, label: 'Flight Net', type: 'squad', discipline, priority: 2 },
    { code: `${prefix}-SUP`, label: 'Support Net', type: 'support', discipline: focused ? 'focused' : 'casual', priority: 3 },
  ];

  const rawPref =
    (Array.isArray(event?.voice_net_preferences) && event.voice_net_preferences) ||
    (Array.isArray(event?.voice_preferences?.nets) && event.voice_preferences.nets) ||
    (Array.isArray(event?.comms_preferences?.nets) && event.comms_preferences.nets) ||
    [];

  const preferredRows = (rawPref || [])
    .map((entry: any, index: number) => {
      const code = text(entry?.code || `${prefix}-P${index + 1}`).toUpperCase();
      const label = text(entry?.label || entry?.name || `Preferred ${index + 1}`);
      const type = toLower(entry?.type || 'squad');
      const priority = Math.max(1, Math.min(3, toNumber(entry?.priority, 2)));
      const prefDiscipline = toLower(entry?.discipline || discipline) || discipline;
      return {
        code,
        label,
        type,
        discipline: prefDiscipline,
        priority,
      };
    })
    .filter((entry: any) => entry.code && entry.label)
    .slice(0, 8);

  if (preferredRows.length === 0) return defaults;

  const byCode = new Map<string, any>();
  for (const entry of defaults) byCode.set(entry.code, entry);
  for (const entry of preferredRows) byCode.set(entry.code, entry);
  return Array.from(byCode.values()).slice(0, 10);
}

export function plannedActivationForEvent(event: any): string | null {
  const start = toIso(event?.start_time || event?.startTime);
  if (!start) return null;
  return new Date(new Date(start).getTime() - 15 * 60 * 1000).toISOString();
}

export function eventEndForCleanup(event: any): string | null {
  const end = toIso(event?.end_time || event?.endTime);
  if (end) return end;
  const start = toIso(event?.start_time || event?.startTime);
  return start;
}

export function eventIsEnded(event: any, nowMs = Date.now()): boolean {
  const status = toLower(event?.status);
  if (status === 'completed' || status === 'cancelled' || status === 'aborted' || status === 'failed') return true;
  const end = eventEndForCleanup(event);
  if (!end) return false;
  return nowMs >= new Date(end).getTime();
}

export function uniqueNetCodeWithinScope(existing: any[], code: string, scope: VoiceNetLifecycleScope, eventId: string | null, ignoreNetId = ''): boolean {
  const normalizedCode = toUpper(code);
  const normalizedIgnore = text(ignoreNetId);
  return !existing.some((entry) => {
    const entryId = text(entry?.id);
    if (normalizedIgnore && entryId === normalizedIgnore) return false;
    const entryScope = readLifecycleScope(entry);
    if (entryScope !== scope) return false;
    if (scope === 'temp_operation') {
      const left = text(entry?.event_id || entry?.eventId);
      const right = text(eventId);
      if (!left || !right || left !== right) return false;
    }
    return toUpper(entry?.code) === normalizedCode;
  });
}

export function policyForActor(input: {
  hasGlobalOverride: boolean;
  actorMemberId: string | null;
  memberProfile: any;
}) {
  return {
    actorMemberProfileId: input.actorMemberId,
    canCreatePermanent: input.hasGlobalOverride,
    canCreateTemporary: Boolean(input.actorMemberId),
    hasGlobalOverride: input.hasGlobalOverride,
    isPioneer: toUpper(input.memberProfile?.rank) === 'PIONEER',
    isSystemAdmin: input.hasGlobalOverride && toUpper(input.memberProfile?.rank) !== 'PIONEER',
  };
}

export function hasAnyVoiceNetParticipants(presenceRows: any[] = []): boolean {
  return (presenceRows || []).length > 0;
}

export function resolvePresenceMemberId(presence: any): string {
  return text(presence?.member_profile_id || presence?.memberProfileId || presence?.user_id || presence?.userId);
}

export function sortPresenceOldestFirst(rows: any[]): any[] {
  return [...(rows || [])].sort((a, b) => {
    const aTs = new Date(a?.created_date || a?.createdAt || a?.last_activity || 0).getTime();
    const bTs = new Date(b?.created_date || b?.createdAt || b?.last_activity || 0).getTime();
    return aTs - bTs;
  });
}

export function roleAuthorityScore(memberProfile: any, eventRoleName = ''): number {
  const roleWeight = roleAuthorityWeight(eventRoleName);
  const rank = toUpper(memberProfile?.rank);
  const rankWeight =
    rank === 'PIONEER'
      ? 100
      : rank === 'COMMANDER'
        ? 90
        : rank === 'VOYAGER'
          ? 70
          : rank === 'SCOUT'
            ? 50
            : 30;

  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((entry: unknown) => toLower(entry))
    : [];
  const roleBoost = roles.includes('admin')
    ? 20
    : roles.includes('command') || roles.includes('officer') || roles.includes('operations')
      ? 12
      : roles.includes('comms') || roles.includes('communications')
        ? 8
        : 0;

  return Math.max(rankWeight + roleBoost, roleWeight);
}

export function minutesUntil(isoValue: string | null, nowMs = Date.now()): number | null {
  if (!isoValue) return null;
  const atMs = new Date(isoValue).getTime();
  if (!Number.isFinite(atMs)) return null;
  return Math.round((atMs - nowMs) / 60000);
}

export function shouldRunOperationPlanning(event: any, nowMs = Date.now()): boolean {
  const startIso = toIso(event?.start_time || event?.startTime);
  if (!startIso) return false;
  const startMs = new Date(startIso).getTime();
  const windowStart = nowMs - 5 * 60 * 1000;
  const windowEnd = nowMs + 24 * 60 * 60 * 1000;
  return startMs >= windowStart && startMs <= windowEnd;
}

export function filterActiveTemporaryAdhocByOwner(nets: any[], ownerMemberId: string): any[] {
  const owner = text(ownerMemberId);
  if (!owner) return [];
  return (nets || []).filter((entry) => {
    if (readLifecycleScope(entry) !== 'temp_adhoc') return false;
    if (isClosedNetStatus(entry?.status)) return false;
    const entryOwner = readOwnerMemberId(entry);
    return entryOwner === owner;
  });
}

export function canManageNetByScope(input: {
  net: any;
  actorMemberId: string | null;
  hasGlobalOverride: boolean;
  event: any;
  assignments: any[];
  memberProfile: any;
}) {
  const scope = readLifecycleScope(input.net);
  if (scope === 'permanent') return input.hasGlobalOverride;
  if (input.hasGlobalOverride) return true;

  const actorMemberId = text(input.actorMemberId);
  const ownerMemberId = readOwnerMemberId(input.net);

  if (scope === 'temp_adhoc') {
    return Boolean(actorMemberId && ownerMemberId && actorMemberId === ownerMemberId);
  }

  if (scope === 'temp_operation') {
    return canManageOperationNet({
      hasGlobalOverride: input.hasGlobalOverride,
      actorMemberId,
      memberProfile: input.memberProfile,
      event: input.event,
      assignments: input.assignments,
    });
  }

  return false;
}

export function isOperationNet(net: any): boolean {
  return readLifecycleScope(net) === 'temp_operation' || Boolean(text(net?.event_id || net?.eventId));
}

export function eventIdFromLog(entry: any): string {
  return eventIdForLog(entry);
}

export function netIdFromLog(entry: any): string {
  return netIdForLog(entry);
}
