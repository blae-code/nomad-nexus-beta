import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse optional body for filtered user IDs
    let userIds = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const body = await req.json();
        userIds = body.userIds && Array.isArray(body.userIds) ? body.userIds : null;
      } catch {
        // Ignore parse errors
      }
    }

    // Fetch users (service role allows non-admin access to User entity)
    let users = [];
    if (userIds && userIds.length > 0) {
      // Fetch specific users in parallel
      users = await Promise.all(
        userIds.map(id => base44.asServiceRole.entities.User.get(id).catch(() => null))
      );
      users = users.filter(u => u !== null);
    } else {
      // Fetch all users
      users = await base44.asServiceRole.entities.User.list();
    }

    // Map to public directory (exclude sensitive fields like email)
    const directory = users.map(user => ({
      id: user.id,
      callsign: user.callsign || user.rsi_handle || user.full_name || 'Unknown',
      rsi_handle: user.rsi_handle,
      rank: user.rank,
      avatar_url: user.avatar_url,
      assigned_role_ids: user.assigned_role_ids || []
    }));

    return Response.json({ users: directory });
  } catch (error) {
    console.error('[USER_DIRECTORY] Error:', error);
    return Response.json(
      { error: error.message, users: [] },
      { status: 500 }
    );
  }
});