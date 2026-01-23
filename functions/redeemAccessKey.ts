import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'User not authenticated' }, { status: 401 });
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

    // Validate status
    if (key.status === 'REVOKED') {
      return Response.json({ error: 'Access key has been revoked' }, { status: 403 });
    }

    if (key.status === 'EXPIRED') {
      return Response.json({ error: 'Access key has expired' }, { status: 403 });
    }

    // Check expiration
    if (new Date(key.expires_at) < new Date()) {
      await base44.asServiceRole.entities.AccessKey.update(key.id, { status: 'EXPIRED' });
      return Response.json({ error: 'Access key has expired' }, { status: 403 });
    }

    // Check if user already redeemed this key
    if (key.redeemed_by_user_ids && key.redeemed_by_user_ids.includes(user.id)) {
      return Response.json({ error: 'You have already redeemed this key' }, { status: 400 });
    }

    // Check max uses
    if (key.uses_count >= key.max_uses) {
      return Response.json({ error: 'Access key has reached max uses' }, { status: 403 });
    }

    // Update key atomically
    const newUsesCount = key.uses_count + 1;
    const newRedeemedIds = [...(key.redeemed_by_user_ids || []), user.id];
    const newStatus = newUsesCount >= key.max_uses ? 'REDEEMED' : 'ACTIVE';

    await base44.asServiceRole.entities.AccessKey.update(key.id, {
      uses_count: newUsesCount,
      redeemed_by_user_ids: newRedeemedIds,
      status: newStatus
    });

    // Log redemption
    await base44.asServiceRole.entities.AdminAuditLog.create({
      actor_user_id: user.id,
      action: 'REDEEM_ACCESS_KEY',
      payload: { code: upperCode, grants_rank: key.grants_rank, grants_roles: key.grants_roles },
      created_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      grants_rank: key.grants_rank,
      grants_roles: key.grants_roles
    }, { status: 200 });
  } catch (error) {
    console.error('redeemAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});