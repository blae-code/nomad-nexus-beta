import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const payload = await req.json();
    const { keyId } = payload;

    if (!keyId) {
      return Response.json({ error: 'Key ID required' }, { status: 400 });
    }

    // Find the key
    const key = await base44.asServiceRole.entities.AccessKey.get(keyId);
    
    if (!key) {
      return Response.json({ error: 'Key not found' }, { status: 404 });
    }

    // Only admins and the pioneer who created the key can revoke it
    if (user?.role !== 'admin' && user?.id !== key.created_by_user_id) {
      return Response.json({ error: 'You can only revoke keys you created' }, { status: 403 });
    }

    // Revoke it
    await base44.asServiceRole.entities.AccessKey.update(key.id, {
      status: 'REVOKED'
    });

    // Log revocation
    await base44.asServiceRole.entities.AdminAuditLog.create({
      actor_user_id: user.id,
      action: 'revoke_access_key',
      payload: { keyId, original_status: key.status },
      executed_by: user.id,
      executed_at: new Date().toISOString(),
      step_name: 'access_control',
      status: 'success'
    }).catch(err => console.error('Audit log error:', err));

    return Response.json({
      success: true,
      keyId,
      message: 'Access key revoked'
    });
  } catch (error) {
    console.error('revokeAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});