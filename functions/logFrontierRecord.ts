import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

function toToken(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function getRoleTokens(memberProfile: any) {
  const roles = new Set<string>();
  const rank = toToken(memberProfile?.rank);
  if (rank) roles.add(rank);
  const list = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles
    : memberProfile?.roles
    ? [memberProfile.roles]
    : [];
  for (const role of list) {
    const token = toToken(role);
    if (token) roles.add(token);
  }
  return roles;
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

    const { recordType, eventId, region, coordinates = '', notes = '' } = payload;
    if (!recordType || !eventId || !region) {
      return Response.json(
        { error: 'recordType, eventId, and region are required' },
        { status: 400 }
      );
    }

    const normalizedType = String(recordType).toLowerCase();
    if (!['claim', 'discovery'].includes(normalizedType)) {
      return Response.json({ error: `Unsupported recordType: ${recordType}` }, { status: 400 });
    }

    const roleTokens = getRoleTokens(memberProfile);
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isCommand = Array.from(roleTokens).some((token) => COMMAND_RANKS.has(token));

    if (normalizedType === 'claim' && !isAdmin && !isCommand) {
      return Response.json({ error: 'Only command staff can register territory claims' }, { status: 403 });
    }

    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const logType = normalizedType === 'claim' ? 'TERRITORY_CLAIM' : 'FRONTIER_DISCOVERY';
    const severity = normalizedType === 'claim' ? 'MEDIUM' : 'LOW';
    const summary =
      normalizedType === 'claim'
        ? `Territory claim filed: ${region}`
        : `New frontier discovery: ${region}`;

    const record = await base44.entities.EventLog.create({
      event_id: eventId,
      type: logType,
      severity,
      actor_member_profile_id: memberProfile?.id || null,
      summary,
      details: {
        region: String(region).trim(),
        coordinates: String(coordinates || '').trim() || null,
        notes: String(notes || '').trim() || null,
        reported_at: new Date().toISOString(),
      },
    });

    if (normalizedType === 'claim') {
      try {
        const members = await base44.entities.MemberProfile.list('-created_date', 500);
        for (const profile of members || []) {
          const rank = toToken(profile?.rank);
          const roles = Array.isArray(profile?.roles)
            ? profile.roles.map((role: unknown) => toToken(role))
            : [];
          const isStaff =
            COMMAND_RANKS.has(rank) ||
            roles.includes('ADMIN') ||
            roles.includes('OFFICER');
          if (!isStaff || !profile?.id || profile.id === memberProfile?.id) continue;

          await base44.entities.Notification.create({
            user_id: profile.id,
            type: 'alert',
            title: 'Frontier Territory Claim',
            message: `${region} has been claimed in ${event.title || 'active operation'}`,
            related_entity_type: 'event_log',
            related_entity_id: record.id,
          });
        }
      } catch (error) {
        console.error('[logFrontierRecord] Claim notifications failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      recordType: normalizedType,
      record,
    });
  } catch (error) {
    console.error('[logFrontierRecord] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
