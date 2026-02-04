import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { extractRouteTags, getRoutingRules, resolveTargetNames } from './_shared/channelRouting.ts';

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

    const { messageId, channelId, content, isRouted } = payload || {};
    if (!messageId || !channelId || !content) {
      return Response.json({ success: false, message: 'Missing message fields' }, { status: 400 });
    }

    if (isRouted) {
      return Response.json({ success: true, routed: [] });
    }

    const tags = extractRouteTags(content);
    if (tags.length === 0) {
      return Response.json({ success: true, routed: [] });
    }

    const rules = await getRoutingRules(base44);
    const targetNames = resolveTargetNames(tags, rules);
    if (targetNames.length === 0) {
      return Response.json({ success: true, routed: [] });
    }

    const channels = await base44.entities.Channel.list();
    const channelMap = new Map(
      (channels || []).map((channel: any) => [channel.name?.toLowerCase(), channel])
    );

    const sourceChannel = channels?.find((ch: any) => ch.id === channelId);
    const sourceName = sourceChannel?.name || 'channel';

    const actorId = memberProfile?.id || adminUser?.id || null;
    const actorLabel =
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.full_name ||
      adminUser?.email ||
      'System';

    const routedIds: string[] = [];

    for (const targetName of targetNames) {
      const targetChannel = channelMap.get(targetName);
      if (!targetChannel) continue;
      if (targetChannel.id === channelId) continue;

      const routedMessage = await base44.asServiceRole.entities.Message.create({
        channel_id: targetChannel.id,
        user_id: actorId || 'system',
        content: `[Routed from #${sourceName}] ${content}`,
        routed_from_channel_id: channelId,
        routed_from_message_id: messageId,
        is_routed: true,
        routed_by: actorId,
        routed_by_label: actorLabel,
      });

      routedIds.push(routedMessage.id);
    }

    return Response.json({ success: true, routed: routedIds });
  } catch (error) {
    console.error('[routeChannelMessage] Error:', error?.message);
    return Response.json({ success: false, error: error?.message }, { status: 500 });
  }
});
