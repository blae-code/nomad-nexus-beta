import { getAuthContext, readJson } from './_shared/memberAuth.ts';

async function isChannelMuted(base44: any, memberId: string, channelId: string) {
  try {
    let prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_id: memberId,
      channel_id: channelId,
    });
    if (!prefs || prefs.length === 0) {
      prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
        member_profile_id: memberId,
        channel_id: channelId,
      });
    }
    return Boolean(prefs?.[0]?.muted);
  } catch {
    return false;
  }
}

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

    const { parentMessageId, replyMessageId, channelId } = payload || {};
    if (!parentMessageId || !replyMessageId || !channelId) {
      return Response.json({ success: false, message: 'Missing message fields' }, { status: 400 });
    }

    const parentMessage = await base44.asServiceRole.entities.Message.get(parentMessageId);
    const replyMessage = await base44.asServiceRole.entities.Message.get(replyMessageId);
    if (!parentMessage || !replyMessage) {
      return Response.json({ success: false, message: 'Messages not found' }, { status: 404 });
    }

    const replierId = replyMessage.user_id;
    const actorLabel =
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.full_name ||
      adminUser?.email ||
      'System';

    const notifyIds = new Set<string>();
    if (parentMessage.user_id) notifyIds.add(parentMessage.user_id);
    if (Array.isArray(parentMessage.thread_participants)) {
      parentMessage.thread_participants.forEach((id: string) => notifyIds.add(id));
    }

    // Include explicit followers if entity exists
    try {
      const follows = await base44.asServiceRole.entities.ThreadSubscription.filter({
        thread_message_id: parentMessageId,
        is_following: true,
      });
      follows?.forEach((follow: any) => {
        if (follow.user_id) notifyIds.add(follow.user_id);
        if (follow.member_profile_id) notifyIds.add(follow.member_profile_id);
      });
    } catch {
      // ignore missing entity
    }

    notifyIds.delete(replierId);

    const notified: string[] = [];
    for (const memberId of notifyIds) {
      if (!memberId) continue;
      const muted = await isChannelMuted(base44, memberId, channelId);
      if (muted) continue;

      await base44.asServiceRole.entities.Notification.create({
        user_id: memberId,
        type: 'thread_reply',
        title: 'Thread reply',
        message: `${actorLabel} replied in a thread`,
        channel_id: channelId,
        related_entity_type: 'message',
        related_entity_id: parentMessageId,
        is_read: false,
      });

      notified.push(memberId);
    }

    return Response.json({ success: true, notified });
  } catch (error) {
    console.error('[processThreadReplyNotifications] Error:', error?.message);
    return Response.json({ success: false, error: error?.message }, { status: 500 });
  }
});
