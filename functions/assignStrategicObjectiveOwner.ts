import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

async function resolveMemberProfile(base44: any, memberId: string) {
  if (!memberId) return null;
  try {
    return await base44.entities.MemberProfile.get(memberId);
  } catch {
    try {
      const rows = await base44.entities.MemberProfile.filter({ id: memberId });
      return rows?.[0] ?? null;
    } catch {
      return null;
    }
  }
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

    const { objectiveId, ownerMemberProfileId } = payload;
    if (!objectiveId || !ownerMemberProfileId) {
      return Response.json({ error: 'objectiveId and ownerMemberProfileId required' }, { status: 400 });
    }

    const objective = await base44.entities.StrategicObjective.get(objectiveId);
    if (!objective) {
      return Response.json({ error: 'Objective not found' }, { status: 404 });
    }

    const actorId = memberProfile?.id || null;
    const actorRank = (memberProfile?.rank || '').toString().toUpperCase();
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isCurrentOwner =
      actorId &&
      [
        objective.owner_member_profile_id,
        objective.assigned_member_profile_id,
        objective.owner_user_id,
        objective.created_by_member_profile_id,
      ].includes(actorId);

    if (!isAdmin && !COMMAND_RANKS.has(actorRank) && !isCurrentOwner) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const ownerProfile = await resolveMemberProfile(base44, ownerMemberProfileId);
    if (!ownerProfile?.id) {
      return Response.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    const attempts = [
      { field: 'owner_member_profile_id', payload: { owner_member_profile_id: ownerProfile.id } },
      { field: 'assigned_member_profile_id', payload: { assigned_member_profile_id: ownerProfile.id } },
      { field: 'owner_user_id', payload: { owner_user_id: ownerProfile.id } },
    ];

    let updated = null;
    let assignmentField = null;
    let lastError: Error | null = null;

    for (const attempt of attempts) {
      try {
        updated = await base44.entities.StrategicObjective.update(objectiveId, attempt.payload);
        assignmentField = attempt.field;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!updated) {
      throw lastError || new Error('Unable to assign objective owner');
    }

    if (ownerProfile.id !== actorId) {
      try {
        await base44.entities.Notification.create({
          user_id: ownerProfile.id,
          type: 'system',
          title: 'Objective Ownership Assigned',
          message: updated.title || 'You were assigned ownership of a strategic objective.',
          related_entity_type: 'strategic_objective',
          related_entity_id: objectiveId,
        });
      } catch (error) {
        console.error('[assignStrategicObjectiveOwner] Notification failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      objective: updated,
      assignmentField,
    });
  } catch (error) {
    console.error('[assignStrategicObjectiveOwner] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
