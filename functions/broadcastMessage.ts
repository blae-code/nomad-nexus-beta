import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const normalize = (value: string) => value.toLowerCase().trim();

const resolveChannelsByName = (channels: any[], names: string[]) => {
  const nameSet = new Set(names.map((name) => normalize(name)));
  return channels.filter((ch) => nameSet.has(normalize(ch.name || '')) || nameSet.has(normalize(ch.slug || '')));
};

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

    const actor = memberProfile || adminUser;
    const actorId = actor?.id;
    const rank = (memberProfile?.rank || '').toString().toUpperCase();
    const roles = (memberProfile?.roles || []).map((r: string) => r.toString().toLowerCase());
    const allowedRanks = ['FOUNDER', 'PIONEER', 'VOYAGER'];
    const allowedRoles = new Set(['admin', 'commander', 'command']);

    if (!isAdminMember(memberProfile) && !allowedRanks.includes(rank) && !roles.some((r) => allowedRoles.has(r))) {
      return Response.json({ error: 'Insufficient permissions to broadcast' }, { status: 403 });
    }

    const {
      message,
      channelIds = [],
      channelNames = [],
      scope,
      scopeNames = [],
      eventId,
      channelId,
    } = payload || {};

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const channels = await base44.entities.Channel.list();
    let targetChannels: any[] = [];

    if (Array.isArray(channelIds) && channelIds.length > 0) {
      const idSet = new Set(channelIds);
      targetChannels = channels.filter((ch: any) => idSet.has(ch.id));
    } else if (Array.isArray(channelNames) && channelNames.length > 0) {
      targetChannels = resolveChannelsByName(channels, channelNames);
    } else if (channelId) {
      targetChannels = channels.filter((ch: any) => ch.id === channelId);
    } else if (scope) {
      const normalizedScope = normalize(scope);
      if (normalizedScope === 'fleet') {
        targetChannels = channels.filter((ch: any) => !ch.is_dm);
      } else if (normalizedScope === 'squad' || normalizedScope === 'wing') {
        const scopeSet = new Set((scopeNames || []).map((name: string) => normalize(name)));
        targetChannels = channels.filter((ch: any) => {
          if (ch.is_dm) return false;
          if (ch.category !== 'squad') return false;
          if (!scopeSet.size) return true;
          return scopeSet.has(normalize(ch.name || '')) || scopeSet.has(normalize(ch.slug || ''));
        });
      } else {
        targetChannels = channels.filter((ch: any) => !ch.is_dm);
      }
    }

    targetChannels = targetChannels.filter((ch) => ch && ch.id);
    const uniqueIds = new Set(targetChannels.map((ch) => ch.id));
    targetChannels = targetChannels.filter((ch) => uniqueIds.has(ch.id));

    if (!targetChannels.length) {
      return Response.json({ error: 'No target channels found' }, { status: 404 });
    }

    const broadcastMetadata = {
      is_broadcast: true,
      scope: scope || null,
      channel_ids: targetChannels.map((ch) => ch.id),
      sender_member_profile_id: actorId,
      sender_callsign: actor?.display_callsign || actor?.callsign || actor?.full_name || 'Command',
      sent_at: new Date().toISOString(),
    };

    const created = await Promise.all(
      targetChannels.map((channel) =>
        base44.entities.Message.create({
          channel_id: channel.id,
          user_id: actorId,
          content: message,
          broadcast_metadata: broadcastMetadata,
        })
      )
    );

    if (eventId) {
      try {
        await base44.entities.EventLog.create({
          event_id: eventId,
          type: 'COMMS',
          severity: 'MEDIUM',
          actor_member_profile_id: actorId,
          summary: `Broadcast to ${targetChannels.length} channels`,
          details: {
            channel_ids: targetChannels.map((ch) => ch.id),
            scope: scope || null,
          },
        });
      } catch {
        // ignore log errors
      }
    }

    return Response.json({
      success: true,
      channels: targetChannels.map((ch) => ({ id: ch.id, name: ch.name })),
      message_ids: created.map((msg) => msg?.id).filter(Boolean),
    });
  } catch (error) {
    console.error('[broadcastMessage] Error:', error?.message);
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});
