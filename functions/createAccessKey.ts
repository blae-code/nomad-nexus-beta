import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch admin's member profile
    const adminProfiles = await base44.asServiceRole.entities.MemberProfile.filter({ 
      created_by: user.id 
    });
    
    if (!adminProfiles || adminProfiles.length === 0) {
      return Response.json({ error: 'Admin member profile not found' }, { status: 404 });
    }

    const adminMemberProfileId = adminProfiles[0].id;

    const { grantsRank, grantsPermissions } = await req.json();

    if (!grantsRank) {
      return Response.json({ error: 'grantsRank is required' }, { status: 400 });
    }

    const key = await base44.asServiceRole.entities.AccessKey.create({
      code: generateRandomCode(),
      status: 'ACTIVE',
      max_uses: 1,
      uses_count: 0,
      grants_rank: grantsRank,
      grants_roles: grantsPermissions || [],
      expires_at: null,
      created_by_member_profile_id: adminMemberProfileId,
    });

    // Log audit trail
    await base44.asServiceRole.functions.invoke('logAccessKeyAudit', {
      access_key_id: key.id,
      action: 'CREATE',
      details: {
        grants_rank: grantsRank,
        grants_roles: grantsPermissions,
      },
    });

    return Response.json({ key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});