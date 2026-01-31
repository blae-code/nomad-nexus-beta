import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory rate limiter (5 min lockout after 10 failures)
const failureMap = new Map();

function checkRateLimit(userId) {
  const key = `${userId}:redeem`;
  const record = failureMap.get(key);
  
  if (!record) return { allowed: true };
  if (Date.now() - record.lastFailure > 5 * 60 * 1000) {
    failureMap.delete(key);
    return { allowed: true };
  }
  
  if (record.failures >= 10) {
    const remaining = Math.ceil((5 * 60 * 1000 - (Date.now() - record.lastFailure)) / 1000);
    return { allowed: false, remaining };
  }
  
  return { allowed: true };
}

function recordFailure(userId) {
  const key = `${userId}:redeem`;
  const record = failureMap.get(key) || { failures: 0, lastFailure: Date.now() };
  record.failures++;
  record.lastFailure = Date.now();
  failureMap.set(key, record);
}

function clearFailures(userId) {
  const key = `${userId}:redeem`;
  failureMap.delete(key);
}

Deno.serve(async (req) => {
   try {
      // For new user registration via access key
      const base44 = createClientFromRequest(req);

      // Generate unique ID for rate limiting (before user creation)
      const redemptionId = crypto.randomUUID();

      // Rate limit check
      const limit = checkRateLimit(redemptionId);
      if (!limit.allowed) {
        return Response.json({
          success: false,
          message: 'Rate limited. Try again in ' + limit.remaining + ' seconds',
          lockout_seconds: limit.remaining
        }, { status: 429 });
      }

      let payload;
      try {
        const body = await req.text();
        payload = body ? JSON.parse(body) : {};
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr?.message, 'body was:', await req.text().catch(() => 'unreadable'));
        recordFailure(redemptionId);
        return Response.json({ success: false, message: 'Invalid request format' }, { status: 400 });
      }
     const { code, callsign } = payload;

     if (code === 'DEMO-ACCESS') {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Demo access is no longer supported' }, { status: 403 });
     }

     if (!code || typeof code !== 'string') {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Invalid code' }, { status: 400 });
     }

     if (!callsign || typeof callsign !== 'string' || callsign.trim().length === 0) {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Callsign is required' }, { status: 400 });
     }

     // Find key - use service role for unrestricted access
     let keys = [];
     try {
       keys = await base44.asServiceRole.entities.AccessKey.filter({ code });
     } catch (filterErr) {
       console.error('Filter error:', filterErr?.message);
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
     }

     if (!keys || keys.length === 0) {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
     }

     const key = keys[0];

     // Validation checks
     if (key.status === 'REVOKED') {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'This access code has been revoked' }, { status: 403 });
     }

     if (key.status === 'EXPIRED' || (key.expires_at && new Date(key.expires_at) < new Date())) {
       // Mark as expired if not already
       if (key.status !== 'EXPIRED') {
         await base44.asServiceRole.entities.AccessKey.update(key.id, { status: 'EXPIRED' });
       }
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'This access code has expired' }, { status: 403 });
     }

     if (key.uses_count >= key.max_uses) {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'This access code has reached its usage limit' }, { status: 403 });
     }

     // Create MemberProfile directly (Member-first registration, no User entity)
     let newMemberProfile = null;
     try {
       newMemberProfile = await base44.asServiceRole.entities.MemberProfile.create({
         callsign: callsign.trim(),
         rank: key.grants_rank || 'VAGRANT',
         roles: key.grants_roles || []
       });
       console.log('New member profile created:', newMemberProfile.id);
     } catch (createErr) {
       console.error('Member profile creation error:', createErr?.message);
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Failed to create member profile' }, { status: 500 });
     }

     if (!newMemberProfile || !newMemberProfile.id) {
       recordFailure(redemptionId);
       return Response.json({ success: false, message: 'Member profile creation failed' }, { status: 500 });
     }

     // Update AccessKey to link to MemberProfile ID
     const newRedeemed = [...(key.redeemed_by_member_profile_ids || []), newMemberProfile.id];
     const newUseCount = key.uses_count + 1;
     const newStatus = newUseCount >= key.max_uses ? 'REDEEMED' : 'ACTIVE';

     await base44.asServiceRole.entities.AccessKey.update(key.id, {
       uses_count: newUseCount,
       redeemed_by_member_profile_ids: newRedeemed,
       status: newStatus
     });

     // Log successful redemption
     await base44.asServiceRole.entities.AdminAuditLog.create({
       actor_member_profile_id: newMemberProfile.id,
       action: 'redeem_access_key',
       payload: { code, callsign: callsign.trim(), rank: key.grants_rank, roles: key.grants_roles, member_profile_id: newMemberProfile.id },
       executed_by_member_profile_id: newMemberProfile.id,
       executed_at: new Date().toISOString(),
       step_name: 'access_control',
       status: 'success'
     }).catch(err => console.error('Audit log error:', err));

      clearFailures(redemptionId);

      // Generate login token for Member-first authentication
      const loginToken = btoa(JSON.stringify({
        code: code,
        callsign: callsign.trim(),
        memberProfileId: newMemberProfile.id,
        timestamp: Date.now()
      }));

      return Response.json({
        success: true,
        member_profile_id: newMemberProfile.id,
        grants_rank: key.grants_rank,
        grants_roles: key.grants_roles,
        code_hash: key.code.substring(0, 4) + '****' + key.code.substring(key.code.length - 4),
        loginToken: loginToken,
        message: 'Access code redeemed successfully - member profile created'
      });
     } catch (error) {
      console.error('redeemAccessKey error:', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
     }
});