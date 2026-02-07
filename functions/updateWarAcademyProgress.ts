import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

type UpdateAttempt = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asTags(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasInstructorPrivileges(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = String(memberProfile?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.includes('training') || roles.includes('instructor') || roles.includes('mentor') || roles.includes('admin');
}

function asMilestones(profile: any) {
  if (Array.isArray(profile?.training_milestones)) return profile.training_milestones;
  if (Array.isArray(profile?.onboarding_training_milestones)) return profile.onboarding_training_milestones;
  return [];
}

function upsertMilestone(existing: any[], next: any) {
  const id = text(next?.id);
  if (!id) return existing;
  const idx = existing.findIndex((entry) => text(entry?.id) === id);
  if (idx < 0) return [...existing, next];
  const merged = [...existing];
  merged[idx] = { ...merged[idx], ...next };
  return merged;
}

function setTrainingTaskComplete(pipeline: any[] | undefined) {
  const base = Array.isArray(pipeline) ? pipeline : [];
  if (base.length === 0) return base;
  return base.map((task) =>
    text(task?.id) === 'training'
      ? { ...task, status: 'complete' }
      : task
  );
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

function certificationEntry(payload: any, actorMemberId: string | null) {
  const name = text(payload.certificationName || payload.name);
  const level = text(payload.certificationLevel || payload.level || 'STANDARD');
  return {
    id: `cert_${Date.now()}`,
    name,
    level,
    issued_at: new Date().toISOString(),
    issued_by_member_profile_id: actorMemberId,
  };
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
    const isInstructor = hasInstructorPrivileges(memberProfile, actorType);
    const nowIso = new Date().toISOString();

    if (action === 'upsert_scenario') {
      if (!isInstructor) {
        return Response.json({ error: 'Instructor privileges required' }, { status: 403 });
      }

      const scenario = payload.scenario || {};
      const name = text(scenario.name || payload.name);
      if (!name) {
        return Response.json({ error: 'Scenario name required' }, { status: 400 });
      }

      const difficulty = text(scenario.difficulty || payload.difficulty || 'standard').toLowerCase();
      const tags = Array.from(
        new Set([
          ...asTags(scenario.tags || payload.tags),
          'war-academy',
          'scenario',
          `difficulty:${difficulty}`,
        ])
      );

      let template: any = null;
      const templateId = text(scenario.id || payload.scenarioId || payload.templateId);

      if (base44?.entities?.EventTemplate?.create) {
        if (templateId) {
          try {
            template = await base44.entities.EventTemplate.update(templateId, {
              name,
              description: text(scenario.description || payload.description),
              event_type: text(scenario.event_type || payload.event_type || 'focused'),
              priority: text(scenario.priority || payload.priority || 'STANDARD').toUpperCase(),
              tags,
              training_prerequisites: text(scenario.prerequisites || payload.prerequisites),
              updated_by_member_profile_id: actorMemberId,
            });
          } catch {
            template = null;
          }
        }
        if (!template) {
          template = await base44.entities.EventTemplate.create({
            name,
            description: text(scenario.description || payload.description),
            event_type: text(scenario.event_type || payload.event_type || 'focused'),
            priority: text(scenario.priority || payload.priority || 'STANDARD').toUpperCase(),
            tags,
            training_prerequisites: text(scenario.prerequisites || payload.prerequisites),
            created_by_member_profile_id: actorMemberId,
          });
        }
      }

      let log = null;
      try {
        log = await base44.entities.EventLog.create({
          type: 'TRAINING_SCENARIO',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `Scenario upserted: ${name}`,
          details: {
            scenario_name: name,
            difficulty,
            template_id: template?.id || null,
            tags,
          },
        });
      } catch (error) {
        console.error('[updateWarAcademyProgress] Scenario log failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        scenario: template || {
          id: templateId || `scenario_${Date.now()}`,
          name,
          tags,
          description: text(scenario.description || payload.description),
        },
        logId: log?.id || null,
      });
    }

    if (action === 'create_simulation') {
      if (!isInstructor) {
        return Response.json({ error: 'Instructor privileges required' }, { status: 403 });
      }

      const title = text(payload.title, 'War Academy Simulation');
      const startTime = text(payload.start_time || payload.startTime, new Date(Date.now() + 60 * 60 * 1000).toISOString());
      const event = await base44.entities.Event.create({
        title,
        description: text(payload.description || 'Training simulation'),
        event_type: text(payload.event_type || 'focused'),
        priority: text(payload.priority || 'HIGH').toUpperCase(),
        start_time: new Date(startTime).toISOString(),
        status: 'scheduled',
        phase: 'PLANNING',
        tags: Array.from(new Set([...asTags(payload.tags), 'training', 'simulation', 'war-academy'])),
        host_id: actorMemberId,
        training_prerequisites: text(payload.training_prerequisites || ''),
      });

      try {
        await base44.entities.EventLog.create({
          event_id: event.id,
          type: 'TRAINING_SIM',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `Simulation scheduled: ${title}`,
        });
      } catch (error) {
        console.error('[updateWarAcademyProgress] Simulation log failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        simulation: event,
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

    if (action === 'complete_scenario') {
      if (!isInstructor && actorMemberId !== targetMemberProfileId) {
        return Response.json({ error: 'Cannot complete scenarios for other members without instructor role' }, { status: 403 });
      }

      const scenarioId = text(payload.scenarioId || payload.moduleId, `scenario_${Date.now()}`);
      const scenarioTitle = text(payload.scenarioTitle || payload.moduleTitle || payload.title, 'Training Scenario');
      const score = Math.max(0, Math.min(100, Number(payload.score ?? 0)));

      const milestones = upsertMilestone(asMilestones(targetMember), {
        id: scenarioId,
        title: scenarioTitle,
        status: 'complete',
        score,
        notes: text(payload.notes || ''),
        completed_at: nowIso,
        completed_by_member_profile_id: actorMemberId,
      });
      const pipeline = setTrainingTaskComplete(targetMember?.onboarding_pipeline);

      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          training_milestones: milestones,
          onboarding_pipeline: pipeline,
          training_points: Number(targetMember?.training_points || 0) + Math.max(1, Math.round(score / 20)),
          last_training_activity_at: nowIso,
        },
        {
          onboarding_training_milestones: milestones,
          onboarding_pipeline: pipeline,
          training_points: Number(targetMember?.training_points || 0) + Math.max(1, Math.round(score / 20)),
          last_training_activity_at: nowIso,
        },
        {
          onboarding_pipeline: pipeline,
          last_training_activity_at: nowIso,
        },
      ]);

      try {
        await base44.entities.EventLog.create({
          type: 'TRAINING_PROGRESS',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `${scenarioTitle} completed by ${targetMemberProfileId}`,
          details: {
            target_member_profile_id: targetMemberProfileId,
            scenario_id: scenarioId,
            score,
          },
        });
      } catch (error) {
        console.error('[updateWarAcademyProgress] Completion log failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        milestones,
        score,
      });
    }

    if (action === 'issue_certification') {
      if (!isInstructor) {
        return Response.json({ error: 'Instructor privileges required' }, { status: 403 });
      }

      const cert = certificationEntry(payload, actorMemberId);
      if (!cert.name) {
        return Response.json({ error: 'Certification name required' }, { status: 400 });
      }

      const existingCerts = Array.isArray(targetMember?.certifications)
        ? targetMember.certifications
        : Array.isArray(targetMember?.certification_list)
        ? targetMember.certification_list
        : [];
      const nextCerts = [...existingCerts, cert];

      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        {
          certifications: nextCerts,
          certification_awarded_at: nowIso,
        },
        {
          certification_list: nextCerts,
          certification_awarded_at: nowIso,
        },
        {
          certification_awarded_at: nowIso,
        },
      ]);

      try {
        if (targetMemberProfileId !== actorMemberId) {
          await base44.entities.Notification.create({
            user_id: targetMemberProfileId,
            type: 'system',
            title: 'Certification Awarded',
            message: `${cert.name} (${cert.level})`,
            related_entity_type: 'member_profile',
            related_entity_id: targetMemberProfileId,
          });
        }
      } catch (error) {
        console.error('[updateWarAcademyProgress] Certification notification failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        certification: cert,
      });
    }

    if (action === 'instructor_note') {
      if (!isInstructor) {
        return Response.json({ error: 'Instructor privileges required' }, { status: 403 });
      }

      const note = text(payload.note);
      if (!note) {
        return Response.json({ error: 'note required' }, { status: 400 });
      }

      const existing = Array.isArray(targetMember?.training_feedback) ? targetMember.training_feedback : [];
      const nextFeedback = [...existing, {
        id: `feedback_${Date.now()}`,
        note,
        authored_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      }].slice(-80);

      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        { training_feedback: nextFeedback },
        {
          notes: `${text(targetMember?.notes)}\n[training_feedback]${JSON.stringify(nextFeedback)}[/training_feedback]`.trim(),
        },
      ]);

      return Response.json({
        success: true,
        action,
        profile: updated,
        feedback: nextFeedback,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateWarAcademyProgress] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
