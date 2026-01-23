import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const upperCode = code.toUpperCase().trim();

    // Fetch the access key
    const keys = await base44.asServiceRole.entities.AccessKey.filter({ code: upperCode }, '-created_date', 1);
    if (!keys || keys.length === 0) {
      return Response.json({ error: 'Access key not found' }, { status: 404 });
    }

    const key = keys[0];

    // Revoke it
    await base44.asServiceRole.entities.AccessKey.update(key.id, { status: 'REVOKED' });

    // Log revocation
    await base44.asServiceRole.entities.AdminAuditLog.create({
      actor_user_id: user.id,
      action: 'REVOKE_ACCESS_KEY',
      payload: { code: upperCode },
      created_at: new Date().toISOString()
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('revokeAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});