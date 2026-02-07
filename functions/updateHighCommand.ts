import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'diplomat', 'founder', 'pioneer']);
const DIPLOMATIC_STANCES = new Set(['allied', 'neutral', 'ceasefire', 'hostile', 'trade']);
const DIPLOMATIC_STATUS = new Set(['active', 'pending', 'suspended', 'terminated']);
const ALLIANCE_STATUS = new Set(['proposed', 'active', 'ratified', 'suspended', 'dissolved']);

type PayloadRecord = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toToken(value: unknown) {
  return text(value).replace(/\s+/g, '_').toUpperCase();
}

function asList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => text(entry)).filter(Boolean);
  }
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeDirectivePriority(value: unknown) {
  const token = toToken(value || 'STANDARD');
  if (token === 'CRITICAL' || token === 'HIGH' || token === 'LOW') return token;
  return 'STANDARD';
}

function normalizeDiplomaticStance(value: unknown) {
  const stance = text(value || 'neutral').toLowerCase();
  return DIPLOMATIC_STANCES.has(stance) ? stance : 'neutral';
}

function normalizeDiplomaticStatus(value: unknown) {
  const status = text(value || 'active').toLowerCase();
  return DIPLOMATIC_STATUS.has(status) ? status : 'active';
}

function normalizeAllianceStatus(value: unknown) {
  const status = text(value || 'proposed').toLowerCase();
  return ALLIANCE_STATUS.has(status) ? status : 'proposed';
}

function parseCloseTime(raw: unknown) {
  const fallback = Date.now() + 72 * 60 * 60 * 1000;
  const millis = raw ? new Date(String(raw)).getTime() : fallback;
  if (!Number.isFinite(millis)) return new Date(fallback).toISOString();
  return new Date(millis).toISOString();
}

function asPollOptions(input: unknown) {
  const options = asList(input);
  return options
    .map((label, index) => ({
      id: `opt_${index + 1}`,
      text: label,
    }))
    .slice(0, 10);
}

function hasCouncilAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = toToken(memberProfile?.rank);
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.some((role: string) => COMMAND_ROLES.has(role));
}

async function createFirstSuccessful(entity: any, attempts: PayloadRecord[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

async function getPollById(base44: any, pollId: string) {
  if (!pollId) return null;
  if (base44?.entities?.Poll?.get) {
    try {
      const poll = await base44.entities.Poll.get(pollId);
      if (poll) return poll;
    } catch {
      // noop
    }
  }
  if (base44?.entities?.Poll?.filter) {
    try {
      const matches = await base44.entities.Poll.filter({ id: pollId });
      if (Array.isArray(matches) && matches[0]) return matches[0];
    } catch {
      // noop
    }
  }
  return null;
}

async function writeHighCommandLog(base44: any, payload: PayloadRecord) {
  return createFirstSuccessful(base44.entities.EventLog, [
    payload,
    {
      type: payload.type,
      severity: payload.severity,
      actor_member_profile_id: payload.actor_member_profile_id,
      summary: payload.summary,
    },
  ]);
}

async function notifyCouncil(base44: any, actorMemberId: string | null, title: string, message: string) {
  try {
    const members = await base44.entities.MemberProfile.list('-created_date', 250);
    const council = (members || []).filter((profile: any) => {
      if (!profile?.id || profile.id === actorMemberId) return false;
      return hasCouncilAccess(profile, 'member');
    });
    for (const profile of council.slice(0, 30)) {
      try {
        await base44.entities.Notification.create({
          user_id: profile.id,
          type: 'system',
          title,
          message,
          related_entity_type: 'high_command',
          related_entity_id: profile.id,
        });
      } catch {
        // notification failures are non-blocking
      }
    }
  } catch {
    // notification fanout is best-effort
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = text(payload.action).toLowerCase();
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorUserId =
      text(payload.userId || payload.user_id) ||
      text(memberProfile?.user_id) ||
      (actorType === 'admin' ? text(adminUser?.id) : '') ||
      actorMemberId ||
      null;
    const councilAccess = hasCouncilAccess(memberProfile, actorType);
    const now = Date.now();

    if (action === 'issue_directive') {
      if (!councilAccess) {
        return Response.json({ error: 'Council privileges required' }, { status: 403 });
      }

      const title = text(payload.title);
      if (!title) {
        return Response.json({ error: 'Directive title required' }, { status: 400 });
      }

      const directive = {
        id: `directive_${Date.now()}`,
        title,
        summary: text(payload.summary || payload.description),
        policy_area: text(payload.policyArea || payload.policy_area || 'operations'),
        priority: normalizeDirectivePriority(payload.priority),
        effective_at: text(payload.effectiveAt || payload.effective_at || new Date().toISOString()),
        created_by_member_profile_id: actorMemberId,
        created_at: new Date().toISOString(),
        tags: asList(payload.tags),
      };

      const log = await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_DIRECTIVE',
        severity: directive.priority === 'CRITICAL' ? 'CRITICAL' : directive.priority === 'HIGH' ? 'HIGH' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Directive issued: ${title}`,
        details: directive,
      });

      if (payload.notifyCouncil !== false) {
        await notifyCouncil(base44, actorMemberId, 'High Command Directive', title);
      }

      return Response.json({
        success: true,
        action,
        directive,
        logId: log?.id || null,
      });
    }

    if (action === 'open_vote') {
      if (!councilAccess) {
        return Response.json({ error: 'Council privileges required' }, { status: 403 });
      }

      const question = text(payload.question || payload.title);
      const options = asPollOptions(payload.options);
      if (!question) {
        return Response.json({ error: 'Vote question required' }, { status: 400 });
      }
      if (options.length < 2) {
        return Response.json({ error: 'At least two vote options are required' }, { status: 400 });
      }

      const closesAt = parseCloseTime(payload.closesAt || payload.closes_at);
      const poll = await base44.entities.Poll.create({
        scope: 'GLOBAL',
        scope_id: 'HIGH_COMMAND',
        question,
        options,
        created_by: actorUserId,
        closes_at: closesAt,
      });

      await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_VOTE_OPENED',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Council vote opened: ${question}`,
        details: {
          poll_id: poll?.id || null,
          question,
          options,
          closes_at: closesAt,
        },
      });

      return Response.json({
        success: true,
        action,
        poll,
      });
    }

    if (action === 'cast_vote') {
      const pollId = text(payload.pollId || payload.poll_id);
      const optionId = text(payload.optionId || payload.option_id);
      if (!pollId || !optionId) {
        return Response.json({ error: 'pollId and optionId required' }, { status: 400 });
      }
      if (!actorUserId) {
        return Response.json({ error: 'Unable to resolve voter identity' }, { status: 400 });
      }

      const poll = await getPollById(base44, pollId);
      if (!poll) {
        return Response.json({ error: 'Vote not found' }, { status: 404 });
      }
      const closesAt = poll?.closes_at ? new Date(poll.closes_at).getTime() : null;
      if (closesAt && Number.isFinite(closesAt) && closesAt < now) {
        return Response.json({ error: 'Vote is closed' }, { status: 400 });
      }

      const optionIds = Array.isArray(poll?.options)
        ? poll.options.map((option: any) => text(option?.id)).filter(Boolean)
        : [];
      if (!optionIds.includes(optionId)) {
        return Response.json({ error: 'Invalid vote option' }, { status: 400 });
      }

      const existingVotes = await base44.entities.PollVote.filter({
        poll_id: pollId,
        user_id: actorUserId,
      });
      if (Array.isArray(existingVotes) && existingVotes.length > 0) {
        return Response.json({ error: 'Vote already submitted' }, { status: 400 });
      }

      const vote = await createFirstSuccessful(base44.entities.PollVote, [
        {
          poll_id: pollId,
          user_id: actorUserId,
          selected_option_ids: [optionId],
          voter_member_profile_id: actorMemberId,
        },
        {
          poll_id: pollId,
          user_id: actorUserId,
          selected_option_ids: [optionId],
        },
      ]);

      await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_VOTE_CAST',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Vote cast on poll ${pollId}`,
        details: {
          poll_id: pollId,
          option_id: optionId,
        },
      });

      return Response.json({
        success: true,
        action,
        vote,
      });
    }

    if (action === 'register_diplomatic_entry') {
      if (!councilAccess) {
        return Response.json({ error: 'Council privileges required' }, { status: 403 });
      }

      const partnerName = text(payload.partnerName || payload.partner_name);
      if (!partnerName) {
        return Response.json({ error: 'partnerName required' }, { status: 400 });
      }

      const entry = {
        id: `dip_${Date.now()}`,
        partner_name: partnerName,
        stance: normalizeDiplomaticStance(payload.stance),
        status: normalizeDiplomaticStatus(payload.status),
        envoy_member_profile_id: text(payload.envoyMemberProfileId || payload.envoy_member_profile_id) || actorMemberId,
        terms: text(payload.terms),
        notes: text(payload.notes),
        recorded_at: new Date().toISOString(),
      };

      const log = await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_DIPLOMACY',
        severity: entry.stance === 'hostile' ? 'HIGH' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Diplomatic status recorded: ${partnerName} (${entry.stance})`,
        details: entry,
      });

      return Response.json({
        success: true,
        action,
        entry,
        logId: log?.id || null,
      });
    }

    if (action === 'register_alliance') {
      if (!councilAccess) {
        return Response.json({ error: 'Council privileges required' }, { status: 403 });
      }

      const allianceName = text(payload.allianceName || payload.alliance_name);
      if (!allianceName) {
        return Response.json({ error: 'allianceName required' }, { status: 400 });
      }

      const alliance = {
        id: `alliance_${Date.now()}`,
        alliance_name: allianceName,
        partners: asList(payload.partners || payload.partnerNames),
        status: normalizeAllianceStatus(payload.status),
        terms: text(payload.terms),
        recorded_by_member_profile_id: actorMemberId,
        recorded_at: new Date().toISOString(),
      };

      const log = await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_ALLIANCE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Alliance recorded: ${allianceName} (${alliance.status})`,
        details: alliance,
      });

      return Response.json({
        success: true,
        action,
        alliance,
        logId: log?.id || null,
      });
    }

    if (action === 'update_alliance_status') {
      if (!councilAccess) {
        return Response.json({ error: 'Council privileges required' }, { status: 403 });
      }

      const allianceName = text(payload.allianceName || payload.alliance_name);
      const status = normalizeAllianceStatus(payload.status);
      if (!allianceName) {
        return Response.json({ error: 'allianceName required' }, { status: 400 });
      }

      const update = {
        id: `alliance_status_${Date.now()}`,
        alliance_name: allianceName,
        status,
        reason: text(payload.reason),
        updated_by_member_profile_id: actorMemberId,
        updated_at: new Date().toISOString(),
      };

      const log = await writeHighCommandLog(base44, {
        type: 'HIGH_COMMAND_ALLIANCE_STATUS',
        severity: status === 'dissolved' || status === 'suspended' ? 'HIGH' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Alliance status updated: ${allianceName} -> ${status}`,
        details: update,
      });

      return Response.json({
        success: true,
        action,
        update,
        logId: log?.id || null,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateHighCommand] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
