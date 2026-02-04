import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload);

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse optional body for filtered member profile IDs
    let memberProfileIds = null;
    let includeDetails = false;
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        memberProfileIds = payload.memberProfileIds && Array.isArray(payload.memberProfileIds) ? payload.memberProfileIds : null;
        includeDetails = payload.includeDetails === true;
      } catch {
        // Ignore parse errors
      }
    }

    // Fetch member profiles (service role allows unrestricted access)
    let members = [];
    if (memberProfileIds && memberProfileIds.length > 0) {
      // Fetch specific members in parallel
      members = await Promise.all(
        memberProfileIds.map(id => base44.asServiceRole.entities.MemberProfile.get(id).catch(() => null))
      );
      members = members.filter(m => m !== null);
    } else {
      // Fetch all members
      members = await base44.asServiceRole.entities.MemberProfile.list();
    }

    let assets = [];
    let commendations = [];
    let events = [];
    if (includeDetails) {
      try {
        assets = await base44.asServiceRole.entities.FleetAsset.list();
      } catch {
        assets = [];
      }
      try {
        commendations = await base44.asServiceRole.entities.Commendation.list();
      } catch {
        commendations = [];
      }
      try {
        events = await base44.asServiceRole.entities.Event.list('-start_time', 200);
      } catch {
        events = [];
      }
    }

    // Map to public directory (exclude sensitive fields)
    const directory = members.map(member => {
      const ownedAssets = includeDetails
        ? assets.filter(a => a.owner_member_profile_id === member.id)
        : [];
      const memberCommendations = includeDetails
        ? commendations.filter(c => c.recipient_member_profile_id === member.id || c.member_profile_id === member.id)
        : [];
      const participation = includeDetails
        ? events.filter(e => (e.assigned_member_profile_ids || e.assigned_user_ids || []).includes(member.id)).slice(0, 8)
        : [];

      return {
        id: member.id,
        callsign: member.callsign || 'Unknown',
        display_callsign: member.display_callsign || null,
        rank: member.rank || 'VAGRANT',
        membership: member.membership || 'VAGRANT',
        roles: member.roles || [],
        bio: member.bio || '',
        certifications: member.certifications || member.certification_list || [],
        medals: member.medals || member.medal_list || [],
        hangar_count: ownedAssets.length,
        commendation_count: memberCommendations.length,
        recent_operations: participation.map(e => ({
          id: e.id,
          title: e.title,
          status: e.status,
          start_time: e.start_time
        }))
      };
    });

    return Response.json({ members: directory });
  } catch (error) {
    console.error('[MEMBER_DIRECTORY] Error:', error);
    return Response.json(
      { error: error.message, members: [] },
      { status: 500 }
    );
  }
});
