import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { access_key_id, action, details } = body;
    
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    const auditLog = await base44.asServiceRole.entities.AccessKeyAudit.create({
      access_key_id,
      action,
      performed_by_user_id: user.id,
      performed_by_name: user.full_name,
      details: details || {},
      timestamp: new Date().toISOString(),
      ip_address: ip,
    });

    return Response.json({ success: true, auditLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});