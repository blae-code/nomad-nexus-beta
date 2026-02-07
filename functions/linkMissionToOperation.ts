import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

type UpdateAttempt = Record<string, unknown>;

function toToken(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function isCommandRank(memberProfile: any) {
  return COMMAND_RANKS.has(toToken(memberProfile?.rank));
}

function normalizeMission(input: any) {
  const id = String(input?.id || '').trim();
  const title = String(input?.title || '').trim();
  if (!id || !title) return null;

  return {
    id,
    title,
    category: String(input?.category || '').trim() || null,
    operationProfile: String(input?.operationProfile || '').trim() || null,
    location: String(input?.location || '').trim() || null,
    difficulty: String(input?.difficulty || '').trim() || null,
    reward: String(input?.reward || '').trim() || null,
    tags: Array.isArray(input?.tags) ? input.tags.map((tag: unknown) => String(tag)) : [],
    source: 'game_mission_catalog',
  };
}

function getExistingLinks(event: any) {
  if (Array.isArray(event?.linked_missions)) return event.linked_missions;
  if (Array.isArray(event?.mission_catalog_entries)) return event.mission_catalog_entries;
  return [];
}

function getExistingObjectives(event: any) {
  return Array.isArray(event?.objectives) ? event.objectives : [];
}

function buildObjectiveForMission(mission: any) {
  return {
    id: `mission_${mission.id}`,
    text: `Run mission: ${mission.title}`,
    is_completed: false,
    source: 'mission_catalog',
    mission_catalog_id: mission.id,
  };
}

async function applyFirstSuccessfulUpdate(base44: any, operationId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      const event = await base44.entities.Event.update(operationId, payload);
      return { event, payload };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Failed to update operation with mission link');
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

    const operationId = payload.operationId || payload.eventId;
    const mission = normalizeMission(payload.mission);
    if (!operationId || !mission) {
      return Response.json({ error: 'operationId and mission{id,title} are required' }, { status: 400 });
    }

    const operation = await base44.entities.Event.get(operationId);
    if (!operation) {
      return Response.json({ error: 'Operation not found' }, { status: 404 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorAdminId = adminUser?.id || null;
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isCommand = isCommandRank(memberProfile);
    const isHost =
      Boolean(actorMemberId) &&
      [
        operation.host_member_profile_id,
        operation.host_id,
        operation.created_by_member_profile_id,
        operation.owner_member_profile_id,
      ]
        .filter(Boolean)
        .includes(actorMemberId);

    if (!isAdmin && !isCommand && !isHost) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const currentLinks = getExistingLinks(operation);
    const alreadyLinked = currentLinks.some((entry: any) => String(entry?.id || '') === mission.id);
    const nextLinks = alreadyLinked ? currentLinks : [...currentLinks, mission];

    const currentObjectives = getExistingObjectives(operation);
    const hasMissionObjective = currentObjectives.some(
      (entry: any) =>
        String(entry?.mission_catalog_id || '') === mission.id ||
        String(entry?.id || '') === `mission_${mission.id}`
    );
    const nextObjectives = hasMissionObjective
      ? currentObjectives
      : [...currentObjectives, buildObjectiveForMission(mission)];

    const { event: updatedOperation, payload: appliedPayload } = await applyFirstSuccessfulUpdate(
      base44,
      operationId,
      [
        {
          linked_missions: nextLinks,
          objectives: nextObjectives,
        },
        {
          mission_catalog_entries: nextLinks,
          objectives: nextObjectives,
        },
        {
          objectives: nextObjectives,
        },
      ]
    );

    let eventLogCreated = false;
    try {
      await base44.entities.EventLog.create({
        event_id: operationId,
        type: 'OP_MISSION_LINK',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Linked mission to operation: ${mission.title}`,
        details: {
          mission_id: mission.id,
          mission_title: mission.title,
          mission_category: mission.category,
          mission_difficulty: mission.difficulty,
          actor_admin_id: actorAdminId,
        },
      });
      eventLogCreated = true;
    } catch (error) {
      console.error('[linkMissionToOperation] Event log failed:', error.message);
    }

    return Response.json({
      success: true,
      operation: updatedOperation,
      mission,
      alreadyLinked,
      eventLogCreated,
      linkedField:
        (Object.keys(appliedPayload).find((key) => key === 'linked_missions' || key === 'mission_catalog_entries')) ||
        null,
    });
  } catch (error) {
    console.error('[linkMissionToOperation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
