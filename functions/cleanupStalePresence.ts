import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);

    // Only admins can run cleanup
    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all presences
    const presences = await base44.entities.UserPresence.list();
    
    // Mark as offline if last_activity > 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let cleanedCount = 0;

    for (const presence of presences) {
      if (presence.status !== 'offline') {
        const lastActivity = new Date(presence.last_activity);
        
        if (lastActivity < fiveMinutesAgo) {
          await base44.entities.UserPresence.update(presence.id, {
            status: 'offline',
            net_id: null,
            event_id: null,
            is_transmitting: false,
            current_net: null
          });
          cleanedCount++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      cleaned: cleanedCount,
      message: `Marked ${cleanedCount} stale presences as offline`
    });
  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
