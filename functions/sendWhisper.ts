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

    // Check permissions - must be Pioneer, Founder, or Voyager
    const allowedRanks = ['PIONEER', 'FOUNDER', 'VOYAGER'];
    const memberRank = (memberProfile.rank || '').toUpperCase();
    if (!allowedRanks.includes(memberRank) && !isAdminMember(memberProfile)) {
      return Response.json({ 
        error: 'Insufficient rank - Pioneer or higher required' 
      }, { status: 403 });
    }

    const { message, targetType, targetIds, eventId, netId } = payload;

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
      const allMembers = await base44.entities.MemberProfile.list();
      for (const roleId of targetIds) {
        const role = await base44.entities.Role.get(roleId);
        if (role) {
          recipientNames.push(role.name);
          const membersWithRole = allMembers.filter(m => 
            Array.isArray(m.roles) && m.roles.includes(role.name)
          );
          recipientUserIds.push(...membersWithRole.map(m => m.id));
        }
      }
    } else if (targetType === 'rank') {
      // Get users with specific ranks
      const allMembers = await base44.entities.MemberProfile.list();
      for (const rank of targetIds) {
        recipientNames.push(rank);
        const membersWithRank = allMembers.filter(m => (m.rank || '').toUpperCase() === rank.toUpperCase());
        recipientUserIds.push(...membersWithRank.map(m => m.id));
      }
    } else if (targetType === 'squad') {
      // Get users in specific squads
      for (const squadId of targetIds) {
        const squad = await base44.entities.Squad.get(squadId);
        if (squad) {
          recipientNames.push(squad.name);
          const memberships = await base44.entities.SquadMembership.filter({
            squad_id: squadId,
            status: 'active'
          });
          recipientUserIds.push(...memberships.map(m => m.member_profile_id || m.user_id));
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
    const whisperMessage = await base44.entities.Message.create({
      channel_id: netId || eventId || 'global',
      user_id: memberProfile.id,
      content: `[WHISPER to ${recipientNames.join(', ')}] ${message}`,
      whisper_metadata: {
        is_whisper: true,
        sender_member_profile_id: memberProfile.id,
        sender_name: memberProfile.display_callsign || memberProfile.callsign || memberProfile.full_name,
        target_type: targetType,
        target_ids: targetIds,
        recipient_member_profile_ids: recipientUserIds,
        sent_at: new Date().toISOString()
      }
    });

    // Create notifications for each recipient
    for (const recipientId of recipientUserIds) {
      await base44.entities.Notification.create({
        user_id: recipientId,
        type: 'direct_message',
        title: 'Whisper from Command',
        message: `${memberProfile.display_callsign || memberProfile.callsign}: ${message}`,
        related_entity_type: 'message',
        related_entity_id: whisperMessage.id,
        is_read: false
      });
    }

    // Log the whisper
    await base44.entities.EventLog.create({
      event_id: eventId || null,
      type: 'COMMS',
      severity: 'LOW',
      actor_member_profile_id: memberProfile.id,
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
