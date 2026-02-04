import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, netId, eventId, isTransmitting } = payload;

    if (!status || !['online', 'idle', 'in-call', 'transmitting', 'away', 'offline'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch net details if provided
    let netDetails = null;
    if (netId) {
      try {
        const net = await base44.entities.VoiceNet.get(netId);
        netDetails = {
          id: net.id,
          code: net.code,
          label: net.label
        };
      } catch (err) {
        console.error('[PRESENCE] Failed to fetch net:', err.message);
      }
    }

    // Get MemberProfile for current user
    const memberProfileId = memberProfile?.id || null;
    if (!memberProfileId) {
      return Response.json({ error: 'Member profile not found' }, { status: 404 });
    }

    // Find or create presence record
    const filterQuery = { member_profile_id: memberProfileId };
    let existing = [];
    
    try {
      existing = await base44.entities.UserPresence.filter(filterQuery);
    } catch (err) {
      console.debug('[PRESENCE] Filter failed, will create new:', err.message);
    }

    const presenceData = {
      member_profile_id: memberProfileId,
      status,
      is_transmitting: isTransmitting || false,
      last_activity: new Date().toISOString(),
      ...(netId && { net_id: netId }),
      ...(eventId && { event_id: eventId }),
      ...(netDetails && { current_net: netDetails })
    };

    let presence;
    if (existing && existing.length > 0) {
      presence = await base44.entities.UserPresence.update(
        existing[0].id,
        presenceData
      );
    } else {
      presence = await base44.entities.UserPresence.create(presenceData);
    }

    return Response.json({ success: true, presence });
  } catch (error) {
    console.error('[PRESENCE] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
