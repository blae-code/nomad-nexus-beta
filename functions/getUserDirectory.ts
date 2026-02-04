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
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        memberProfileIds = payload.memberProfileIds && Array.isArray(payload.memberProfileIds) ? payload.memberProfileIds : null;
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

    // Map to public directory (exclude sensitive fields)
    const directory = members.map(member => ({
      id: member.id,
      callsign: member.callsign || 'Unknown',
      rank: member.rank || 'VAGRANT',
      roles: member.roles || [],
      bio: member.bio || ''
    }));

    return Response.json({ members: directory });
  } catch (error) {
    console.error('[MEMBER_DIRECTORY] Error:', error);
    return Response.json(
      { error: error.message, members: [] },
      { status: 500 }
    );
  }
});
