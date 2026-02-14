import { createServiceClient, readJson } from './_shared/memberAuth.ts';
import { enforceJsonPost, verifyInternalAutomationRequest } from './_shared/security.ts';

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
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const payload = await readJson(req);
    const internalAuth = verifyInternalAutomationRequest(req, payload, { requiredWhenSecretMissing: true });
    if (!internalAuth.ok) {
      return Response.json({ error: internalAuth.error }, { status: internalAuth.status });
    }
    if (String(payload?.confirm || '').toUpperCase() !== 'BOOTSTRAP_ADMIN_KEY') {
      return Response.json({ error: 'Confirmation token missing (confirm=BOOTSTRAP_ADMIN_KEY).' }, { status: 400 });
    }

    const base44 = createServiceClient();

    const existingActive = await base44.asServiceRole.entities.AccessKey.list('-created_date', 300).catch(() => []);
    const hasExistingActiveAdminKey = Array.isArray(existingActive)
      && existingActive.some((key: any) => {
        const status = String(key?.status || '').toUpperCase();
        if (status !== 'ACTIVE') return false;
        const rank = String(key?.grants_rank || '').toUpperCase();
        const roles = Array.isArray(key?.grants_roles)
          ? key.grants_roles.map((entry: unknown) => String(entry || '').toLowerCase())
          : [];
        return rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
      });
    if (hasExistingActiveAdminKey && payload?.force !== true) {
      return Response.json({
        success: false,
        error: 'Active admin-capable access key already exists. Pass force=true to override.',
      }, { status: 409 });
    }

    // Generate unique admin access key (internal bootstrap path)
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
    return Response.json({ error: error?.message || 'Bootstrap failed' }, { status: 500 });
  }
});
