import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Generate unique admin access key (no auth required for bootstrap)
    const code = generateAccessCode();
    
    const adminKey = await base44.asServiceRole.entities.AccessKey.create({
      code: code,
      status: 'ACTIVE',
      max_uses: 1,
      uses_count: 0,
      grants_rank: 'Pioneer',
      grants_roles: ['admin', 'commander', 'moderator'],
      created_by_member_profile_id: 'system_bootstrap'
    });

    return Response.json({
      success: true,
      message: 'Admin access key generated for bootstrap',
      access_key: {
        id: adminKey.id,
        code: code,
        rank: 'Pioneer',
        roles: ['admin', 'commander', 'moderator'],
        status: 'ACTIVE',
        instructions: 'Redeem this code with callsign "System Admin" on the AccessGate to create your admin profile'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});