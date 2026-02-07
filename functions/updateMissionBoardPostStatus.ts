import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

type UpdateAttempt = Record<string, unknown>;

async function applyFirstSuccessfulUpdate(
  base44: any,
  postId: string,
  attempts: UpdateAttempt[]
) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.MissionBoardPost.update(postId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Mission post update failed');
}

function asStringArray(input: unknown) {
  return Array.isArray(input) ? input.map((v) => String(v)) : [];
}

function normalizeToken(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function extractRequiredRoles(tags: string[]) {
  const required = new Set<string>();
  for (const tag of tags) {
    const text = String(tag || '').trim();
    const lower = text.toLowerCase();
    if (lower.startsWith('role:')) {
      const token = normalizeToken(text.slice(5));
      if (token) required.add(token);
      continue;
    }
    if (lower.startsWith('roles:')) {
      const list = text
        .slice(6)
        .split(/[|,]/)
        .map((entry) => normalizeToken(entry))
        .filter(Boolean);
      list.forEach((entry) => required.add(entry));
    }
  }
  return Array.from(required);
}

function getActorRoles(memberProfile: any) {
  const resolved = new Set<string>();
  const rank = normalizeToken(memberProfile?.rank);
  if (rank) resolved.add(rank);

  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles
    : memberProfile?.roles
    ? [memberProfile.roles]
    : [];
  for (const role of roles) {
    const token = normalizeToken(role);
    if (token) resolved.add(token);
  }

  return resolved;
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

    const { postId, action } = payload;
    if (!postId || !action) {
      return Response.json({ error: 'postId and action required' }, { status: 400 });
    }

    const post = await base44.entities.MissionBoardPost.get(postId);
    if (!post) {
      return Response.json({ error: 'Mission post not found' }, { status: 404 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorAdminId = adminUser?.id || null;
    const actorId = actorMemberId || actorAdminId;
    if (!actorId) {
      return Response.json({ error: 'Actor not resolved' }, { status: 400 });
    }

    const actorRank = (memberProfile?.rank || '').toString().toUpperCase();
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isCommandRank = COMMAND_RANKS.has(actorRank);
    const isPoster = actorMemberId && post.posted_by_member_profile_id === actorMemberId;
    const isClaimer = actorMemberId && post.claimed_by_member_profile_id === actorMemberId;
    const elevated = Boolean(isAdmin || isCommandRank);

    const normalizedAction = String(action).toLowerCase();
    const nowIso = new Date().toISOString();
    const tags = asStringArray(post.tags);
    const requiredRoles = extractRequiredRoles(tags);
    const actorRoles = getActorRoles(memberProfile);

    let attempts: UpdateAttempt[] = [];
    let nextStatus = post.status || 'open';

    if (normalizedAction === 'claim') {
      if (!['open', 'OPEN'].includes(String(post.status || 'open'))) {
        return Response.json({ error: 'Only open posts can be claimed' }, { status: 409 });
      }

      if (!elevated && requiredRoles.length > 0) {
        const hasRoleMatch = requiredRoles.some((required) => actorRoles.has(required));
        if (!hasRoleMatch) {
          return Response.json(
            {
              error: 'Role requirements not met for this mission',
              requiredRoles,
            },
            { status: 403 }
          );
        }
      }

      nextStatus = 'claimed';
      attempts = [
        {
          status: 'claimed',
          claimed_by_member_profile_id: actorMemberId,
          claimed_by_user_id: actorAdminId,
          claimed_at: nowIso,
        },
        {
          status: 'claimed',
          claimed_by_member_profile_id: actorMemberId,
        },
        { status: 'claimed' },
      ];
    } else if (normalizedAction === 'complete') {
      if (String(post.status || '').toLowerCase() !== 'claimed' && !elevated) {
        return Response.json({ error: 'Only claimed posts can be completed' }, { status: 409 });
      }
      if (!isClaimer && !elevated) {
        return Response.json({ error: 'Only claimer or command staff can complete this post' }, { status: 403 });
      }
      nextStatus = 'completed';
      attempts = [
        {
          status: 'completed',
          completed_by_member_profile_id: actorMemberId,
          completed_by_user_id: actorAdminId,
          completed_at: nowIso,
        },
        {
          status: 'completed',
          completed_by_member_profile_id: actorMemberId,
        },
        { status: 'completed' },
      ];
    } else if (normalizedAction === 'reopen') {
      if (!isPoster && !elevated) {
        return Response.json({ error: 'Only poster or command staff can reopen this post' }, { status: 403 });
      }
      nextStatus = 'open';
      const cleanedTags = tags.filter((tag) => tag.toLowerCase() !== 'reward:paid');
      attempts = [
        {
          status: 'open',
          claimed_by_member_profile_id: null,
          claimed_by_user_id: null,
          completed_by_member_profile_id: null,
          completed_by_user_id: null,
          completed_at: null,
          tags: cleanedTags,
        },
        {
          status: 'open',
          claimed_by_member_profile_id: null,
        },
        { status: 'open' },
      ];
    } else if (normalizedAction === 'mark_paid') {
      if (String(post.status || '').toLowerCase() !== 'completed') {
        return Response.json({ error: 'Post must be completed before reward payout' }, { status: 409 });
      }
      if (!isPoster && !elevated) {
        return Response.json({ error: 'Only poster or command staff can mark payout' }, { status: 403 });
      }
      const rewardTags = Array.from(new Set([...tags.filter((tag) => !tag.toLowerCase().startsWith('reward:')), 'reward:paid']));
      attempts = [
        {
          tags: rewardTags,
          reward_status: 'PAID',
          reward_paid_at: nowIso,
          reward_paid_by_member_profile_id: actorMemberId,
        },
        {
          tags: rewardTags,
          reward_status: 'PAID',
        },
        {
          tags: rewardTags,
        },
      ];
    } else {
      return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const updated = await applyFirstSuccessfulUpdate(base44, postId, attempts);

    const recipients = new Set<string>();
    if (post.posted_by_member_profile_id) recipients.add(post.posted_by_member_profile_id);
    if (post.claimed_by_member_profile_id) recipients.add(post.claimed_by_member_profile_id);
    if (updated?.posted_by_member_profile_id) recipients.add(updated.posted_by_member_profile_id);
    if (updated?.claimed_by_member_profile_id) recipients.add(updated.claimed_by_member_profile_id);

    try {
      for (const recipientId of recipients) {
        if (!recipientId || (actorMemberId && recipientId === actorMemberId)) continue;
        await base44.entities.Notification.create({
          user_id: recipientId,
          type: 'system',
          title: 'Mission Board Update',
          message: `${post.title || 'Mission'} → ${normalizedAction}`,
          related_entity_type: 'mission_board_post',
          related_entity_id: postId,
        });
      }
    } catch (error) {
      console.error('[updateMissionBoardPostStatus] Notification failed:', error.message);
    }

    if (post.event_id) {
      try {
        await base44.entities.EventLog.create({
          event_id: post.event_id,
          type: 'MISSION_POST',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `${post.title || 'Mission post'} ${normalizedAction}`,
          details: {
            post_id: postId,
            action: normalizedAction,
            previous_status: post.status || null,
            next_status: nextStatus,
          },
        });
      } catch (error) {
        console.error('[updateMissionBoardPostStatus] EventLog failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      post: updated,
      action: normalizedAction,
      nextStatus,
      requiredRoles,
      actorRoles: Array.from(actorRoles),
    });
  } catch (error) {
    console.error('[updateMissionBoardPostStatus] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
