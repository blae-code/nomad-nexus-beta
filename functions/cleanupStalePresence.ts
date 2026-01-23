import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run cleanup
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all presences
    const presences = await base44.asServiceRole.entities.UserPresence.list();
    
    // Mark as offline if last_activity > 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let cleanedCount = 0;

    for (const presence of presences) {
      if (presence.status !== 'offline') {
        const lastActivity = new Date(presence.last_activity);
        
        if (lastActivity < fiveMinutesAgo) {
          await base44.asServiceRole.entities.UserPresence.update(presence.id, {
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