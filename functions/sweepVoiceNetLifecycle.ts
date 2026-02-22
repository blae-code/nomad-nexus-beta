import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceContentLength, enforceJsonPost, verifyInternalAutomationRequest } from './_shared/security.ts';
import {
  createVoiceNet,
  deriveOperationRecommendedNets,
  deriveVoiceNetPolicyFromLogs,
  eventCreatorMemberId,
  eventEndForCleanup,
  eventIsEnded,
  getEvent,
  hasAnyVoiceNetParticipants,
  listEventDutyAssignments,
  listEventLogs,
  listEvents,
  listPresenceByNetId,
  listVoiceNets,
  normalizeVoiceNetForUi,
  plannedActivationForEvent,
  readCleanupGraceMinutes,
  readLifecycleScope,
  readOwnerMemberId,
  resolvePresenceMemberId,
  resolveVoiceNetActorAuthority,
  roleAuthorityScore,
  shouldRunOperationPlanning,
  sortPresenceOldestFirst,
  text,
  toNumber,
  updateVoiceNet,
  writeVoiceNetEventLog,
} from './_shared/voiceNetGovernance.ts';

function parseNowMs(value: unknown): number {
  if (!value) return Date.now();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function shouldActivateByNow(plannedActivationAt: string | null, nowMs: number): boolean {
  if (!plannedActivationAt) return true;
  const atMs = new Date(plannedActivationAt).getTime();
  if (!Number.isFinite(atMs)) return true;
  return nowMs >= atMs;
}

async function listMemberProfilesById(base44: any, memberIds: string[]): Promise<Record<string, any>> {
  const uniqueIds = Array.from(new Set(memberIds.map((entry) => text(entry)).filter(Boolean)));
  if (!uniqueIds.length) return {};

  const map: Record<string, any> = {};
  if (base44?.entities?.MemberProfile?.list) {
    const rows = await base44.entities.MemberProfile.list('-created_date', 1200).catch(() => []);
    for (const row of rows || []) {
      const id = text(row?.id);
      if (!id || !uniqueIds.includes(id)) continue;
      map[id] = row;
    }
  }

  const unresolved = uniqueIds.filter((id) => !map[id]);
  if (unresolved.length > 0 && base44?.entities?.MemberProfile?.filter) {
    await Promise.all(
      unresolved.map(async (id) => {
        const rows = await base44.entities.MemberProfile.filter({ id }).catch(() => []);
        if (rows?.[0]) map[id] = rows[0];
      })
    );
  }

  return map;
}

function resolveOperationTransferOwner(input: {
  participantRows: any[];
  event: any;
  assignments: any[];
  memberProfileMap: Record<string, any>;
}): string | null {
  const participants = sortPresenceOldestFirst(input.participantRows)
    .map((row) => ({
      row,
      memberId: resolvePresenceMemberId(row),
    }))
    .filter((entry) => entry.memberId);
  if (!participants.length) return null;

  const creatorId = eventCreatorMemberId(input.event);
  if (creatorId && participants.some((entry) => entry.memberId === creatorId)) {
    return creatorId;
  }

  const assignmentRoleByMember = new Map<string, string>();
  for (const assignment of input.assignments || []) {
    const memberId = text(assignment?.member_profile_id || assignment?.user_id || assignment?.memberProfileId);
    if (!memberId) continue;
    assignmentRoleByMember.set(memberId, text(assignment?.role_name || assignment?.role || assignment?.duty));
  }

  let winner: { memberId: string; score: number } | null = null;
  for (const participant of participants) {
    const profile = input.memberProfileMap[participant.memberId] || null;
    const roleName = assignmentRoleByMember.get(participant.memberId) || '';
    const score = roleAuthorityScore(profile, roleName);
    if (!winner || score > winner.score) {
      winner = { memberId: participant.memberId, score };
    }
  }

  return winner?.memberId || participants[0].memberId;
}

function resolveAdhocTransferOwner(input: {
  participantRows: any[];
  memberProfileMap: Record<string, any>;
}): string | null {
  const participants = sortPresenceOldestFirst(input.participantRows)
    .map((row) => ({
      row,
      memberId: resolvePresenceMemberId(row),
    }))
    .filter((entry) => entry.memberId);
  if (!participants.length) return null;

  let winner: { memberId: string; score: number } | null = null;
  for (const participant of participants) {
    const profile = input.memberProfileMap[participant.memberId] || null;
    const score = roleAuthorityScore(profile, '');
    if (!winner || score > winner.score) {
      winner = { memberId: participant.memberId, score };
    }
  }

  if (winner) return winner.memberId;
  return participants[0].memberId;
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

    const authority = resolveVoiceNetActorAuthority({ actorType, adminUser, memberProfile });
    const internalCheck = verifyInternalAutomationRequest(req, payload, { requiredWhenSecretMissing: false });
    const callerAuthorized = Boolean(authority.hasGlobalOverride || internalCheck.ok);
    if (!callerAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const actorMemberId = authority.actorMemberId;
    const nowMs = parseNowMs(payload.now || payload.nowIso || payload.now_iso);
    const nowIso = new Date(nowMs).toISOString();

    const [events, netRows, logs, presenceByNet] = await Promise.all([
      listEvents(base44),
      listVoiceNets(base44),
      listEventLogs(base44, 4000),
      listPresenceByNetId(base44),
    ]);

    const nets = netRows.map((entry) => normalizeVoiceNetForUi(entry, deriveVoiceNetPolicyFromLogs(entry, logs)));
    const eventById = new Map<string, any>();
    for (const event of events || []) {
      const id = text(event?.id);
      if (id) eventById.set(id, event);
    }

    const memberIdsForLookup = Object.values(presenceByNet)
      .flatMap((rows) => rows.map((row) => resolvePresenceMemberId(row)))
      .filter(Boolean);
    const memberProfileMap = await listMemberProfilesById(base44, memberIdsForLookup);

    const assignmentsByEventId = new Map<string, any[]>();

    const summary = {
      success: true,
      checkedEvents: 0,
      provisionedNets: [] as any[],
      activatedNets: [] as any[],
      closedNets: [] as any[],
      ownerTransfers: [] as any[],
      skipped: [] as any[],
      now: nowIso,
    };

    // Phase 1: operation planning + activation
    for (const event of events || []) {
      const eventId = text(event?.id);
      if (!eventId) continue;
      if (!shouldRunOperationPlanning(event, nowMs)) continue;

      summary.checkedEvents += 1;
      const activationAt = plannedActivationForEvent(event);
      const scopedNets = nets.filter((entry) => entry.lifecycle_scope === 'temp_operation' && text(entry.event_id) === eventId);
      const byCode = new Map<string, any>();
      for (const net of scopedNets) {
        byCode.set(String(net.code || ''), net);
      }

      const recommended = deriveOperationRecommendedNets(event);

      for (const lane of recommended) {
        const existing = byCode.get(lane.code);
        if (!existing) {
          const shouldActivate = shouldActivateByNow(activationAt, nowMs);
          const createPayload = {
            code: lane.code,
            label: lane.label,
            type: lane.type,
            discipline: lane.discipline,
            priority: lane.priority,
            status: shouldActivate ? 'active' : 'planned',
            event_id: eventId,
            lifecycle_scope: 'temp_operation',
            temporary: true,
            owner_member_profile_id: eventCreatorMemberId(event),
            planned_activation_at: activationAt,
            cleanup_grace_minutes: 5,
            min_rank_to_tx: lane.type === 'command' ? 'SCOUT' : 'VAGRANT',
            min_rank_to_rx: 'VAGRANT',
            stage_mode: lane.discipline === 'focused',
          };

          const created = await createVoiceNet(base44, createPayload);
          const normalizedCreated = normalizeVoiceNetForUi(created, createPayload);
          nets.push(normalizedCreated);
          byCode.set(normalizedCreated.code, normalizedCreated);
          summary.provisionedNets.push({
            event_id: eventId,
            net_id: normalizedCreated.id,
            code: normalizedCreated.code,
            status: normalizedCreated.status,
          });

          await writeVoiceNetEventLog(base44, {
            type: shouldActivate ? 'VOICE_NET_OPERATION_ACTIVATED' : 'VOICE_NET_OPERATION_PLANNED',
            summary: shouldActivate
              ? `Operation voice net activated (${normalizedCreated.code})`
              : `Operation voice net planned (${normalizedCreated.code})`,
            severity: 'LOW',
            eventId,
            actorMemberProfileId: actorMemberId,
            details: {
              net_id: normalizedCreated.id,
              event_id: eventId,
              lifecycle_scope: 'temp_operation',
              status: normalizedCreated.status,
              planned_activation_at: activationAt,
              owner_member_profile_id: normalizedCreated.owner_member_profile_id,
            },
          });
        }
      }

      for (const planned of byCode.values()) {
        if (String(planned.status) !== 'planned') continue;
        const plannedAt = text(planned.planned_activation_at || activationAt) || activationAt;
        if (!shouldActivateByNow(plannedAt, nowMs)) continue;

        const updated = await updateVoiceNet(base44, planned.id, {
          status: 'active',
          activated_at: nowIso,
        });
        const normalizedUpdated = normalizeVoiceNetForUi(updated, {
          ...planned,
          status: 'active',
        });
        const replaceIndex = nets.findIndex((entry) => entry.id === planned.id);
        if (replaceIndex >= 0) nets.splice(replaceIndex, 1, normalizedUpdated);

        summary.activatedNets.push({
          event_id: eventId,
          net_id: normalizedUpdated.id,
          code: normalizedUpdated.code,
        });

        await writeVoiceNetEventLog(base44, {
          type: 'VOICE_NET_OPERATION_ACTIVATED',
          summary: `Operation voice net activated (${normalizedUpdated.code})`,
          severity: 'LOW',
          eventId,
          actorMemberProfileId: actorMemberId,
          details: {
            net_id: normalizedUpdated.id,
            event_id: eventId,
            status: 'active',
            planned_activation_at: plannedAt,
          },
        });
      }
    }

    // Phase 2: temporary cleanup + ownership transfers
    for (const net of nets) {
      const scope = readLifecycleScope(net);
      if (scope !== 'temp_adhoc' && scope !== 'temp_operation') continue;
      if (String(net.status) === 'closed') continue;

      const netId = text(net.id);
      if (!netId) continue;
      const participants = presenceByNet[netId] || [];
      const hasParticipants = hasAnyVoiceNetParticipants(participants);
      const ownerMemberId = readOwnerMemberId(net);

      if (hasParticipants) {
        if (net.raw?.last_empty_at || net.raw?.lastEmptyAt) {
          await updateVoiceNet(base44, netId, { last_empty_at: null });
        }

        if (ownerMemberId) {
          const ownerPresent = participants.some((row) => resolvePresenceMemberId(row) === ownerMemberId);
          if (!ownerPresent) {
            const eventId = text(net.event_id);
            const event = eventId ? eventById.get(eventId) || (await getEvent(base44, eventId)) : null;
            let assignments: any[] = [];
            if (eventId) {
              if (!assignmentsByEventId.has(eventId)) {
                const resolved = await listEventDutyAssignments(base44, eventId);
                assignmentsByEventId.set(eventId, resolved);
              }
              assignments = assignmentsByEventId.get(eventId) || [];
            }

            const nextOwner =
              scope === 'temp_operation'
                ? resolveOperationTransferOwner({
                    participantRows: participants,
                    event,
                    assignments,
                    memberProfileMap,
                  })
                : resolveAdhocTransferOwner({ participantRows: participants, memberProfileMap });

            if (nextOwner && nextOwner !== ownerMemberId) {
              const updated = await updateVoiceNet(base44, netId, { owner_member_profile_id: nextOwner });
              const normalizedUpdated = normalizeVoiceNetForUi(updated, { owner_member_profile_id: nextOwner });
              const replaceIndex = nets.findIndex((entry) => entry.id === netId);
              if (replaceIndex >= 0) nets.splice(replaceIndex, 1, normalizedUpdated);

              summary.ownerTransfers.push({
                net_id: netId,
                code: normalizedUpdated.code,
                from_owner_member_profile_id: ownerMemberId,
                to_owner_member_profile_id: nextOwner,
                scope,
              });

              await writeVoiceNetEventLog(base44, {
                type: 'VOICE_NET_OWNER_TRANSFERRED',
                summary: `Voice net owner transferred (${normalizedUpdated.code})`,
                severity: 'LOW',
                eventId: text(normalizedUpdated.event_id) || null,
                actorMemberProfileId: actorMemberId,
                details: {
                  net_id: netId,
                  event_id: text(normalizedUpdated.event_id) || null,
                  from_owner_member_profile_id: ownerMemberId,
                  to_owner_member_profile_id: nextOwner,
                  reason: 'owner_absent_with_active_participants',
                },
              });
            }
          }
        }

        continue;
      }

      const graceMinutes = readCleanupGraceMinutes(net, 5);
      const lastEmptyAt = text(net.raw?.last_empty_at || net.raw?.lastEmptyAt || net.raw?.empty_since || '');
      const lastEmptyMs = lastEmptyAt ? new Date(lastEmptyAt).getTime() : 0;

      if (scope === 'temp_operation') {
        const eventId = text(net.event_id);
        const event = eventId ? eventById.get(eventId) || (await getEvent(base44, eventId)) : null;
        if (!event) {
          summary.skipped.push({ net_id: netId, reason: 'operation_event_missing' });
          continue;
        }
        if (!eventIsEnded(event, nowMs)) {
          summary.skipped.push({ net_id: netId, reason: 'operation_not_ended' });
          continue;
        }

        const endIso = eventEndForCleanup(event);
        const endMs = endIso ? new Date(endIso).getTime() : nowMs;
        if (Number.isFinite(endMs) && nowMs < endMs + graceMinutes * 60 * 1000) {
          summary.skipped.push({ net_id: netId, reason: 'cleanup_grace_pending' });
          continue;
        }
      }

      if (!lastEmptyMs || !Number.isFinite(lastEmptyMs)) {
        await updateVoiceNet(base44, netId, { last_empty_at: nowIso });
        summary.skipped.push({ net_id: netId, reason: 'empty_timestamp_initialized' });
        continue;
      }

      if (nowMs < lastEmptyMs + graceMinutes * 60 * 1000) {
        summary.skipped.push({ net_id: netId, reason: 'empty_grace_pending' });
        continue;
      }

      const closed = await updateVoiceNet(base44, netId, {
        status: 'closed',
        closed_at: nowIso,
        close_reason: scope === 'temp_operation' ? 'operation_complete_empty' : 'temporary_empty',
      });
      const normalizedClosed = normalizeVoiceNetForUi(closed, { status: 'closed' });
      summary.closedNets.push({
        net_id: netId,
        code: normalizedClosed.code,
        scope,
        reason: scope === 'temp_operation' ? 'operation_complete_empty' : 'temporary_empty',
      });

      await writeVoiceNetEventLog(base44, {
        type: 'VOICE_NET_LIFECYCLE_CLOSED',
        summary: `Voice net lifecycle closed (${normalizedClosed.code})`,
        severity: 'LOW',
        eventId: text(normalizedClosed.event_id) || null,
        actorMemberProfileId: actorMemberId,
        details: {
          net_id: netId,
          event_id: text(normalizedClosed.event_id) || null,
          lifecycle_scope: scope,
          reason: scope === 'temp_operation' ? 'operation_complete_empty' : 'temporary_empty',
          grace_minutes: graceMinutes,
        },
      });
    }

    return Response.json(summary);
  } catch (error: any) {
    return Response.json({ error: error?.message || 'sweepVoiceNetLifecycle failed' }, { status: 500 });
  }
});
