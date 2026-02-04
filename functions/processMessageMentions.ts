import { getAuthContext, readJson } from './_shared/memberAuth.ts';

const MENTION_REGEX = /@([a-zA-Z0-9_-]{2,32})/g;
const SCOPED_REGEX = /@(role|rank|membership):([a-zA-Z0-9_-]{2,32})/gi;
const IGNORE_TOKENS = new Set(['all', 'here', 'everyone']);
const MAX_MENTIONS = 10;

function extractMentions(content: string) {
  if (!content || typeof content !== 'string') return [];
  const matches = content.matchAll(MENTION_REGEX);
  const tokens = new Set<string>();
  for (const match of matches) {
    const token = match?.[1]?.trim();
    if (!token) continue;
    const normalized = token.toLowerCase();
    if (IGNORE_TOKENS.has(normalized)) continue;
    tokens.add(token);
    if (tokens.size >= MAX_MENTIONS) break;
  }
  return Array.from(tokens);
}

function extractScopedMentions(content: string) {
  if (!content || typeof content !== 'string') return [];
  const matches = content.matchAll(SCOPED_REGEX);
  const results: Array<{ scope: string; value: string }> = [];
  for (const match of matches) {
    const scope = match?.[1]?.toLowerCase();
    const value = match?.[2]?.trim();
    if (!scope || !value) continue;
    results.push({ scope, value });
    if (results.length >= MAX_MENTIONS) break;
  }
  return results;
}

async function findMemberByToken(base44: any, token: string) {
  const variants = [token, token.toUpperCase(), token.toLowerCase()];
  for (const variant of variants) {
    try {
      const byCallsign = await base44.asServiceRole.entities.MemberProfile.filter({ callsign: variant });
      if (byCallsign?.[0]) return byCallsign[0];
    } catch {
      // ignore
    }
    try {
      const byDisplay = await base44.asServiceRole.entities.MemberProfile.filter({ display_callsign: variant });
      if (byDisplay?.[0]) return byDisplay[0];
    } catch {
      // ignore
    }
  }
  return null;
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

    const { messageId, channelId, content } = payload || {};
    if (!messageId || !channelId || !content) {
      return Response.json({ success: false, message: 'Missing message fields' }, { status: 400 });
    }

    const tokens = extractMentions(content);
    const scopedMentions = extractScopedMentions(content);
    if (tokens.length === 0 && scopedMentions.length === 0) {
      return Response.json({ success: true, mentions: [] });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorLabel =
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.callsign ||
      adminUser?.full_name ||
      adminUser?.email ||
      'System Admin';

    let channelName = '';
    try {
      const channel = await base44.entities.Channel.get(channelId);
      channelName = channel?.name || '';
    } catch {
      // ignore
    }

    const notified: string[] = [];

    const loadAllMembers = async () => {
      try {
        return await base44.asServiceRole.entities.MemberProfile.list();
      } catch {
        return [];
      }
    };
    for (const token of tokens) {
      const member = await findMemberByToken(base44, token);
      if (!member?.id) continue;
      if (actorMemberId && member.id === actorMemberId) continue;
      if (notified.includes(member.id)) continue;

      // Respect per-channel mute settings
      let muted = false;
      try {
        let prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
          user_id: member.id,
          channel_id: channelId,
        });
        if (!prefs || prefs.length === 0) {
          prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
            member_profile_id: member.id,
            channel_id: channelId,
          });
        }
        if (prefs?.[0]?.muted) muted = true;
      } catch {
        // ignore
      }

      if (muted) continue;

      await base44.asServiceRole.entities.Notification.create({
        user_id: member.id,
        type: 'mention',
        title: 'New mention',
        message: `${actorLabel} mentioned you in ${channelName ? `#${channelName}` : 'a channel'}`,
        channel_id: channelId,
        related_entity_type: 'message',
        related_entity_id: messageId,
        is_read: false,
      });

      notified.push(member.id);
    }

    if (scopedMentions.length > 0) {
      const allMembers = await loadAllMembers();
      for (const scoped of scopedMentions) {
        const scope = scoped.scope;
        const value = scoped.value.toString().toLowerCase();
        const matches = allMembers.filter((member: any) => {
          if (scope === 'rank') {
            return (member.rank || '').toString().toLowerCase() === value;
          }
          if (scope === 'membership') {
            return (member.membership || '').toString().toLowerCase() === value;
          }
          if (scope === 'role') {
            const roles = Array.isArray(member.roles) ? member.roles.map((r: any) => r.toString().toLowerCase()) : [];
            return roles.includes(value);
          }
          return false;
        });

        for (const member of matches) {
          if (!member?.id) continue;
          if (actorMemberId && member.id === actorMemberId) continue;
          if (notified.includes(member.id)) continue;

          let muted = false;
          try {
            let prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
              user_id: member.id,
              channel_id: channelId,
            });
            if (!prefs || prefs.length === 0) {
              prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
                member_profile_id: member.id,
                channel_id: channelId,
              });
            }
            if (prefs?.[0]?.muted) muted = true;
          } catch {
            // ignore
          }
          if (muted) continue;

          await base44.asServiceRole.entities.Notification.create({
            user_id: member.id,
            type: 'mention',
            title: 'New mention',
            message: `${actorLabel} mentioned ${scope}:${value} in ${channelName ? `#${channelName}` : 'a channel'}`,
            channel_id: channelId,
            related_entity_type: 'message',
            related_entity_id: messageId,
            is_read: false,
          });

          notified.push(member.id);
        }
      }
    }

    return Response.json({ success: true, mentions: notified });
  } catch (error) {
    console.error('[MENTIONS] Error:', error?.message);
    return Response.json({ error: error?.message, success: false }, { status: 500 });
  }
});
