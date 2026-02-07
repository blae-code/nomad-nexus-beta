import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const AVAILABILITY_STATES = new Set(['available', 'busy', 'afk', 'offline', 'focused', 'in_operation']);
const STATE_START = '[nomad_registry_state]';
const STATE_END = '[/nomad_registry_state]';

type UpdateAttempt = Record<string, unknown>;

type RegistryState = {
  schema_version: number;
  reputation_entries: Array<Record<string, unknown>>;
  achievements: Array<Record<string, unknown>>;
  mentor_member_profile_id: string | null;
  operator_notes: Array<Record<string, unknown>>;
  traditions: Array<Record<string, unknown>>;
  availability_status: string | null;
};

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function createDefaultState(): RegistryState {
  return {
    schema_version: 1,
    reputation_entries: [],
    achievements: [],
    mentor_member_profile_id: null,
    operator_notes: [],
    traditions: [],
    availability_status: null,
  };
}

function parseState(notes: unknown): RegistryState {
  const raw = String(notes || '');
  const match = raw.match(/\[nomad_registry_state\]([\s\S]*?)\[\/nomad_registry_state\]/i);
  if (!match?.[1]) return createDefaultState();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      schema_version: Number(parsed?.schema_version || 1),
      reputation_entries: Array.isArray(parsed?.reputation_entries) ? parsed.reputation_entries : [],
      achievements: Array.isArray(parsed?.achievements) ? parsed.achievements : [],
      mentor_member_profile_id: parsed?.mentor_member_profile_id ? String(parsed.mentor_member_profile_id) : null,
      operator_notes: Array.isArray(parsed?.operator_notes) ? parsed.operator_notes : [],
      traditions: Array.isArray(parsed?.traditions) ? parsed.traditions : [],
      availability_status: parsed?.availability_status ? String(parsed.availability_status) : null,
    };
  } catch {
    return createDefaultState();
  }
}

function stripState(notes: unknown) {
  return String(notes || '').replace(/\[nomad_registry_state\][\s\S]*?\[\/nomad_registry_state\]/gi, '').trim();
}

function encodeState(notes: unknown, state: RegistryState) {
  const preserved = stripState(notes);
  const encoded = `${STATE_START}${JSON.stringify(state)}${STATE_END}`;
  return preserved ? `${preserved}\n\n${encoded}` : encoded;
}

function hasCommandAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = String(memberProfile?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command');
}

async function applyFirstSuccessfulMemberUpdate(base44: any, memberId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.MemberProfile.update(memberId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Member update failed');
}

function averageReputation(entries: Array<Record<string, unknown>>) {
  if (!entries.length) return 0;
  const total = entries.reduce((sum, entry) => sum + Number(entry?.score || 0), 0);
  return Math.round((total / entries.length) * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
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
    const commandAccess = hasCommandAccess(memberProfile, actorType);
    const targetMemberProfileId = text(payload.targetMemberProfileId || actorMemberId);
    if (!targetMemberProfileId) {
      return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
    }

    const targetMember = await base44.entities.MemberProfile.get(targetMemberProfileId);
    if (!targetMember) {
      return Response.json({ error: 'Target member not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const state = parseState(targetMember?.notes);

    if (action === 'submit_reputation') {
      if (!actorMemberId) {
        return Response.json({ error: 'Member session required for reputation submissions' }, { status: 403 });
      }
      if (actorMemberId === targetMemberProfileId) {
        return Response.json({ error: 'Cannot submit reputation on your own profile' }, { status: 400 });
      }
      const score = Number(payload.score);
      if (!Number.isFinite(score) || score < 1 || score > 5) {
        return Response.json({ error: 'score must be between 1 and 5' }, { status: 400 });
      }

      state.reputation_entries = [
        ...state.reputation_entries,
        {
          id: `rep_${Date.now()}`,
          from_member_profile_id: actorMemberId,
          score,
          category: text(payload.category || 'reliability'),
          note: text(payload.note || ''),
          created_at: nowIso,
        },
      ].slice(-300);

      const reputationScore = averageReputation(state.reputation_entries);
      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          reputation_entries: state.reputation_entries,
          reliability_score: reputationScore,
          notes,
        },
        {
          reliability_score: reputationScore,
          notes,
        },
        { notes },
      ]);

      try {
        await base44.entities.Notification.create({
          user_id: targetMemberProfileId,
          type: 'system',
          title: 'New Reputation Entry',
          message: `A reputation review was submitted (score ${score}/5).`,
          related_entity_type: 'member_profile',
          related_entity_id: targetMemberProfileId,
        });
      } catch (error) {
        console.error('[updateNomadRegistry] Reputation notification failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
        reliabilityScore: reputationScore,
      });
    }

    if (action === 'award_achievement') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const title = text(payload.title || payload.achievementName);
      if (!title) {
        return Response.json({ error: 'Achievement title required' }, { status: 400 });
      }
      const achievement = {
        id: `ach_${Date.now()}`,
        title,
        description: text(payload.description || ''),
        points: Number(payload.points || 0),
        awarded_by_member_profile_id: actorMemberId,
        awarded_at: nowIso,
      };
      state.achievements = [...state.achievements, achievement].slice(-200);

      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          achievements: state.achievements,
          notes,
        },
        {
          achievement_log: state.achievements,
          notes,
        },
        { notes },
      ]);

      try {
        if (actorMemberId !== targetMemberProfileId) {
          await base44.entities.Notification.create({
            user_id: targetMemberProfileId,
            type: 'system',
            title: 'Achievement Awarded',
            message: title,
            related_entity_type: 'member_profile',
            related_entity_id: targetMemberProfileId,
          });
        }
      } catch (error) {
        console.error('[updateNomadRegistry] Achievement notification failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
        achievement,
      });
    }

    if (action === 'set_mentor_relationship') {
      if (!commandAccess && actorMemberId !== targetMemberProfileId) {
        return Response.json({ error: 'Cannot assign mentor for another member without command privileges' }, { status: 403 });
      }
      const mentorMemberProfileId = payload.mentorMemberProfileId ? text(payload.mentorMemberProfileId) : null;
      if (mentorMemberProfileId) {
        if (mentorMemberProfileId === targetMemberProfileId) {
          return Response.json({ error: 'Mentor cannot be the same member' }, { status: 400 });
        }
        const mentor = await base44.entities.MemberProfile.get(mentorMemberProfileId);
        if (!mentor) {
          return Response.json({ error: 'Mentor member not found' }, { status: 404 });
        }
      }
      state.mentor_member_profile_id = mentorMemberProfileId;
      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          onboarding_mentor_member_profile_id: mentorMemberProfileId,
          mentor_member_profile_id: mentorMemberProfileId,
          notes,
        },
        {
          mentor_member_profile_id: mentorMemberProfileId,
          notes,
        },
        {
          mentor_id: mentorMemberProfileId,
          notes,
        },
        { notes },
      ]);
      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
        mentorMemberProfileId,
      });
    }

    if (action === 'add_operator_note') {
      if (!actorMemberId) {
        return Response.json({ error: 'Member session required for operator notes' }, { status: 403 });
      }
      const note = text(payload.note);
      if (!note) {
        return Response.json({ error: 'note required' }, { status: 400 });
      }
      const entry = {
        id: `note_${Date.now()}`,
        note,
        visibility: text(payload.visibility || 'private').toLowerCase(),
        authored_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };
      state.operator_notes = [...state.operator_notes, entry].slice(-300);
      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          operator_notes: state.operator_notes,
          notes,
        },
        { notes },
      ]);
      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
        note: entry,
      });
    }

    if (action === 'add_tradition') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const title = text(payload.title);
      if (!title) {
        return Response.json({ error: 'Tradition title required' }, { status: 400 });
      }
      const entry = {
        id: `tradition_${Date.now()}`,
        squad_name: text(payload.squadName || payload.squad_name || 'Nomads'),
        title,
        details: text(payload.details || ''),
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };
      state.traditions = [...state.traditions, entry].slice(-200);
      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          squad_traditions: state.traditions,
          notes,
        },
        { notes },
      ]);
      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
        tradition: entry,
      });
    }

    if (action === 'set_availability') {
      if (!commandAccess && actorMemberId !== targetMemberProfileId) {
        return Response.json({ error: 'Cannot update availability for another member without command privileges' }, { status: 403 });
      }
      const availability = text(payload.availability || payload.status || 'available').toLowerCase();
      if (!AVAILABILITY_STATES.has(availability)) {
        return Response.json({
          error: `Unsupported availability status: ${availability}`,
          allowed: Array.from(AVAILABILITY_STATES),
        }, { status: 400 });
      }
      state.availability_status = availability;
      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        { availability_status: availability, notes },
        { status: availability, notes },
        { notes },
      ]);
      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateNomadRegistry] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
