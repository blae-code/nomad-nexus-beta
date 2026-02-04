import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

// Generate human-typeable 10-12 char code (exclude ambiguous: 0, O, 1, I, l)
function generateAccessCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 11; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    // Only admins can issue keys
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const {
      grants_rank = 'VAGRANT',
      grants_roles = [],
      expires_at,
      max_uses = 1,
      note
    } = payload;

    // Generate unique code
    let code = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await base44.asServiceRole.entities.AccessKey.filter({ code });
      if (!existing || existing.length === 0) break;
      code = generateAccessCode();
      attempts++;
    }

    if (attempts >= 10) {
      return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
    }

    // Create access key
    const expiresAt = expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const key = await base44.entities.AccessKey.create({
      code,
      status: 'ACTIVE',
      max_uses,
      uses_count: 0,
      expires_at: expiresAt,
      issued_by_member_profile_id: memberProfile?.id || null,
      redeemed_by_member_profile_ids: [],
      grants_rank,
      grants_roles,
      note
    });

    // Log to audit
    await base44.entities.AdminAuditLog.create({
      actor_member_profile_id: memberProfile?.id || null,
      action: 'issue_access_key',
      payload: { code, grants_rank, max_uses, expires_at: expiresAt },
      executed_by_member_profile_id: memberProfile?.id || null,
      executed_at: new Date().toISOString(),
      step_name: 'access_control',
      status: 'success'
    }).catch(err => console.error('Audit log error:', err));

    return Response.json({
      code,
      status: 'ACTIVE',
      max_uses,
      expires_at: expiresAt,
      grants_rank
    });
  } catch (error) {
    console.error('issueAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
