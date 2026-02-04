import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, adminUser, memberProfile } = await getAuthContext(req, payload);

    const isAdmin = Boolean(adminUser) || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create test access keys
    const testKeys = await base44.asServiceRole.entities.AccessKey.bulkCreate([
      {
        code: 'TEST-0001-ABCD',
        status: 'ACTIVE',
        max_uses: 1,
        uses_count: 0,
        grants_rank: 'VAGRANT',
        grants_roles: [],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        redeemed_by_member_profile_ids: []
      },
      {
        code: 'TEST-0002-EFGH',
        status: 'ACTIVE',
        max_uses: 1,
        uses_count: 0,
        grants_rank: 'PILOT',
        grants_roles: [],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        redeemed_by_member_profile_ids: []
      }
    ]);

    return Response.json({ 
      success: true, 
      keys: testKeys,
      message: 'Test access keys created'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
