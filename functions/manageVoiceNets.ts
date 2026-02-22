import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceContentLength, enforceJsonPost } from './_shared/security.ts';
import {
  canManageNetByScope,
  canManageOperationNet,
  createVoiceNet,
  deriveOperationRecommendedNets,
  deriveVoiceNetPolicyFromLogs,
  eventCreatorMemberId,
  filterActiveTemporaryAdhocByOwner,
  getEvent,
  getVoiceNet,
  hasSystemAdminIdentity,
  listEventDutyAssignments,
  listEventLogs,
  listVoiceNets,
  minutesUntil,
  normalizeVoiceNetForUi,
  plannedActivationForEvent,
  policyForActor,
  readLifecycleScope,
  readOwnerMemberId,
  resolveVoiceNetActorAuthority,
  shouldRunOperationPlanning,
  text,
  toBoolean,
  toLower,
  toNumber,
  toUpper,
  uniqueNetCodeWithinScope,
  updateVoiceNet,
  writeVoiceNetEventLog,
  type VoiceNetLifecycleScope,
} from './_shared/voiceNetGovernance.ts';

const VALID_SCOPES = new Set(['permanent', 'temp_adhoc', 'temp_operation']);
const VALID_DISCIPLINES = new Set(['casual', 'focused']);
const VALID_TYPES = new Set(['command', 'squad', 'support', 'general', 'utility']);
const VALID_STATUSES = new Set(['planned', 'active', 'standby', 'inactive', 'closed']);

function normalizeScope(rawScope: unknown, eventId: string | null, temporaryFlag: boolean): VoiceNetLifecycleScope {
  const scopeToken = toLower(rawScope);
  if (scopeToken === 'permanent') return 'permanent';
  if (scopeToken === 'temp_adhoc' || scopeToken === 'adhoc') return 'temp_adhoc';
  if (scopeToken === 'temp_operation' || scopeToken === 'operation' || scopeToken === 'op') return 'temp_operation';
  if (eventId) return 'temp_operation';
  if (temporaryFlag) return 'temp_adhoc';
  return 'permanent';
}

function normalizeDiscipline(raw: unknown, fallback = 'casual'): string {
  const token = toLower(raw) || fallback;
  return VALID_DISCIPLINES.has(token) ? token : fallback;
}

function normalizeType(raw: unknown, fallback = 'general'): string {
  const token = toLower(raw) || fallback;
  return VALID_TYPES.has(token) ? token : fallback;
}

function normalizeStatus(raw: unknown, fallback = 'active'): string {
  const token = toLower(raw) || fallback;
  return VALID_STATUSES.has(token) ? token : fallback;
}

function normalizeCode(raw: unknown, fallbackPrefix = 'NET'): string {
  const cleaned = text(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  if (cleaned) return cleaned;
  return `${fallbackPrefix}-${Date.now().toString().slice(-4)}`;
}

function normalizeLabel(raw: unknown, code: string): string {
  const label = text(raw).slice(0, 80);
  return label || code;
}

function isScopeAllowed(token: string): boolean {
  return VALID_SCOPES.has(token);
}

function stableSortNets(nets: any[]): any[] {
  return [...(nets || [])].sort((a, b) => {
    const scopeRank = (scope: string) => {
      if (scope === 'permanent') return 0;
      if (scope === 'temp_operation') return 1;
      return 2;
    };

    const scopeDelta = scopeRank(String(a.lifecycle_scope || '')) - scopeRank(String(b.lifecycle_scope || ''));
    if (scopeDelta !== 0) return scopeDelta;

    const statusRank = (status: string) => {
      if (status === 'active') return 0;
      if (status === 'planned') return 1;
      if (status === 'standby') return 2;
      if (status === 'inactive') return 3;
      return 4;
    };
    const statusDelta = statusRank(String(a.status || '')) - statusRank(String(b.status || ''));
    if (statusDelta !== 0) return statusDelta;

    const priorityDelta = Number(a.priority || 9) - Number(b.priority || 9);
    if (priorityDelta !== 0) return priorityDelta;

    return String(a.label || a.code || '').localeCompare(String(b.label || b.code || ''));
  });
}

async function listNetsWithPolicy(base44: any, eventId: string | null = null) {
  const [nets, logs] = await Promise.all([listVoiceNets(base44), listEventLogs(base44, 3500)]);
  const normalized = nets
    .map((net) => {
      const policy = deriveVoiceNetPolicyFromLogs(net, logs);
      return normalizeVoiceNetForUi(net, policy);
    })
    .filter((entry) => (eventId ? String(entry.event_id || '') === eventId : true));

  return {
    nets: stableSortNets(normalized),
    logs,
  };
}

async function attachManageFlags(
  base44: any,
  nets: any[],
  input: {
    actorMemberId: string | null;
    hasGlobalOverride: boolean;
    memberProfile: any;
  }
) {
  const eventCache = new Map<string, any>();
  const assignmentCache = new Map<string, any[]>();
  const rows: any[] = [];

  for (const net of nets || []) {
    const scope = readLifecycleScope(net);
    const eventId = text(net?.event_id);
    let event = null;
    let assignments: any[] = [];

    if (scope === 'temp_operation' && eventId) {
      if (!eventCache.has(eventId)) {
        eventCache.set(eventId, await getEvent(base44, eventId));
      }
      event = eventCache.get(eventId) || null;
      if (!assignmentCache.has(eventId)) {
        assignmentCache.set(eventId, await listEventDutyAssignments(base44, eventId));
      }
      assignments = assignmentCache.get(eventId) || [];
    }

    const canManage = canManageNetByScope({
      net,
      actorMemberId: input.actorMemberId,
      hasGlobalOverride: input.hasGlobalOverride,
      event,
      assignments,
      memberProfile: input.memberProfile,
    });

    rows.push({
      ...net,
      can_manage: canManage,
      canManage,
    });
  }

  return rows;
}

function hasSystemAdminAuthority(actorType: 'admin' | 'member' | null, adminUser: any, memberProfile: any): boolean {
  if (actorType === 'admin') return true;
  if (hasSystemAdminIdentity(adminUser)) return true;
  if (hasSystemAdminIdentity(memberProfile)) return true;
  return false;
}

function buildPlannedPlaceholderRows(input: {
  event: any;
  existingByCode: Set<string>;
  eventId: string;
  nowMs: number;
}) {
  const activationAt = plannedActivationForEvent(input.event);
  const recommended = deriveOperationRecommendedNets(input.event);
  return recommended
    .filter((entry) => !input.existingByCode.has(entry.code))
    .slice(0, 10)
    .map((entry) => ({
      id: `planned:${input.eventId}:${entry.code}`,
      code: entry.code,
      label: entry.label,
      type: entry.type,
      discipline: entry.discipline,
      priority: entry.priority,
      status: 'planned',
      lifecycle_scope: 'temp_operation',
      temporary: true,
      event_id: input.eventId,
      planned_activation_at: activationAt,
      cleanup_grace_minutes: 5,
      owner_member_profile_id: eventCreatorMemberId(input.event),
      minutes_until_activation: minutesUntil(activationAt, input.nowMs),
      source: 'recommended_placeholder',
    }));
}

function nextPolicyEnvelope(basePolicy: ReturnType<typeof policyForActor>, extra: Record<string, unknown> = {}) {
  return {
    ...basePolicy,
    ...extra,
  };
}

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const lengthCheck = enforceContentLength(req, 80_000);
    if (!lengthCheck.ok) {
      return Response.json({ error: lengthCheck.error }, { status: lengthCheck.status });
    }

    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = toLower(payload.action);
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    const authority = resolveVoiceNetActorAuthority({ actorType, adminUser, memberProfile });
    const explicitSystemAdmin = hasSystemAdminAuthority(actorType, adminUser, memberProfile);
    const hasGlobalOverride = authority.hasGlobalOverride || explicitSystemAdmin;
    const actorMemberId = authority.actorMemberId;

    const basePolicy = policyForActor({
      hasGlobalOverride,
      actorMemberId,
      memberProfile,
    });

    if (action === 'list_nets') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const nowMs = Date.now();
      const { nets } = await listNetsWithPolicy(base44, eventId);
      const netsWithFlags = await attachManageFlags(base44, nets, {
        actorMemberId,
        hasGlobalOverride,
        memberProfile,
      });
      let plannedPlaceholders: any[] = [];

      if (eventId) {
        const event = await getEvent(base44, eventId);
        if (event) {
          const existingByCode = new Set(netsWithFlags.filter((entry) => entry.event_id === eventId).map((entry) => String(entry.code || '')));
          plannedPlaceholders = buildPlannedPlaceholderRows({
            event,
            existingByCode,
            eventId,
            nowMs,
          });
        }
      }

      return Response.json({
        success: true,
        nets: netsWithFlags,
        planned_nets: plannedPlaceholders,
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    if (action === 'list_planned_operation_nets') {
      const eventId = text(payload.eventId || payload.event_id);
      if (!eventId) {
        return Response.json({ error: 'eventId required' }, { status: 400 });
      }
      const event = await getEvent(base44, eventId);
      if (!event) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
      }

      const nowMs = Date.now();
      const { nets } = await listNetsWithPolicy(base44, eventId);
      const scopedWithFlags = await attachManageFlags(base44, nets, {
        actorMemberId,
        hasGlobalOverride,
        memberProfile,
      });
      const scoped = scopedWithFlags.filter((entry) => entry.lifecycle_scope === 'temp_operation');
      const existingCodes = new Set(scoped.map((entry) => String(entry.code || '')));
      const placeholders = buildPlannedPlaceholderRows({
        event,
        existingByCode: existingCodes,
        eventId,
        nowMs,
      });

      return Response.json({
        success: true,
        event_id: eventId,
        nets: scoped,
        planned_nets: placeholders,
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    if (action === 'create_net') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const temporaryFlag = toBoolean(payload.temporary ?? payload.is_temporary ?? payload.isTemporary);
      const scope = normalizeScope(payload.scope, eventId, temporaryFlag);
      if (!isScopeAllowed(scope)) {
        return Response.json({ error: 'Invalid scope' }, { status: 400 });
      }

      if (!actorMemberId) {
        return Response.json({ error: 'Member profile required' }, { status: 403 });
      }

      const { nets } = await listNetsWithPolicy(base44, null);
      if (scope === 'permanent' && !hasGlobalOverride) {
        return Response.json(
          {
            success: false,
            blockedReason: 'INSUFFICIENT_PERMISSIONS',
            error: 'Only System Admin and Pioneer can create permanent voice nets.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 403 }
        );
      }

      let event = null;
      let assignments: any[] = [];
      if (scope === 'temp_operation') {
        if (!eventId) {
          return Response.json({ error: 'eventId required for temp_operation scope' }, { status: 400 });
        }
        event = await getEvent(base44, eventId);
        if (!event) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        assignments = await listEventDutyAssignments(base44, eventId);
        if (
          !canManageOperationNet({
            hasGlobalOverride,
            actorMemberId,
            memberProfile,
            event,
            assignments,
          })
        ) {
          return Response.json(
            {
              success: false,
              blockedReason: 'INSUFFICIENT_PERMISSIONS',
              error: 'Operation role authority required to create operation voice nets.',
              policy: nextPolicyEnvelope(basePolicy),
            },
            { status: 403 }
          );
        }
      }

      if (scope === 'temp_adhoc' && !hasGlobalOverride) {
        const activeOwned = filterActiveTemporaryAdhocByOwner(nets, actorMemberId);
        if (activeOwned.length >= 1) {
          return Response.json(
            {
              success: false,
              blockedReason: 'TEMP_LIMIT_REACHED',
              error: 'You already own an active temporary voice net.',
              policy: nextPolicyEnvelope(basePolicy, { activeTempOwned: activeOwned.length }),
            },
            { status: 409 }
          );
        }
      }

      const fallbackPrefix = scope === 'permanent' ? 'PERM' : scope === 'temp_operation' ? 'OP' : 'TEMP';
      const code = normalizeCode(payload.code, fallbackPrefix);
      if (!uniqueNetCodeWithinScope(nets, code, scope, eventId, '')) {
        return Response.json(
          {
            success: false,
            blockedReason: 'CODE_CONFLICT',
            error: 'Voice net code already exists in this scope.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 409 }
        );
      }

      const label = normalizeLabel(payload.label, code);
      const type = normalizeType(payload.type, scope === 'permanent' ? 'general' : 'squad');
      const discipline = normalizeDiscipline(payload.discipline, scope === 'permanent' ? 'casual' : 'focused');
      const priority = Math.max(1, Math.min(3, toNumber(payload.priority, type === 'command' ? 1 : 2)));
      const activationAt = scope === 'temp_operation' ? plannedActivationForEvent(event) : null;
      const nowMs = Date.now();
      const status = scope === 'temp_operation' && activationAt && new Date(activationAt).getTime() > nowMs ? 'planned' : normalizeStatus(payload.status, 'active');
      const requestedOwner = text(payload.ownerMemberProfileId || payload.owner_member_profile_id) || null;
      const ownerMemberProfileId =
        requestedOwner && hasGlobalOverride
          ? requestedOwner
          : scope === 'temp_operation'
            ? eventCreatorMemberId(event) || actorMemberId
            : actorMemberId;

      const createPayload: Record<string, unknown> = {
        code,
        label,
        type,
        discipline,
        priority,
        status,
        event_id: scope === 'temp_operation' ? eventId : null,
        lifecycle_scope: scope,
        temporary: scope !== 'permanent',
        owner_member_profile_id: ownerMemberProfileId,
        planned_activation_at: activationAt,
        cleanup_grace_minutes: Math.max(0, Math.min(60, toNumber(payload.cleanup_grace_minutes, 5))),
        min_rank_to_tx: text(payload.min_rank_to_tx || (type === 'command' ? 'SCOUT' : 'VAGRANT')),
        min_rank_to_rx: text(payload.min_rank_to_rx || 'VAGRANT'),
        stage_mode: discipline === 'focused',
        settings: payload?.settings && typeof payload.settings === 'object' ? payload.settings : undefined,
      };

      const created = await createVoiceNet(base44, createPayload);
      const normalizedCreated = normalizeVoiceNetForUi(created, {
        lifecycle_scope: scope,
        owner_member_profile_id: ownerMemberProfileId,
        temporary: scope !== 'permanent',
        planned_activation_at: activationAt,
      });

      const eventContext = scope === 'temp_operation' ? eventId : null;
      await writeVoiceNetEventLog(base44, {
        type: 'VOICE_NET_POLICY_SET',
        summary: `Voice net created (${scope})`,
        severity: 'LOW',
        eventId: eventContext,
        actorMemberProfileId: actorMemberId,
        details: {
          net_id: normalizedCreated.id,
          event_id: eventContext,
          code,
          label,
          lifecycle_scope: scope,
          temporary: scope !== 'permanent',
          owner_member_profile_id: ownerMemberProfileId,
          planned_activation_at: activationAt,
          cleanup_grace_minutes: normalizedCreated.cleanup_grace_minutes,
          status: normalizedCreated.status,
        },
      });

      if (scope === 'temp_operation') {
        await writeVoiceNetEventLog(base44, {
          type: normalizedCreated.status === 'planned' ? 'VOICE_NET_OPERATION_PLANNED' : 'VOICE_NET_OPERATION_ACTIVATED',
          summary:
            normalizedCreated.status === 'planned'
              ? `Operation voice net planned (${code})`
              : `Operation voice net activated (${code})`,
          severity: 'LOW',
          eventId,
          actorMemberProfileId: actorMemberId,
          details: {
            net_id: normalizedCreated.id,
            event_id: eventId,
            status: normalizedCreated.status,
            planned_activation_at: activationAt,
          },
        });
      }

      return Response.json({
        success: true,
        net: {
          ...normalizedCreated,
          can_manage: true,
          canManage: true,
        },
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    if (action === 'update_net') {
      const netId = text(payload.netId || payload.net_id);
      if (!netId) {
        return Response.json({ error: 'netId required' }, { status: 400 });
      }
      const existing = await getVoiceNet(base44, netId);
      if (!existing) {
        return Response.json({ error: 'Voice net not found' }, { status: 404 });
      }

      const logs = await listEventLogs(base44, 3500);
      const existingPolicy = deriveVoiceNetPolicyFromLogs(existing, logs);
      const normalizedExisting = normalizeVoiceNetForUi(existing, existingPolicy);
      const scope = readLifecycleScope(normalizedExisting);
      const eventId = text(normalizedExisting.event_id);
      const event = eventId ? await getEvent(base44, eventId) : null;
      const assignments = eventId ? await listEventDutyAssignments(base44, eventId) : [];

      const canManage = canManageNetByScope({
        net: normalizedExisting,
        actorMemberId,
        hasGlobalOverride,
        event,
        assignments,
        memberProfile,
      });
      if (!canManage) {
        return Response.json(
          {
            success: false,
            blockedReason: 'INSUFFICIENT_PERMISSIONS',
            error: 'You do not have permission to update this voice net.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 403 }
        );
      }

      const requestedCode = payload.code ? normalizeCode(payload.code) : normalizedExisting.code;
      if (!uniqueNetCodeWithinScope(await listVoiceNets(base44), requestedCode, scope, eventId || null, normalizedExisting.id)) {
        return Response.json(
          {
            success: false,
            blockedReason: 'CODE_CONFLICT',
            error: 'Voice net code already exists in this scope.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 409 }
        );
      }

      const updates: Record<string, unknown> = {
        code: requestedCode,
      };
      if (payload.label != null) updates.label = normalizeLabel(payload.label, requestedCode);
      if (payload.type != null) updates.type = normalizeType(payload.type, normalizedExisting.type);
      if (payload.discipline != null) updates.discipline = normalizeDiscipline(payload.discipline, normalizedExisting.discipline);
      if (payload.priority != null) updates.priority = Math.max(1, Math.min(3, toNumber(payload.priority, normalizedExisting.priority)));
      if (payload.status != null) updates.status = normalizeStatus(payload.status, normalizedExisting.status);
      if (payload.settings && typeof payload.settings === 'object') updates.settings = payload.settings;
      if (payload.min_rank_to_tx != null) updates.min_rank_to_tx = text(payload.min_rank_to_tx);
      if (payload.min_rank_to_rx != null) updates.min_rank_to_rx = text(payload.min_rank_to_rx);
      if (Object.prototype.hasOwnProperty.call(payload, 'cleanup_grace_minutes')) {
        updates.cleanup_grace_minutes = Math.max(0, Math.min(60, toNumber(payload.cleanup_grace_minutes, normalizedExisting.cleanup_grace_minutes || 5)));
      }

      const updated = await updateVoiceNet(base44, normalizedExisting.id, updates);
      const normalizedUpdated = normalizeVoiceNetForUi(updated, {
        ...existingPolicy,
        ...updates,
      });

      await writeVoiceNetEventLog(base44, {
        type: 'VOICE_NET_POLICY_SET',
        summary: `Voice net updated (${normalizedUpdated.code})`,
        severity: 'LOW',
        eventId: eventId || null,
        actorMemberProfileId: actorMemberId,
        details: {
          net_id: normalizedUpdated.id,
          event_id: eventId || null,
          lifecycle_scope: normalizedUpdated.lifecycle_scope,
          owner_member_profile_id: readOwnerMemberId(normalizedUpdated),
          status: normalizedUpdated.status,
          updates,
        },
      });

      if (scope === 'temp_operation' && normalizedExisting.status === 'planned' && normalizedUpdated.status === 'active') {
        await writeVoiceNetEventLog(base44, {
          type: 'VOICE_NET_OPERATION_ACTIVATED',
          summary: `Operation voice net activated (${normalizedUpdated.code})`,
          severity: 'LOW',
          eventId,
          actorMemberProfileId: actorMemberId,
          details: {
            net_id: normalizedUpdated.id,
            event_id: eventId,
            status: normalizedUpdated.status,
          },
        });
      }

      return Response.json({
        success: true,
        net: {
          ...normalizedUpdated,
          can_manage: true,
          canManage: true,
        },
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    if (action === 'close_net') {
      const netId = text(payload.netId || payload.net_id);
      if (!netId) {
        return Response.json({ error: 'netId required' }, { status: 400 });
      }
      const existing = await getVoiceNet(base44, netId);
      if (!existing) {
        return Response.json({ error: 'Voice net not found' }, { status: 404 });
      }
      const logs = await listEventLogs(base44, 3500);
      const existingPolicy = deriveVoiceNetPolicyFromLogs(existing, logs);
      const normalizedExisting = normalizeVoiceNetForUi(existing, existingPolicy);
      const eventId = text(normalizedExisting.event_id);
      const event = eventId ? await getEvent(base44, eventId) : null;
      const assignments = eventId ? await listEventDutyAssignments(base44, eventId) : [];

      const canManage = canManageNetByScope({
        net: normalizedExisting,
        actorMemberId,
        hasGlobalOverride,
        event,
        assignments,
        memberProfile,
      });
      if (!canManage) {
        return Response.json(
          {
            success: false,
            blockedReason: 'INSUFFICIENT_PERMISSIONS',
            error: 'You do not have permission to close this voice net.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 403 }
        );
      }

      const closed = await updateVoiceNet(base44, normalizedExisting.id, {
        status: 'closed',
        closed_at: new Date().toISOString(),
        close_reason: text(payload.reason || payload.close_reason) || 'manual_close',
      });
      const normalizedClosed = normalizeVoiceNetForUi(closed, { ...existingPolicy, status: 'closed' });

      await writeVoiceNetEventLog(base44, {
        type: 'VOICE_NET_LIFECYCLE_CLOSED',
        summary: `Voice net closed (${normalizedClosed.code})`,
        severity: 'LOW',
        eventId: eventId || null,
        actorMemberProfileId: actorMemberId,
        details: {
          net_id: normalizedClosed.id,
          event_id: eventId || null,
          lifecycle_scope: normalizedClosed.lifecycle_scope,
          reason: text(payload.reason || payload.close_reason) || 'manual_close',
        },
      });

      return Response.json({
        success: true,
        net: {
          ...normalizedClosed,
          can_manage: true,
          canManage: true,
        },
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    if (action === 'transfer_owner') {
      const netId = text(payload.netId || payload.net_id);
      const targetOwnerId = text(payload.ownerMemberProfileId || payload.owner_member_profile_id || payload.target_owner_member_profile_id);
      if (!netId || !targetOwnerId) {
        return Response.json({ error: 'netId and ownerMemberProfileId required' }, { status: 400 });
      }

      const existing = await getVoiceNet(base44, netId);
      if (!existing) {
        return Response.json({ error: 'Voice net not found' }, { status: 404 });
      }
      const logs = await listEventLogs(base44, 3500);
      const existingPolicy = deriveVoiceNetPolicyFromLogs(existing, logs);
      const normalizedExisting = normalizeVoiceNetForUi(existing, existingPolicy);
      const eventId = text(normalizedExisting.event_id);
      const event = eventId ? await getEvent(base44, eventId) : null;
      const assignments = eventId ? await listEventDutyAssignments(base44, eventId) : [];

      const canManage = canManageNetByScope({
        net: normalizedExisting,
        actorMemberId,
        hasGlobalOverride,
        event,
        assignments,
        memberProfile,
      });
      if (!canManage) {
        return Response.json(
          {
            success: false,
            blockedReason: 'INSUFFICIENT_PERMISSIONS',
            error: 'You do not have permission to transfer owner for this voice net.',
            policy: nextPolicyEnvelope(basePolicy),
          },
          { status: 403 }
        );
      }

      const updated = await updateVoiceNet(base44, normalizedExisting.id, {
        owner_member_profile_id: targetOwnerId,
      });
      const normalizedUpdated = normalizeVoiceNetForUi(updated, {
        ...existingPolicy,
        owner_member_profile_id: targetOwnerId,
      });

      await writeVoiceNetEventLog(base44, {
        type: 'VOICE_NET_OWNER_TRANSFERRED',
        summary: `Voice net owner transferred (${normalizedUpdated.code})`,
        severity: 'LOW',
        eventId: eventId || null,
        actorMemberProfileId: actorMemberId,
        details: {
          net_id: normalizedUpdated.id,
          event_id: eventId || null,
          from_owner_member_profile_id: readOwnerMemberId(normalizedExisting),
          to_owner_member_profile_id: targetOwnerId,
        },
      });

      return Response.json({
        success: true,
        net: {
          ...normalizedUpdated,
          can_manage: true,
          canManage: true,
        },
        policy: nextPolicyEnvelope(basePolicy),
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'manageVoiceNets failed' }, { status: 500 });
  }
});
