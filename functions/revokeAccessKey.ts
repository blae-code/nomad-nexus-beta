import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

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
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);

    const { keyId } = payload;

    if (!keyId) {
      return Response.json({ error: 'Key ID required' }, { status: 400 });
    }

    // Find the key
    const key = await base44.entities.AccessKey.get(keyId);
    
    if (!key) {
      return Response.json({ error: 'Key not found' }, { status: 404 });
    }

    // Only admins and the pioneer who created the key can revoke it
    const creatorId = key.created_by_member_profile_id || key.created_by_user_id;
    if (!isAdmin && memberProfile?.id !== creatorId) {
      return Response.json({ error: 'You can only revoke keys you created' }, { status: 403 });
    }

    // Revoke it
    await base44.entities.AccessKey.update(key.id, {
      status: 'REVOKED'
    });

    // Log revocation
    await base44.entities.AdminAuditLog.create({
      actor_member_profile_id: memberProfile?.id || null,
      action: 'revoke_access_key',
      payload: { keyId, original_status: key.status },
      executed_by_member_profile_id: memberProfile?.id || null,
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
