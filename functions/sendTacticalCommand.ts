import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has admin or command authority
    if (user.role !== 'admin' && user.rank !== 'Pioneer' && !user.is_system_administrator) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const { targetId, targetType, message, eventId } = await req.json();

    if (!targetId || !targetType || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log the command to event
    await base44.asServiceRole.entities.EventLog.create({
      event_id: eventId || targetId,
      timestamp: new Date().toISOString(),
      type: 'COMMS',
      severity: 'MEDIUM',
      actor_user_id: user.id,
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
      await base44.asServiceRole.entities.Notification.create({
        user_id: targetId,
        type: 'system',
        title: 'Tactical Command',
        message: `${user.callsign || user.email}: ${message}`,
        related_entity_type: 'event',
        related_entity_id: eventId
      });
    } else if (targetType === 'net') {
      // Broadcast to all users on net
      const presences = await base44.asServiceRole.entities.UserPresence.filter({ net_id: targetId });
      for (const presence of presences) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: presence.user_id,
          type: 'system',
          title: 'Net Command',
          message: `${user.callsign || user.email}: ${message}`,
          related_entity_type: 'event',
          related_entity_id: eventId
        });
      }
    } else if (targetType === 'event') {
      // Broadcast to all users on any voice net linked to this event
      const voiceNets = await base44.asServiceRole.entities.VoiceNet.filter({ event_id: eventId });
      for (const net of voiceNets) {
        const presences = await base44.asServiceRole.entities.UserPresence.filter({ net_id: net.id });
        for (const presence of presences) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: presence.user_id,
            type: 'system',
            title: 'Tactical Alert',
            message: `${user.callsign || user.email}: ${message}`,
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