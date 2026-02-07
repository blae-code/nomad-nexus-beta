import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'operations', 'mission-control']);
const BEACON_SEVERITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

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

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateMissionControl] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
