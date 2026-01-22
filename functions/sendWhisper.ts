import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - must be Pioneer, Founder, or Voyager
    const allowedRanks = ['Pioneer', 'Founder', 'Voyager'];
    if (!allowedRanks.includes(user.rank)) {
      return Response.json({ 
        error: 'Insufficient rank - Pioneer or higher required' 
      }, { status: 403 });
    }

    const { message, targetType, targetIds, eventId, netId } = await req.json();

    if (!message || !targetType || !targetIds || targetIds.length === 0) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Fetch target users based on type
    let recipientUserIds = [];
    let recipientNames = [];

    if (targetType === 'role') {
      // Get users with specific roles
      const allUsers = await base44.asServiceRole.entities.User.list();
      for (const roleId of targetIds) {
        const role = await base44.asServiceRole.entities.Role.get(roleId);
        if (role) {
          recipientNames.push(role.name);
          const usersWithRole = allUsers.filter(u => 
            u.assigned_role_ids?.includes(roleId)
          );
          recipientUserIds.push(...usersWithRole.map(u => u.id));
        }
      }
    } else if (targetType === 'rank') {
      // Get users with specific ranks
      const allUsers = await base44.asServiceRole.entities.User.list();
      for (const rank of targetIds) {
        recipientNames.push(rank);
        const usersWithRank = allUsers.filter(u => u.rank === rank);
        recipientUserIds.push(...usersWithRank.map(u => u.id));
      }
    } else if (targetType === 'squad') {
      // Get users in specific squads
      for (const squadId of targetIds) {
        const squad = await base44.asServiceRole.entities.Squad.get(squadId);
        if (squad) {
          recipientNames.push(squad.name);
          const memberships = await base44.asServiceRole.entities.SquadMembership.filter({
            squad_id: squadId,
            status: 'active'
          });
          recipientUserIds.push(...memberships.map(m => m.user_id));
        }
      }
    }

    // Remove duplicates
    recipientUserIds = [...new Set(recipientUserIds)];

    if (recipientUserIds.length === 0) {
      return Response.json({ 
        error: 'No recipients found' 
      }, { status: 400 });
    }

    // Create whisper message
    const whisperMessage = await base44.asServiceRole.entities.Message.create({
      channel_id: netId || eventId || 'global',
      user_id: user.id,
      content: `[WHISPER to ${recipientNames.join(', ')}] ${message}`,
      whisper_metadata: {
        is_whisper: true,
        sender_id: user.id,
        sender_name: user.callsign || user.rsi_handle || user.full_name,
        target_type: targetType,
        target_ids: targetIds,
        recipient_user_ids: recipientUserIds,
        sent_at: new Date().toISOString()
      }
    });

    // Create notifications for each recipient
    for (const recipientId of recipientUserIds) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: recipientId,
        type: 'direct_message',
        title: 'Whisper from Command',
        message: `${user.callsign || user.rsi_handle}: ${message}`,
        related_entity_type: 'message',
        related_entity_id: whisperMessage.id,
        is_read: false
      });
    }

    // Log the whisper
    await base44.asServiceRole.entities.EventLog.create({
      event_id: eventId || null,
      type: 'COMMS',
      severity: 'LOW',
      actor_user_id: user.id,
      summary: `Whisper sent to ${recipientNames.join(', ')} (${recipientUserIds.length} recipients)`,
      details: {
        target_type: targetType,
        targets: recipientNames
      }
    });

    return Response.json({
      status: 'success',
      message_id: whisperMessage.id,
      recipients_count: recipientUserIds.length,
      targets: recipientNames
    });

  } catch (error) {
    console.error('Whisper error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});