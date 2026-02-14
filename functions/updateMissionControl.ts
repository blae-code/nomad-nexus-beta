import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'operations', 'mission-control']);
const BEACON_SEVERITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const CHECKLIST_STATUS = new Set(['PENDING', 'DONE', 'BLOCKED']);
const CALL_PRIORITIES = new Set(['STANDARD', 'HIGH', 'CRITICAL']);
const VOICE_MOD_ACTIONS = new Set(['MUTE', 'UNMUTE', 'DEAFEN', 'UNDEAFEN', 'KICK', 'LOCK_CHANNEL', 'UNLOCK_CHANNEL']);

type UpdateAttempt = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function hasCommandAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.some((role: string) => COMMAND_ROLES.has(role));
}

function iso(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function createFirstSuccessful(entity: any, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

async function applyFirstSuccessfulEventUpdate(base44: any, eventId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.Event.update(eventId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Event update failed');
}

async function writeMissionLog(base44: any, payload: UpdateAttempt) {
  return createFirstSuccessful(base44.entities.EventLog, [
    payload,
    {
      type: payload.type,
      severity: payload.severity,
      actor_member_profile_id: payload.actor_member_profile_id,
      summary: payload.summary,
    },
  ]);
}

async function notifyMembers(base44: any, memberIds: string[], title: string, message: string, relatedEntityId: string | null = null) {
  for (const memberId of memberIds) {
    if (!memberId) continue;
    try {
      await createFirstSuccessful(base44.entities.Notification, [
        {
          user_id: memberId,
          type: 'system',
          title,
          message,
          related_entity_type: 'event',
          related_entity_id: relatedEntityId,
        },
        {
          user_id: memberId,
          type: 'system',
          title,
          message,
        },
      ]);
    } catch (error) {
      console.error('[updateMissionControl] Notification failed:', error.message);
    }
  }
}

function eventAssignedMembers(event: any) {
  const assigned = Array.isArray(event?.assigned_member_profile_ids)
    ? event.assigned_member_profile_ids
    : Array.isArray(event?.assigned_user_ids)
      ? event.assigned_user_ids
      : [];
  return assigned.map((entry: unknown) => text(entry)).filter(Boolean);
}

function eventIdForLog(entry: any) {
  return text(entry?.details?.event_id || entry?.related_entity_id || entry?.details?.operation_id);
}

function getChecklistItems(logs: any[], eventId: string) {
  const byId = new Map<string, any>();
  for (const entry of logs) {
    if (text(entry?.type).toUpperCase() !== 'MISSION_CONTROL_PREFLIGHT_CHECKLIST') continue;
    if (eventIdForLog(entry) !== eventId) continue;
    const details = entry?.details || {};
    const itemId = text(details?.item_id);
    if (!itemId) continue;
    byId.set(itemId, {
      item_id: itemId,
      label: text(details?.label),
      category: text(details?.category, 'general'),
      status: text(details?.status, 'PENDING').toUpperCase(),
      required: Boolean(details?.required),
      role: text(details?.role),
      updated_at: details?.updated_at || entry?.created_date,
      updated_by_member_profile_id: text(details?.updated_by_member_profile_id),
    });
  }
  return Array.from(byId.values());
}

function getRoleCards(logs: any[], eventId: string) {
  const byMemberId = new Map<string, any>();
  for (const entry of logs) {
    if (text(entry?.type).toUpperCase() !== 'MISSION_CONTROL_ROLE_CARD') continue;
    if (eventIdForLog(entry) !== eventId) continue;
    const details = entry?.details || {};
    const memberProfileId = text(details?.member_profile_id);
    if (!memberProfileId) continue;
    byMemberId.set(memberProfileId, {
      member_profile_id: memberProfileId,
      role: text(details?.role),
      ship: text(details?.ship),
      loadout: text(details?.loadout),
      notes: text(details?.notes),
      assigned_at: details?.assigned_at || entry?.created_date,
      assigned_by_member_profile_id: text(details?.assigned_by_member_profile_id),
    });
  }
  return Array.from(byMemberId.values());
}

function getLatestQuantumSync(logs: any[], eventId: string) {
  let latest: any = null;
  for (const entry of logs) {
    if (text(entry?.type).toUpperCase() !== 'MISSION_CONTROL_QUANTUM_SYNC') continue;
    if (eventIdForLog(entry) !== eventId) continue;
    const created = new Date(entry?.created_date || 0).getTime();
    if (!latest || created >= latest.created) {
      latest = { created, details: entry?.details || {}, id: entry?.id };
    }
  }
  if (!latest) return null;
  return {
    id: latest.id,
    rally_at: latest.details?.rally_at || null,
    launch_at: latest.details?.launch_at || null,
    fallback_at: latest.details?.fallback_at || null,
    synchronized_by_member_profile_id: text(latest.details?.synchronized_by_member_profile_id),
    rationale: text(latest.details?.rationale),
  };
}

function getVoiceTopology(logs: any[], eventId: string) {
  let latest: any = null;
  for (const entry of logs) {
    if (text(entry?.type).toUpperCase() !== 'MISSION_CONTROL_VOICE_TOPOLOGY') continue;
    if (eventIdForLog(entry) !== eventId) continue;
    const created = new Date(entry?.created_date || 0).getTime();
    if (!latest || created >= latest.created) {
      latest = { created, details: entry?.details || {}, id: entry?.id };
    }
  }
  if (!latest) return null;
  return {
    id: latest.id,
    mode: text(latest.details?.mode, 'casual'),
    nets: Array.isArray(latest.details?.nets) ? latest.details.nets : [],
    provisioned_at: latest.details?.provisioned_at || null,
  };
}

function getContractLinks(logs: any[], eventId: string) {
  const byContract = new Map<string, any>();
  for (const entry of logs) {
    if (text(entry?.type).toUpperCase() !== 'MISSION_CONTROL_CONTRACT_LINK') continue;
    if (eventIdForLog(entry) !== eventId) continue;
    const details = entry?.details || {};
    const contractPostId = text(details?.contract_post_id);
    if (!contractPostId) continue;
    byContract.set(contractPostId, {
      contract_post_id: contractPostId,
      title: text(details?.title),
      contract_type: text(details?.contract_type),
      status: text(details?.status),
      linked_at: details?.linked_at || entry?.created_date,
      linked_by_member_profile_id: text(details?.linked_by_member_profile_id),
    });
  }
  return Array.from(byContract.values());
}

function getTacticalCallouts(logs: any[], eventId: string) {
  return logs
    .filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_TACTICAL_CALLOUT')
    .filter((entry) => eventIdForLog(entry) === eventId)
    .map((entry) => {
      const details = entry?.details || {};
      return {
        id: entry?.id,
        message: text(details?.message),
        priority: text(details?.priority, 'STANDARD').toUpperCase(),
        callout_type: text(details?.callout_type, 'STATUS'),
        marker: details?.marker || null,
        objective_status: text(details?.objective_status),
        created_date: entry?.created_date || null,
        actor_member_profile_id: text(details?.actor_member_profile_id || entry?.actor_member_profile_id),
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
}

function getVoiceModeration(logs: any[], eventId: string) {
  return logs
    .filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_VOICE_MODERATION')
    .filter((entry) => eventIdForLog(entry) === eventId)
    .map((entry) => {
      const details = entry?.details || {};
      return {
        id: entry?.id,
        moderation_action: text(details?.moderation_action).toUpperCase(),
        target_member_profile_id: text(details?.target_member_profile_id),
        reason: text(details?.reason),
        channel_id: text(details?.channel_id),
        created_date: entry?.created_date || null,
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
}

async function createVoiceNetWithFallback(base44: any, payload: Record<string, unknown>) {
  return createFirstSuccessful(base44.entities.VoiceNet, [
    payload,
    {
      code: payload.code,
      label: payload.label,
      type: payload.type,
      discipline: payload.discipline,
      status: payload.status,
      priority: payload.priority,
      event_id: payload.event_id,
    },
    {
      code: payload.code,
      label: payload.label,
      type: payload.type,
      status: payload.status,
      priority: payload.priority,
    },
  ]);
}

function toIsoOrNull(value: unknown) {
  const normalized = iso(value);
  return normalized || null;
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = text(payload.action).toLowerCase();
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    const actorMemberId = memberProfile?.id || null;
    const commandAccess = hasCommandAccess(memberProfile, actorType);
    const eventId = text(payload.eventId || payload.operationId || payload.event_id);
    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Operation not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const assignedMembers = eventAssignedMembers(event);
    const hostMemberId = text(event?.host_id || event?.hostId);
    if (actorType === 'member' && !commandAccess) {
      if (!actorMemberId) {
        return Response.json({ error: 'Operation access denied' }, { status: 403 });
      }
      const inOperationScope = assignedMembers.includes(actorMemberId) || hostMemberId === actorMemberId;
      if (!inOperationScope) {
        return Response.json({ error: 'Operation access denied' }, { status: 403 });
      }
    }

    if (action === 'log_position_update') {
      const memberProfileId = text(payload.memberProfileId || payload.member_profile_id || actorMemberId);
      if (!memberProfileId) {
        return Response.json({ error: 'memberProfileId required' }, { status: 400 });
      }

      const details = {
        event_id: eventId,
        member_profile_id: memberProfileId,
        coordinates: {
          x: Number(payload?.coordinates?.x ?? payload?.x ?? 0),
          y: Number(payload?.coordinates?.y ?? payload?.y ?? 0),
          z: Number(payload?.coordinates?.z ?? payload?.z ?? 0),
        },
        location: text(payload.location || ''),
        note: text(payload.note || ''),
        recorded_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_POSITION',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Position update: ${memberProfileId}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        position: details,
        logId: log?.id || null,
      });
    }

    if (action === 'trigger_emergency_beacon') {
      const severity = text(payload.severity || 'CRITICAL').toUpperCase();
      const normalizedSeverity = BEACON_SEVERITY.has(severity) ? severity : 'CRITICAL';
      const message = text(payload.message || 'Emergency beacon triggered');
      const details = {
        event_id: eventId,
        severity: normalizedSeverity,
        message,
        location: text(payload.location || ''),
        triggered_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_BEACON',
        severity: normalizedSeverity,
        actor_member_profile_id: actorMemberId,
        summary: `Emergency beacon (${normalizedSeverity})`,
        details,
      });

      const notifyTargets = Array.from(new Set([...assignedMembers, text(event?.host_id || '')].filter(Boolean)));
      await notifyMembers(base44, notifyTargets, `Emergency Beacon (${normalizedSeverity})`, message, eventId);

      return Response.json({
        success: true,
        action,
        beacon: details,
        logId: log?.id || null,
      });
    }

    if (action === 'submit_quick_intel') {
      const intelSummary = text(payload.summary || payload.intelSummary);
      if (!intelSummary) {
        return Response.json({ error: 'summary required' }, { status: 400 });
      }
      const threatLevel = text(payload.threatLevel || 'MEDIUM').toUpperCase();
      const details = {
        event_id: eventId,
        summary: intelSummary,
        threat_level: threatLevel,
        source: text(payload.source || ''),
        submitted_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_INTEL_UPLOAD',
        severity: threatLevel === 'CRITICAL' || threatLevel === 'HIGH' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Quick intel upload (${threatLevel})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        intel: details,
        logId: log?.id || null,
      });
    }

    if (action === 'swap_role_assignment') {
      const fromMemberProfileId = text(payload.fromMemberProfileId || payload.from_member_profile_id);
      const toMemberProfileId = text(payload.toMemberProfileId || payload.to_member_profile_id);
      const role = text(payload.role || payload.roleName || 'operator');
      if (!fromMemberProfileId || !toMemberProfileId) {
        return Response.json({ error: 'fromMemberProfileId and toMemberProfileId required' }, { status: 400 });
      }
      if (!commandAccess && fromMemberProfileId !== actorMemberId) {
        return Response.json({ error: 'Command privileges required to swap roles for other members' }, { status: 403 });
      }

      const currentAssigned = eventAssignedMembers(event);
      const nextAssigned = currentAssigned.includes(fromMemberProfileId)
        ? Array.from(new Set(currentAssigned.map((id) => (id === fromMemberProfileId ? toMemberProfileId : id))))
        : currentAssigned.includes(toMemberProfileId)
          ? currentAssigned
          : [...currentAssigned, toMemberProfileId];

      const updatedEvent = await applyFirstSuccessfulEventUpdate(base44, eventId, [
        { assigned_member_profile_ids: nextAssigned },
        { assigned_user_ids: nextAssigned },
      ]);

      const details = {
        event_id: eventId,
        from_member_profile_id: fromMemberProfileId,
        to_member_profile_id: toMemberProfileId,
        role,
        swapped_at: nowIso,
      };
      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_ROLE_SWAP',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Role swap: ${fromMemberProfileId} -> ${toMemberProfileId} (${role})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        roleSwap: details,
        event: updatedEvent,
        logId: log?.id || null,
      });
    }

    if (action === 'upsert_manifest_item') {
      const itemId = text(payload.itemId || payload.item_id, `manifest_${Date.now()}`);
      const label = text(payload.label || payload.itemLabel);
      if (!label) {
        return Response.json({ error: 'label required' }, { status: 400 });
      }
      const checked = Boolean(payload.checked);
      const details = {
        event_id: eventId,
        item_id: itemId,
        label,
        checked,
        updated_at: nowIso,
        updated_by_member_profile_id: actorMemberId,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_MANIFEST',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Manifest item ${checked ? 'checked' : 'updated'}: ${label}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        manifestItem: details,
        logId: log?.id || null,
      });
    }

    if (action === 'award_recognition') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const targetMemberProfileId = text(payload.targetMemberProfileId || payload.target_member_profile_id);
      if (!targetMemberProfileId) {
        return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
      }
      const targetMember = await base44.entities.MemberProfile.get(targetMemberProfileId);
      if (!targetMember) {
        return Response.json({ error: 'Target member not found' }, { status: 404 });
      }
      const badgeName = text(payload.badgeName || payload.badge_name);
      const commendation = text(payload.commendation || payload.message);
      const ribbon = text(payload.ribbon || payload.ribbonName);
      const medal = text(payload.medal || payload.medalName);
      if (!badgeName && !commendation && !ribbon && !medal) {
        return Response.json({ error: 'Provide at least one recognition field (badge, commendation, ribbon, medal)' }, { status: 400 });
      }

      const details = {
        event_id: eventId,
        target_member_profile_id: targetMemberProfileId,
        badge_name: badgeName,
        commendation,
        ribbon,
        medal,
        note: text(payload.note || ''),
        awarded_at: nowIso,
        awarded_by_member_profile_id: actorMemberId,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_RECOGNITION',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Recognition awarded to ${targetMemberProfileId}`,
        details,
      });

      if (targetMemberProfileId !== actorMemberId) {
        await notifyMembers(
          base44,
          [targetMemberProfileId],
          'Operation Recognition Awarded',
          badgeName || commendation || ribbon || medal,
          eventId
        );
      }

      return Response.json({
        success: true,
        action,
        recognition: details,
        logId: log?.id || null,
      });
    }

    if (action === 'record_blueprint_usage') {
      const blueprintName = text(payload.blueprintName || payload.name);
      if (!blueprintName) {
        return Response.json({ error: 'blueprintName required' }, { status: 400 });
      }
      const details = {
        event_id: eventId,
        blueprint_name: blueprintName,
        notes: text(payload.notes || ''),
        recorded_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_BLUEPRINT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Blueprint used: ${blueprintName}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        blueprint: details,
        logId: log?.id || null,
      });
    }

    if (action === 'record_smart_schedule') {
      const proposedStartTime = iso(payload.proposedStartTime || payload.start_time);
      if (!proposedStartTime) {
        return Response.json({ error: 'proposedStartTime required (ISO date)' }, { status: 400 });
      }

      let updatedEvent = event;
      if (commandAccess) {
        try {
          updatedEvent = await applyFirstSuccessfulEventUpdate(base44, eventId, [
            { start_time: proposedStartTime },
          ]);
        } catch (error) {
          console.error('[updateMissionControl] Smart schedule update failed:', error.message);
        }
      }

      const details = {
        event_id: eventId,
        previous_start_time: event?.start_time || null,
        proposed_start_time: proposedStartTime,
        rationale: text(payload.rationale || ''),
        applied_by_member_profile_id: actorMemberId,
        applied_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_SMART_SCHEDULE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Smart schedule recommendation applied`,
        details,
      });

      return Response.json({
        success: true,
        action,
        schedule: details,
        event: updatedEvent,
        logId: log?.id || null,
      });
    }

    if (action === 'get_operation_execution_state') {
      const eventLogs = await base44.entities.EventLog.list('-created_date', 1200);
      const scopedLogs = (eventLogs || []).filter((entry: any) => eventIdForLog(entry) === eventId);
      const participants = base44.entities.EventParticipant?.filter
        ? await base44.entities.EventParticipant.filter({ eventId }).catch(() => [])
        : [];

      const checklistItems = getChecklistItems(scopedLogs, eventId);
      const roleCards = getRoleCards(scopedLogs, eventId);
      const quantumSync = getLatestQuantumSync(scopedLogs, eventId);
      const voiceTopology = getVoiceTopology(scopedLogs, eventId);
      const contractLinks = getContractLinks(scopedLogs, eventId);
      const tacticalCallouts = getTacticalCallouts(scopedLogs, eventId);
      const voiceModeration = getVoiceModeration(scopedLogs, eventId);

      const doneChecklist = checklistItems.filter((item: any) => item.status === 'DONE').length;
      const checklistPct = checklistItems.length > 0 ? Math.round((doneChecklist / checklistItems.length) * 100) : 0;

      return Response.json({
        success: true,
        action,
        state: {
          event_id: eventId,
          checklistItems,
          roleCards,
          quantumSync,
          voiceTopology,
          contractLinks,
          tacticalCallouts,
          voiceModeration,
          attendanceCount: Array.isArray(participants) ? participants.length : 0,
          checklistCompletion: checklistPct,
        },
      });
    }

    if (action === 'provision_operation_voice_topology') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      if (!base44.entities.VoiceNet?.create) {
        return Response.json({ error: 'VoiceNet entity unavailable' }, { status: 503 });
      }

      const mode = text(payload.mode || event?.event_type || 'casual').toLowerCase() === 'focused' ? 'focused' : 'casual';
      const includeAir = payload.includeAir !== false;
      const includeLogistics = payload.includeLogistics !== false;
      const eventPrefix = text(event?.title || eventId).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || eventId.slice(-4).toUpperCase();
      const lanes = [
        { code: `${eventPrefix}-CMD`, label: 'Command', type: 'command', priority: 1 },
        { code: `${eventPrefix}-SQA`, label: 'Squad A', type: 'squad', priority: 2 },
        { code: `${eventPrefix}-SQB`, label: 'Squad B', type: 'squad', priority: 2 },
      ];
      if (includeLogistics) {
        lanes.push({ code: `${eventPrefix}-LOG`, label: 'Logistics', type: 'support', priority: 2 });
      }
      if (includeAir) {
        lanes.push({ code: `${eventPrefix}-AIR`, label: 'Air Wing', type: 'squad', priority: 2 });
      }

      const createdNets: Array<Record<string, unknown>> = [];
      for (const lane of lanes) {
        const net = await createVoiceNetWithFallback(base44, {
          code: lane.code,
          label: `${text(event?.title, 'Operation')} ${lane.label}`,
          type: lane.type,
          discipline: mode,
          status: 'active',
          priority: lane.priority,
          event_id: eventId,
          stage_mode: mode === 'focused',
          min_rank_to_tx: lane.type === 'command' ? 'SCOUT' : 'VAGRANT',
          min_rank_to_rx: 'VAGRANT',
        });
        createdNets.push({
          id: net?.id || null,
          code: text(net?.code || lane.code),
          label: text(net?.label || lane.label),
          type: text(net?.type || lane.type),
          discipline: text(net?.discipline || mode),
          priority: net?.priority ?? lane.priority,
        });
      }

      const details = {
        event_id: eventId,
        mode,
        nets: createdNets,
        provisioned_at: nowIso,
        provisioned_by_member_profile_id: actorMemberId,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_VOICE_TOPOLOGY',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Provisioned operation voice topology (${mode})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        topology: details,
        logId: log?.id || null,
      });
    }

    if (action === 'record_preflight_checklist') {
      const itemId = text(payload.itemId || payload.item_id, `pref_${Date.now()}`);
      const label = text(payload.label || payload.itemLabel);
      if (!label) {
        return Response.json({ error: 'label required' }, { status: 400 });
      }
      const status = text(payload.status || 'PENDING').toUpperCase();
      const normalizedStatus = CHECKLIST_STATUS.has(status) ? status : 'PENDING';
      const details = {
        event_id: eventId,
        item_id: itemId,
        label,
        category: text(payload.category || 'general'),
        status: normalizedStatus,
        required: Boolean(payload.required),
        role: text(payload.role || ''),
        updated_at: nowIso,
        updated_by_member_profile_id: actorMemberId,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_PREFLIGHT_CHECKLIST',
        severity: normalizedStatus === 'BLOCKED' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Checklist ${normalizedStatus.toLowerCase()}: ${label}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        checklistItem: details,
        logId: log?.id || null,
      });
    }

    if (action === 'set_quantum_sync_timer') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const rallyAt = toIsoOrNull(payload.rallyAt || payload.rally_at);
      const launchAt = toIsoOrNull(payload.launchAt || payload.launch_at);
      const fallbackAt = toIsoOrNull(payload.fallbackAt || payload.fallback_at);
      if (!rallyAt && !launchAt && !fallbackAt) {
        return Response.json({ error: 'At least one of rallyAt, launchAt, or fallbackAt is required' }, { status: 400 });
      }

      const details = {
        event_id: eventId,
        rally_at: rallyAt,
        launch_at: launchAt,
        fallback_at: fallbackAt,
        rationale: text(payload.rationale || ''),
        synchronized_by_member_profile_id: actorMemberId,
        synchronized_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_QUANTUM_SYNC',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Quantum sync timer updated',
        details,
      });

      return Response.json({
        success: true,
        action,
        quantumSync: details,
        logId: log?.id || null,
      });
    }

    if (action === 'assign_operation_role_card') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const memberProfileId = text(payload.memberProfileId || payload.member_profile_id);
      const role = text(payload.role || payload.role_name);
      if (!memberProfileId || !role) {
        return Response.json({ error: 'memberProfileId and role are required' }, { status: 400 });
      }

      const details = {
        event_id: eventId,
        member_profile_id: memberProfileId,
        role,
        ship: text(payload.ship || ''),
        loadout: text(payload.loadout || ''),
        notes: text(payload.notes || ''),
        assigned_by_member_profile_id: actorMemberId,
        assigned_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_ROLE_CARD',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Role card assigned: ${memberProfileId} (${role})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        roleCard: details,
        logId: log?.id || null,
      });
    }

    if (action === 'push_tactical_callout') {
      const message = text(payload.message || payload.callout);
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }
      const priority = text(payload.priority || 'STANDARD').toUpperCase();
      const normalizedPriority = CALL_PRIORITIES.has(priority) ? priority : 'STANDARD';
      if (normalizedPriority !== 'STANDARD' && !commandAccess) {
        return Response.json({ error: 'Command privileges required for HIGH/CRITICAL callouts' }, { status: 403 });
      }
      const calloutType = text(payload.calloutType || payload.callout_type || 'STATUS').toUpperCase();
      const details = {
        event_id: eventId,
        message,
        priority: normalizedPriority,
        callout_type: calloutType,
        marker: payload.marker || null,
        objective_status: text(payload.objectiveStatus || payload.objective_status || ''),
        actor_member_profile_id: actorMemberId,
        issued_at: nowIso,
      };

      let relayedMessageId: string | null = null;
      const relayChannelId = text(payload.channelId || payload.channel_id);
      if (relayChannelId) {
        const relayMessage = await createFirstSuccessful(base44.entities.Message, [
          {
            channel_id: relayChannelId,
            user_id: actorMemberId,
            content: `[${normalizedPriority}] ${message}`,
          },
          {
            channel_id: relayChannelId,
            content: `[${normalizedPriority}] ${message}`,
          },
        ]);
        relayedMessageId = relayMessage?.id || null;
      }

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_TACTICAL_CALLOUT',
        severity: normalizedPriority === 'CRITICAL' ? 'MEDIUM' : normalizedPriority === 'HIGH' ? 'LOW' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Tactical callout (${normalizedPriority})`,
        details,
      });

      if (normalizedPriority === 'CRITICAL') {
        const notifyTargets = Array.from(new Set([...assignedMembers, text(event?.host_id || '')].filter(Boolean)));
        await notifyMembers(base44, notifyTargets, 'Critical Tactical Callout', message, eventId);
      }

      return Response.json({
        success: true,
        action,
        callout: details,
        relayedMessageId,
        logId: log?.id || null,
      });
    }

    if (action === 'link_contract_post') {
      const contractPostId = text(payload.contractPostId || payload.contract_post_id);
      if (!contractPostId) {
        return Response.json({ error: 'contractPostId required' }, { status: 400 });
      }
      const post = base44.entities.MissionBoardPost?.get
        ? await base44.entities.MissionBoardPost.get(contractPostId).catch(() => null)
        : null;
      if (!post) {
        return Response.json({ error: 'Contract post not found' }, { status: 404 });
      }

      const details = {
        event_id: eventId,
        contract_post_id: contractPostId,
        title: text(post?.title || contractPostId),
        contract_type: text(post?.type || ''),
        status: text(post?.status || ''),
        linked_by_member_profile_id: actorMemberId,
        linked_at: nowIso,
      };

      try {
        const existing = Array.isArray(event?.linked_contract_post_ids)
          ? event.linked_contract_post_ids.map((entry: unknown) => text(entry)).filter(Boolean)
          : [];
        const next = Array.from(new Set([...existing, contractPostId]));
        await applyFirstSuccessfulEventUpdate(base44, eventId, [
          { linked_contract_post_ids: next },
          { linked_contract_ids: next },
        ]);
      } catch (error) {
        console.error('[updateMissionControl] Contract link field update failed:', error.message);
      }

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_CONTRACT_LINK',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Linked contract ${contractPostId}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        contract: details,
        logId: log?.id || null,
      });
    }

    if (action === 'moderate_operation_voice') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const moderationAction = text(payload.moderationAction || payload.moderation_action).toUpperCase();
      const targetMemberProfileId = text(payload.targetMemberProfileId || payload.target_member_profile_id);
      if (!VOICE_MOD_ACTIONS.has(moderationAction)) {
        return Response.json({ error: 'Unsupported moderation action' }, { status: 400 });
      }
      if (!targetMemberProfileId && moderationAction !== 'LOCK_CHANNEL' && moderationAction !== 'UNLOCK_CHANNEL') {
        return Response.json({ error: 'targetMemberProfileId required for this moderation action' }, { status: 400 });
      }

      const details = {
        event_id: eventId,
        moderation_action: moderationAction,
        target_member_profile_id: targetMemberProfileId || null,
        channel_id: text(payload.channelId || payload.channel_id || ''),
        reason: text(payload.reason || ''),
        moderated_by_member_profile_id: actorMemberId,
        moderated_at: nowIso,
      };

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_VOICE_MODERATION',
        severity: moderationAction === 'KICK' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Voice moderation: ${moderationAction}`,
        details,
      });

      if (targetMemberProfileId && targetMemberProfileId !== actorMemberId) {
        await notifyMembers(
          base44,
          [targetMemberProfileId],
          'Voice Moderation Action',
          `${moderationAction}${details.reason ? ` - ${details.reason}` : ''}`,
          eventId
        );
      }

      return Response.json({
        success: true,
        action,
        moderation: details,
        logId: log?.id || null,
      });
    }

    if (action === 'generate_operation_debrief') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      if (!base44.entities.EventReport?.create) {
        return Response.json({ error: 'EventReport entity unavailable' }, { status: 503 });
      }

      const eventLogs = await base44.entities.EventLog.list('-created_date', 1400);
      const scopedLogs = (eventLogs || []).filter((entry: any) => eventIdForLog(entry) === eventId);
      const participants = base44.entities.EventParticipant?.filter
        ? await base44.entities.EventParticipant.filter({ eventId }).catch(() => [])
        : [];
      const checklistItems = getChecklistItems(scopedLogs, eventId);
      const callouts = getTacticalCallouts(scopedLogs, eventId);
      const voiceModeration = getVoiceModeration(scopedLogs, eventId);
      const beacons = scopedLogs.filter((entry: any) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_BEACON').length;
      const positionUpdates = scopedLogs.filter((entry: any) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_POSITION').length;
      const objectiveTotal = Array.isArray(event?.objectives) ? event.objectives.length : 0;
      const objectiveDone = Array.isArray(event?.objectives) ? event.objectives.filter((entry: any) => entry?.is_completed).length : 0;
      const checklistDone = checklistItems.filter((item: any) => item.status === 'DONE').length;
      const checklistPct = checklistItems.length > 0 ? Math.round((checklistDone / checklistItems.length) * 100) : 0;
      const responseMs = callouts.length > 1
        ? Math.max(0, Math.round((new Date(callouts[0].created_date || nowIso).getTime() - new Date(callouts[callouts.length - 1].created_date || nowIso).getTime()) / callouts.length))
        : 0;

      const topMoments = callouts
        .filter((entry: any) => entry.priority === 'CRITICAL' || entry.priority === 'HIGH')
        .slice(0, 5)
        .map((entry: any) => entry.message);

      const metrics = {
        attendance_count: Array.isArray(participants) ? participants.length : 0,
        objective_completion_pct: objectiveTotal > 0 ? Math.round((objectiveDone / objectiveTotal) * 100) : 0,
        checklist_completion_pct: checklistPct,
        tactical_callouts: callouts.length,
        critical_beacons: beacons,
        position_updates: positionUpdates,
        moderation_actions: voiceModeration.length,
        response_time_ms_estimate: responseMs,
      };

      const summary = [
        `${text(event?.title, 'Operation')} automated debrief`,
        `Attendance ${metrics.attendance_count}, objectives ${objectiveDone}/${objectiveTotal || 0}, checklist ${metrics.checklist_completion_pct}%`,
        `Callouts ${metrics.tactical_callouts}, beacons ${metrics.critical_beacons}, moderation ${metrics.moderation_actions}`,
      ].join(' | ');

      const report = await createFirstSuccessful(base44.entities.EventReport, [
        {
          event_id: eventId,
          report_type: 'AAR_AUTO_DEBRIEF',
          summary,
          key_moments: topMoments,
          tags: ['auto', 'debrief', 'operations'],
          metrics,
          created_by: actorMemberId,
        },
        {
          event_id: eventId,
          report_type: 'AAR_AUTO_DEBRIEF',
          summary,
          created_by: actorMemberId,
        },
      ]);

      const log = await writeMissionLog(base44, {
        type: 'MISSION_CONTROL_AUTO_DEBRIEF',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Generated operation debrief report`,
        details: {
          event_id: eventId,
          report_id: report?.id || null,
          metrics,
          generated_at: nowIso,
        },
      });

      return Response.json({
        success: true,
        action,
        report,
        metrics,
        logId: log?.id || null,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateMissionControl] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
