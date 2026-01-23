import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can revoke keys
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const payload = await req.json();
    const { code } = payload;

    if (!code) {
      return Response.json({ error: 'Code required' }, { status: 400 });
    }

    // Find and revoke key
    const keys = await base44.asServiceRole.entities.AccessKey.filter({ code });
    
    if (!keys || keys.length === 0) {
      return Response.json({ error: 'Key not found' }, { status: 404 });
    }

    const key = keys[0];

    // Revoke it
    await base44.asServiceRole.entities.AccessKey.update(key.id, {
      status: 'REVOKED'
    });

    // Log revocation
    await base44.asServiceRole.entities.AdminAuditLog.create({
      actor_user_id: user.id,
      action: 'revoke_access_key',
      payload: { code, original_status: key.status },
      executed_by: user.id,
      executed_at: new Date().toISOString(),
      step_name: 'access_control',
      status: 'success'
    }).catch(err => console.error('Audit log error:', err));

    return Response.json({
      success: true,
      code,
      message: 'Access key revoked'
    });
  } catch (error) {
    console.error('revokeAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});