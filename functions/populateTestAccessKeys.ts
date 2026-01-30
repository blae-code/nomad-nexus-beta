import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
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
        redeemed_by_user_ids: []
      },
      {
        code: 'TEST-0002-EFGH',
        status: 'ACTIVE',
        max_uses: 1,
        uses_count: 0,
        grants_rank: 'PILOT',
        grants_roles: [],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        redeemed_by_user_ids: []
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