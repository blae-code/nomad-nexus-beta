import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const TRAINING_ROLES = new Set(['admin', 'training', 'instructor', 'mentor', 'officer']);
const STATE_START = '[nexus_training_state]';
const STATE_END = '[/nexus_training_state]';

type UpdateAttempt = Record<string, unknown>;

type TrainingState = {
  schema_version: number;
  completed_tutorial_ids: string[];
  guide_progress: Array<Record<string, unknown>>;
  platform_certifications: Array<Record<string, unknown>>;
  feedback_submissions: Array<Record<string, unknown>>;
};

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
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

function createDefaultState(): TrainingState {
  return {
    schema_version: 1,
    completed_tutorial_ids: [],
    guide_progress: [],
    platform_certifications: [],
    feedback_submissions: [],
  };
}

function parseState(notes: unknown): TrainingState {
  const raw = String(notes || '');
  const match = raw.match(/\[nexus_training_state\]([\s\S]*?)\[\/nexus_training_state\]/i);
  if (!match?.[1]) return createDefaultState();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      schema_version: Number(parsed?.schema_version || 1),
      completed_tutorial_ids: Array.isArray(parsed?.completed_tutorial_ids)
        ? parsed.completed_tutorial_ids.map((entry: unknown) => text(entry)).filter(Boolean)
        : [],
      guide_progress: Array.isArray(parsed?.guide_progress) ? parsed.guide_progress : [],
      platform_certifications: Array.isArray(parsed?.platform_certifications) ? parsed.platform_certifications : [],
      feedback_submissions: Array.isArray(parsed?.feedback_submissions) ? parsed.feedback_submissions : [],
    };
  } catch {
    return createDefaultState();
  }
}

function stripState(notes: unknown) {
  return String(notes || '').replace(/\[nexus_training_state\][\s\S]*?\[\/nexus_training_state\]/gi, '').trim();
}

function encodeState(notes: unknown, state: TrainingState) {
  const preserved = stripState(notes);
  const encoded = `${STATE_START}${JSON.stringify(state)}${STATE_END}`;
  return preserved ? `${preserved}\n\n${encoded}` : encoded;
}

function hasTrainingAdminAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.some((role: string) => TRAINING_ROLES.has(role));
}

function upsertGuideProgress(entries: Array<Record<string, unknown>>, tutorialId: string, patch: Record<string, unknown>) {
  const idx = entries.findIndex((entry) => text(entry?.tutorial_id) === tutorialId);
  if (idx < 0) return [...entries, { tutorial_id: tutorialId, ...patch }];
  const next = [...entries];
  next[idx] = { ...next[idx], ...patch };
  return next;
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

async function createFirstSuccessful(entity: any, attempts: UpdateAttempt[]) {
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

async function writeTrainingLog(base44: any, payload: UpdateAttempt) {
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
    const trainingAdminAccess = hasTrainingAdminAccess(memberProfile, actorType);
    const nowIso = new Date().toISOString();

    if (action === 'upsert_tutorial') {
      if (!trainingAdminAccess) {
        return Response.json({ error: 'Training admin privileges required' }, { status: 403 });
      }

      const title = text(payload.title || payload.name || payload.tutorial?.title);
      if (!title) {
        return Response.json({ error: 'Tutorial title required' }, { status: 400 });
      }

      const tutorial = {
        id: text(payload.tutorialId || payload.tutorial_id || payload.tutorial?.id, `tutorial_${Date.now()}`),
        title,
        summary: text(payload.summary || payload.description || payload.tutorial?.summary || payload.tutorial?.description),
        difficulty: text(payload.difficulty || payload.tutorial?.difficulty || 'standard').toLowerCase(),
        estimated_minutes: Number(payload.estimatedMinutes || payload.tutorial?.estimated_minutes || 20),
        tags: Array.from(new Set([...asList(payload.tags || payload.tutorial?.tags), 'nexus-training'])),
        steps: asList(payload.steps || payload.tutorial?.steps),
        updated_by_member_profile_id: actorMemberId,
        updated_at: nowIso,
      };

      const log = await writeTrainingLog(base44, {
        type: 'NEXUS_TRAINING_TUTORIAL',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Tutorial upserted: ${title}`,
        details: tutorial,
      });

      return Response.json({
        success: true,
        action,
        tutorial,
        logId: log?.id || null,
      });
    }

    if (action === 'record_video_resource') {
      if (!trainingAdminAccess) {
        return Response.json({ error: 'Training admin privileges required' }, { status: 403 });
      }
      const title = text(payload.title);
      const url = text(payload.url);
      if (!title || !url) {
        return Response.json({ error: 'title and url required' }, { status: 400 });
      }

      const video = {
        id: text(payload.videoId || payload.video_id, `video_${Date.now()}`),
        title,
        url,
        platform: text(payload.platform || 'external'),
        duration_minutes: Number(payload.durationMinutes || payload.duration_minutes || 0),
        tags: Array.from(new Set([...asList(payload.tags), 'nexus-training', 'video'])),
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };

      const log = await writeTrainingLog(base44, {
        type: 'NEXUS_TRAINING_VIDEO',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Training video recorded: ${title}`,
        details: video,
      });

      return Response.json({
        success: true,
        action,
        video,
        logId: log?.id || null,
      });
    }

    const targetMemberProfileId = text(payload.targetMemberProfileId || payload.memberProfileId || actorMemberId);
    if (!targetMemberProfileId) {
      return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
    }

    const targetMember = await base44.entities.MemberProfile.get(targetMemberProfileId);
    if (!targetMember) {
      return Response.json({ error: 'Target member not found' }, { status: 404 });
    }

    if (action === 'complete_tutorial') {
      if (!trainingAdminAccess && targetMemberProfileId !== actorMemberId) {
        return Response.json({ error: 'Cannot complete tutorial for another member without training admin privileges' }, { status: 403 });
      }

      const tutorialId = text(payload.tutorialId || payload.tutorial_id);
      if (!tutorialId) {
        return Response.json({ error: 'tutorialId required' }, { status: 400 });
      }
      const tutorialTitle = text(payload.tutorialTitle || payload.title || 'Tutorial');

      const state = parseState(targetMember?.notes);
      state.completed_tutorial_ids = Array.from(new Set([...state.completed_tutorial_ids, tutorialId]));
      state.guide_progress = upsertGuideProgress(state.guide_progress, tutorialId, {
        status: 'complete',
        tutorial_title: tutorialTitle,
        last_step: text(payload.lastStep || payload.last_step || 'completed'),
        completed_at: nowIso,
        updated_at: nowIso,
      });

      const notes = encodeState(targetMember?.notes, state);
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          training_last_completed_at: nowIso,
          notes,
        },
        { notes },
      ]);

      await writeTrainingLog(base44, {
        type: 'NEXUS_TRAINING_PROGRESS',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Tutorial completed: ${tutorialTitle}`,
        details: {
          tutorial_id: tutorialId,
          tutorial_title: tutorialTitle,
          target_member_profile_id: targetMemberProfileId,
        },
      });

      return Response.json({
        success: true,
        action,
        profile: updated,
        state,
      });
    }

    if (action === 'issue_platform_certification') {
      if (!trainingAdminAccess) {
        return Response.json({ error: 'Training admin privileges required' }, { status: 403 });
      }
      const certName = text(payload.certificationName || payload.name || 'Nexus Platform Operator');
      const certLevel = text(payload.certificationLevel || payload.level || 'STANDARD').toUpperCase();

      const state = parseState(targetMember?.notes);
      const cert = {
        id: `nexus_cert_${Date.now()}`,
        name: certName,
        level: certLevel,
        issued_at: nowIso,
        issued_by_member_profile_id: actorMemberId,
      };
      state.platform_certifications = [...state.platform_certifications, cert].slice(-80);

      const existingCerts = Array.isArray(targetMember?.certifications)
        ? targetMember.certifications
        : Array.isArray(targetMember?.certification_list)
        ? targetMember.certification_list
        : [];
      const nextCerts = [...existingCerts, cert];
      const notes = encodeState(targetMember?.notes, state);

      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          certifications: nextCerts,
          notes,
        },
        {
          certification_list: nextCerts,
          notes,
        },
        { notes },
      ]);

      try {
        if (targetMemberProfileId !== actorMemberId) {
          await base44.entities.Notification.create({
            user_id: targetMemberProfileId,
            type: 'system',
            title: 'Nexus Training Certification',
            message: `${certName} (${certLevel})`,
            related_entity_type: 'member_profile',
            related_entity_id: targetMemberProfileId,
          });
        }
      } catch (error) {
        console.error('[updateNexusTraining] Certification notification failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        certification: cert,
      });
    }

    if (action === 'submit_feedback') {
      const rating = Math.max(1, Math.min(5, Number(payload.rating || 0)));
      const message = text(payload.message || payload.feedback);
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }

      const state = parseState(targetMember?.notes);
      const feedback = {
        id: `feedback_${Date.now()}`,
        tutorial_id: text(payload.tutorialId || payload.tutorial_id || ''),
        rating,
        message,
        submitted_by_member_profile_id: actorMemberId,
        submitted_at: nowIso,
      };
      state.feedback_submissions = [...state.feedback_submissions, feedback].slice(-120);
      const notes = encodeState(targetMember?.notes, state);

      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        { notes },
      ]);

      await writeTrainingLog(base44, {
        type: 'NEXUS_TRAINING_FEEDBACK',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Training feedback submitted (${rating}/5)`,
        details: {
          target_member_profile_id: targetMemberProfileId,
          tutorial_id: feedback.tutorial_id,
          rating,
          message,
        },
      });

      return Response.json({
        success: true,
        action,
        profile: updated,
        feedback,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateNexusTraining] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
