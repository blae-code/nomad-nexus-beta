import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rank = (memberProfile?.rank || '').toUpperCase();
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin && !['FOUNDER', 'PIONEER', 'COMMANDER'].includes(rank)) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const {
      eventId,
      message,
      commandType,
      priority = 'STANDARD',
      targetType,
      targetIds,
      requiresAck = true,
      coordinates,
    } = payload;

    if (!message || !targetType || !Array.isArray(targetIds) || targetIds.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const targetMemberIds = new Set();

    if (targetType === 'member') {
      targetIds.forEach((id: string) => targetMemberIds.add(id));
    }

    if (targetType === 'squad') {
      for (const squadId of targetIds) {
        try {
          const memberships = await base44.entities.SquadMembership.filter({ squad_id: squadId });
          memberships.forEach((m: any) => {
            if (m.member_profile_id) targetMemberIds.add(m.member_profile_id);
          });
        } catch (error) {
          console.error('[issueTacticalOrder] Squad lookup failed:', error.message);
        }
      }
    }

    if (targetType === 'net') {
      for (const netId of targetIds) {
        try {
          const presences = await base44.entities.UserPresence.filter({ net_id: netId });
          presences.forEach((p: any) => {
            if (p.member_profile_id) targetMemberIds.add(p.member_profile_id);
            else if (p.user_id) targetMemberIds.add(p.user_id);
          });
        } catch (error) {
          console.error('[issueTacticalOrder] Net lookup failed:', error.message);
        }
      }
    }

    if (targetType === 'event') {
      for (const opId of targetIds) {
        try {
          const event = await base44.entities.Event.get(opId);
          const assigned = Array.isArray(event.assigned_member_profile_ids)
            ? event.assigned_member_profile_ids
            : Array.isArray(event.assigned_user_ids)
            ? event.assigned_user_ids
            : [];
          assigned.forEach((id: string) => targetMemberIds.add(id));
        } catch (error) {
          console.error('[issueTacticalOrder] Event lookup failed:', error.message);
        }
      }
    }

    const event_id = eventId || (targetType === 'event' ? targetIds[0] : null);

    const command = await base44.entities.TacticalCommand.create({
      event_id,
      message,
      command_type: commandType || 'ORDER',
      priority,
      status: 'ISSUED',
      target_type: targetType,
      target_ids: targetIds,
      target_member_profile_ids: Array.from(targetMemberIds),
      requires_ack: requiresAck,
      acknowledged_by_member_profile_ids: [],
      issued_by_member_profile_id: memberProfile?.id || null,
      issued_by_user_id: adminUser?.id || null,
      coordinates: coordinates || null,
      map_level: payload.mapLevel || null,
    });

    const notificationTargets = Array.from(targetMemberIds);
    for (const memberId of notificationTargets) {
      try {
        await base44.entities.Notification.create({
          user_id: memberId,
          type: 'system',
          title: 'Tactical Command',
          message: message,
          related_entity_type: 'tactical_command',
          related_entity_id: command.id,
        });
      } catch (error) {
        console.error('[issueTacticalOrder] Notification failed:', error.message);
      }
    }

    if (event_id) {
      await base44.entities.EventLog.create({
        event_id,
        type: 'COMMAND',
        severity: priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        actor_member_profile_id: memberProfile?.id || null,
        summary: message,
        details: {
          command_id: command.id,
          target_type: targetType,
          target_ids: targetIds,
        },
      });
    }

    return Response.json({ success: true, command });
  } catch (error) {
    console.error('[issueTacticalOrder] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
