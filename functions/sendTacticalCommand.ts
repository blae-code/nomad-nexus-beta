import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType || !memberProfile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has admin or command authority
    const rank = (memberProfile.rank || '').toUpperCase();
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isSysAdmin = memberProfile.is_system_administrator === true;
    if (!isAdmin && rank !== 'PIONEER' && !isSysAdmin) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const { targetId, targetType, message, eventId } = payload;

    if (!targetId || !targetType || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log the command to event
    await base44.entities.EventLog.create({
      event_id: eventId || targetId,
      timestamp: new Date().toISOString(),
      type: 'COMMS',
      severity: 'MEDIUM',
      actor_member_profile_id: memberProfile.id,
      summary: message,
      details: {
        command: message,
        target_id: targetId,
        target_type: targetType
      }
    });

    // Broadcast based on target type
    if (targetType === 'user') {
      // Notify target user
      await base44.entities.Notification.create({
        user_id: targetId,
        type: 'system',
        title: 'Tactical Command',
        message: `${memberProfile.display_callsign || memberProfile.callsign || memberProfile.full_name}: ${message}`,
        related_entity_type: 'event',
        related_entity_id: eventId
      });
    } else if (targetType === 'net') {
      // Broadcast to all users on net
      const presences = await base44.entities.UserPresence.filter({ net_id: targetId });
      for (const presence of presences) {
        await base44.entities.Notification.create({
          user_id: presence.member_profile_id || presence.user_id,
          type: 'system',
          title: 'Net Command',
          message: `${memberProfile.display_callsign || memberProfile.callsign || memberProfile.full_name}: ${message}`,
          related_entity_type: 'event',
          related_entity_id: eventId
        });
      }
    } else if (targetType === 'event') {
      // Broadcast to all users on any voice net linked to this event
      const voiceNets = await base44.entities.VoiceNet.filter({ event_id: eventId });
      for (const net of voiceNets) {
        const presences = await base44.entities.UserPresence.filter({ net_id: net.id });
        for (const presence of presences) {
          await base44.entities.Notification.create({
            user_id: presence.member_profile_id || presence.user_id,
            type: 'system',
            title: 'Tactical Alert',
            message: `${memberProfile.display_callsign || memberProfile.callsign || memberProfile.full_name}: ${message}`,
            related_entity_type: 'event',
            related_entity_id: eventId
          });
        }
      }
    }

    return Response.json({ 
      success: true,
      message: 'Command sent successfully'
    });

  } catch (error) {
    console.error('Error sending tactical command:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
