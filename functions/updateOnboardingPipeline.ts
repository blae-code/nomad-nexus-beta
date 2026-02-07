import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const STAFF_ROLES = new Set(['ADMIN', 'MENTOR', 'TRAINING', 'OFFICER', 'QUARTERMASTER']);
const PIPELINE_TASK_IDS = new Set(['charter', 'dossier', 'training', 'mentor', 'first-op']);

const DEFAULT_TASKS = [
  { id: 'charter', label: 'Read the Redscar Charter', status: 'pending' },
  { id: 'dossier', label: 'Complete member dossier', status: 'pending' },
  { id: 'training', label: 'Finish basic training', status: 'pending' },
  { id: 'mentor', label: 'Assigned a mentor', status: 'pending' },
  { id: 'first-op', label: 'Participate in first operation', status: 'pending' },
];

type UpdateAttempt = Record<string, unknown>;

function toToken(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function normalizeStatus(value: unknown) {
  return String(value || '').toLowerCase() === 'complete' ? 'complete' : 'pending';
}

function sanitizePipeline(input: unknown) {
  const incoming = Array.isArray(input) ? input : [];
  const byId = new Map<string, { id: string; label: string; status: string }>();

  for (const task of incoming) {
    const id = String(task?.id || '').trim();
    if (!PIPELINE_TASK_IDS.has(id)) continue;
    const defaultLabel = DEFAULT_TASKS.find((entry) => entry.id === id)?.label || id;
    byId.set(id, {
      id,
      label: String(task?.label || defaultLabel).trim() || defaultLabel,
      status: normalizeStatus(task?.status),
    });
  }

  return DEFAULT_TASKS.map((task) => byId.get(task.id) || task);
}

function setTaskStatus(pipeline: Array<{ id: string; label: string; status: string }>, taskId: string, status: string) {
  return pipeline.map((task) => (task.id === taskId ? { ...task, status } : task));
}

function getRoleTokens(memberProfile: any) {
  const roles = new Set<string>();
  const rank = toToken(memberProfile?.rank);
  if (rank) roles.add(rank);
  const roleList = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles
    : memberProfile?.roles
    ? [memberProfile.roles]
    : [];
  for (const role of roleList) {
    const token = toToken(role);
    if (token) roles.add(token);
  }
  return roles;
}

function hasMentorPrivileges(memberProfile: any) {
  const tokens = getRoleTokens(memberProfile);
  for (const token of tokens) {
    if (COMMAND_RANKS.has(token) || STAFF_ROLES.has(token)) return true;
  }
  return false;
}

function getCurrentMentor(targetMember: any) {
  return (
    targetMember?.onboarding_mentor_member_profile_id ||
    targetMember?.mentor_member_profile_id ||
    targetMember?.mentor_id ||
    null
  );
}

function getCurrentMilestones(targetMember: any) {
  if (Array.isArray(targetMember?.training_milestones)) return targetMember.training_milestones;
  if (Array.isArray(targetMember?.onboarding_training_milestones)) {
    return targetMember.onboarding_training_milestones;
  }
  return [];
}

async function applyFirstSuccessfulUpdate(base44: any, memberId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      const updated = await base44.entities.MemberProfile.update(memberId, payload);
      return { updated, payload };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Member profile update failed');
}

function getActionFromPayload(payload: any) {
  if (payload?.action) return String(payload.action).toLowerCase();
  if (payload?.milestone) return 'upsert_milestone';
  if (Object.prototype.hasOwnProperty.call(payload || {}, 'mentorMemberProfileId')) return 'assign_mentor';
  if (Object.prototype.hasOwnProperty.call(payload || {}, 'pipelineTasks')) return 'set_pipeline';
  return '';
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

    const actorMemberId = memberProfile?.id || null;
    if (!actorMemberId && actorType !== 'admin') {
      return Response.json({ error: 'Actor not resolved' }, { status: 400 });
    }

    const targetMemberProfileId = payload.targetMemberProfileId || actorMemberId;
    if (!targetMemberProfileId) {
      return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
    }

    const targetMember = await base44.entities.MemberProfile.get(targetMemberProfileId);
    if (!targetMember) {
      return Response.json({ error: 'Target member not found' }, { status: 404 });
    }

    const actorIsAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const actorRoleTokens = getRoleTokens(memberProfile);
    const actorIsCommand = Array.from(actorRoleTokens).some((token) => COMMAND_RANKS.has(token));
    const actorIsStaff = Array.from(actorRoleTokens).some((token) => STAFF_ROLES.has(token));
    const canManageOthers = actorIsAdmin || actorIsCommand || actorIsStaff;
    const isSelfTarget = actorMemberId && targetMemberProfileId === actorMemberId;
    if (!isSelfTarget && !canManageOthers) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const action = getActionFromPayload(payload);
    if (!action) {
      return Response.json({ error: 'No onboarding update action provided' }, { status: 400 });
    }

    const currentPipeline = sanitizePipeline(targetMember.onboarding_pipeline);
    const currentMentorId = getCurrentMentor(targetMember);
    const currentMilestones = getCurrentMilestones(targetMember);
    let nextPipeline = currentPipeline;
    let nextMentorId = currentMentorId;
    let nextMilestones = currentMilestones;

    if (action === 'set_pipeline') {
      if (!Array.isArray(payload.pipelineTasks)) {
        return Response.json({ error: 'pipelineTasks array required' }, { status: 400 });
      }
      nextPipeline = sanitizePipeline(payload.pipelineTasks);
    } else if (action === 'assign_mentor') {
      const mentorMemberProfileId =
        payload.mentorMemberProfileId === null || payload.mentorMemberProfileId === ''
          ? null
          : payload.mentorMemberProfileId;

      if (mentorMemberProfileId) {
        const mentorProfile = await base44.entities.MemberProfile.get(mentorMemberProfileId);
        if (!mentorProfile) {
          return Response.json({ error: 'Mentor member not found' }, { status: 404 });
        }
        if (mentorProfile.id === targetMemberProfileId) {
          return Response.json({ error: 'Mentor cannot be the same as the recruit' }, { status: 400 });
        }
        if (!hasMentorPrivileges(mentorProfile)) {
          return Response.json({ error: 'Selected mentor lacks mentor permissions' }, { status: 400 });
        }
      }

      nextMentorId = mentorMemberProfileId;
      nextPipeline = setTaskStatus(currentPipeline, 'mentor', nextMentorId ? 'complete' : 'pending');
    } else if (action === 'upsert_milestone') {
      const milestone = payload.milestone || {};
      const milestoneId = String(milestone.id || '').trim();
      const title = String(milestone.title || '').trim();
      const notes = String(milestone.notes || '').trim();
      const status = String(milestone.status || '').toLowerCase() === 'complete' ? 'complete' : 'pending';

      if (!milestoneId && !title) {
        return Response.json({ error: 'Milestone title required for new milestone' }, { status: 400 });
      }

      const existing = Array.isArray(currentMilestones) ? currentMilestones : [];
      if (milestoneId) {
        const hasMatch = existing.some((entry: any) => String(entry?.id || '') === milestoneId);
        if (!hasMatch) {
          return Response.json({ error: 'Milestone not found' }, { status: 404 });
        }
        nextMilestones = existing.map((entry: any) =>
          String(entry?.id || '') === milestoneId
            ? {
                ...entry,
                title: title || entry?.title || 'Milestone',
                notes: notes || entry?.notes || '',
                status,
                updated_at: new Date().toISOString(),
              }
            : entry
        );
      } else {
        nextMilestones = [
          ...existing,
          {
            id: `milestone-${Date.now()}`,
            title,
            notes,
            status,
            created_at: new Date().toISOString(),
          },
        ];
      }

      const hasCompletedMilestone = nextMilestones.some((entry: any) => normalizeStatus(entry?.status) === 'complete');
      nextPipeline = setTaskStatus(currentPipeline, 'training', hasCompletedMilestone ? 'complete' : 'pending');
    } else {
      return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const attempts: UpdateAttempt[] = [];
    if (action === 'assign_mentor') {
      attempts.push(
        {
          onboarding_pipeline: nextPipeline,
          onboarding_mentor_member_profile_id: nextMentorId,
          mentor_assigned_at: nextMentorId ? nowIso : null,
        },
        {
          onboarding_pipeline: nextPipeline,
          mentor_member_profile_id: nextMentorId,
          mentor_assigned_at: nextMentorId ? nowIso : null,
        },
        {
          onboarding_pipeline: nextPipeline,
          mentor_id: nextMentorId,
        },
        {
          onboarding_pipeline: nextPipeline,
        }
      );
    } else if (action === 'upsert_milestone') {
      attempts.push(
        {
          onboarding_pipeline: nextPipeline,
          training_milestones: nextMilestones,
          training_milestones_updated_at: nowIso,
        },
        {
          onboarding_pipeline: nextPipeline,
          onboarding_training_milestones: nextMilestones,
          training_milestones_updated_at: nowIso,
        },
        {
          onboarding_pipeline: nextPipeline,
        }
      );
    } else {
      attempts.push({
        onboarding_pipeline: nextPipeline,
      });
    }

    const { updated, payload: appliedPayload } = await applyFirstSuccessfulUpdate(
      base44,
      targetMemberProfileId,
      attempts
    );

    if (action === 'assign_mentor' && nextMentorId && nextMentorId !== actorMemberId) {
      try {
        await base44.entities.Notification.create({
          user_id: nextMentorId,
          type: 'system',
          title: 'Mentor Assignment',
          message: `${targetMember.display_callsign || targetMember.callsign || targetMember.id} assigned to you`,
          related_entity_type: 'member_profile',
          related_entity_id: targetMemberProfileId,
        });
      } catch (error) {
        console.error('[updateOnboardingPipeline] Notification failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      action,
      memberProfile: updated,
      pipeline: nextPipeline,
      mentorMemberProfileId: nextMentorId,
      milestones: nextMilestones,
      assignmentField: Object.keys(appliedPayload).find((key) => key.includes('mentor')) || null,
    });
  } catch (error) {
    console.error('[updateOnboardingPipeline] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
