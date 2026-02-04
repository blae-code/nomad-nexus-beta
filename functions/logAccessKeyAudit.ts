import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const body = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, body, {
      allowAdmin: true,
      allowMember: true
    });
    
    const { access_key_id, action, details } = body;
    
    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const actorName =
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.full_name ||
      adminUser?.email ||
      'Admin';

    const auditLog = await base44.entities.AccessKeyAudit.create({
      access_key_id,
      action,
      performed_by_user_id: adminUser?.id || null,
      performed_by_member_profile_id: memberProfile?.id || null,
      performed_by_name: actorName,
      details: details || {},
      timestamp: new Date().toISOString(),
      ip_address: ip,
    });

    return Response.json({ success: true, auditLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
