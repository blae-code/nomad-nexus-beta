import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const generateCode = () => {
  // 10-12 char alphanumeric, exclude ambiguous chars (0, O, l, 1, etc)
  const chars = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 11; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { grants_rank = 'VAGRANT', grants_roles = [], expires_at, max_uses = 1, note } = await req.json();

    const code = generateCode();
    const expiresAt = expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await base44.asServiceRole.entities.AccessKey.create({
      code,
      status: 'ACTIVE',
      max_uses,
      uses_count: 0,
      expires_at: expiresAt,
      issued_by_user_id: user.id,
      redeemed_by_user_ids: [],
      grants_rank,
      grants_roles,
      note: note || undefined
    });

    // Log action
    await base44.asServiceRole.entities.AdminAuditLog.create({
      actor_user_id: user.id,
      action: 'ISSUE_ACCESS_KEY',
      payload: { code, grants_rank, grants_roles, max_uses, note },
      created_at: new Date().toISOString()
    });

    return Response.json({ code, expiresAt }, { status: 201 });
  } catch (error) {
    console.error('issueAccessKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});