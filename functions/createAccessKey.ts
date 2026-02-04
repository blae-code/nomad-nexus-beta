import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.match(/.{1,4}/g).join('-');
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const adminMemberProfileId = memberProfile?.id || null;
    const { grantsRank, grantsPermissions, grantsMembership, grants_membership } = payload;
    const normalizedMembership = grantsMembership || grants_membership || null;

    if (!grantsRank) {
      return Response.json({ error: 'grantsRank is required' }, { status: 400 });
    }

    const key = await base44.entities.AccessKey.create({
      code: generateRandomCode(),
      status: 'ACTIVE',
      max_uses: 1,
      uses_count: 0,
      grants_rank: grantsRank,
      grants_roles: grantsPermissions || [],
      grants_membership: normalizedMembership,
      expires_at: null,
      created_by_member_profile_id: adminMemberProfileId,
    });

    // Log audit trail
    const actorName =
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.full_name ||
      adminUser?.email ||
      'Admin';

    await base44.entities.AccessKeyAudit.create({
      access_key_id: key.id,
      action: 'CREATE',
      performed_by_member_profile_id: memberProfile?.id || null,
      performed_by_user_id: adminUser?.id || null,
      performed_by_name: actorName,
      details: {
        grants_rank: grantsRank,
        grants_roles: grantsPermissions,
        grants_membership: normalizedMembership,
      },
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
    });

    return Response.json({ key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
