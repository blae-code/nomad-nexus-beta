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
     const base44 = createClientFromRequest(req);

     // Try to get authenticated user, but allow unauthenticated access for key redemption
     let user = null;
     try {
       user = await base44.auth.me();
     } catch (err) {
       // User is not authenticated - that's OK for initial redemption
     }

     const userId = user?.id || 'anonymous';

     // Rate limit check
     const limit = checkRateLimit(userId);
     if (!limit.allowed) {
       return Response.json({
         success: false,
         message: 'Rate limited. Try again in ' + limit.remaining + ' seconds',
         lockout_seconds: limit.remaining
       }, { status: 429 });
     }

     const payload = await req.json();
     const { code, callsign } = payload;

     if (code === 'DEMO-ACCESS') {
       recordFailure(userId);
       return Response.json({ success: false, message: 'Demo access is no longer supported' }, { status: 403 });
     }

     if (!code || typeof code !== 'string') {
       recordFailure(userId);
       return Response.json({ success: false, message: 'Invalid code' }, { status: 400 });
     }

     if (!callsign || typeof callsign !== 'string' || callsign.trim().length === 0) {
       recordFailure(userId);
       return Response.json({ success: false, message: 'Callsign is required' }, { status: 400 });
     }

     // Find key - use service role for unrestricted access
     const keys = await base44.asServiceRole.entities.AccessKey.filter({ code });

     if (!keys || keys.length === 0) {
       recordFailure(userId);
       return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
     }

     const key = keys[0];

     // Validation checks
     if (key.status === 'REVOKED') {
       recordFailure(userId);
       return Response.json({ success: false, message: 'This access code has been revoked' }, { status: 403 });
     }

     if (key.status === 'EXPIRED' || (key.expires_at && new Date(key.expires_at) < new Date())) {
       // Mark as expired if not already
       if (key.status !== 'EXPIRED') {
         await base44.asServiceRole.entities.AccessKey.update(key.id, { status: 'EXPIRED' });
       }
       recordFailure(userId);
       return Response.json({ success: false, message: 'This access code has expired' }, { status: 403 });
     }

     if (key.uses_count >= key.max_uses) {
       recordFailure(userId);
       return Response.json({ success: false, message: 'This access code has reached its usage limit' }, { status: 403 });
     }

     // Check if user already redeemed this key (only if authenticated)
     if (user && key.redeemed_by_user_ids && key.redeemed_by_user_ids.includes(user.id)) {
       recordFailure(userId);
       return Response.json({ success: false, message: 'You have already redeemed this code' }, { status: 403 });
     }

     // Redeem atomically
     const newRedeemed = user ? [...(key.redeemed_by_user_ids || []), user.id] : (key.redeemed_by_user_ids || []);
     const newUseCount = key.uses_count + 1;
     const newStatus = newUseCount >= key.max_uses ? 'REDEEMED' : 'ACTIVE';

     await base44.asServiceRole.entities.AccessKey.update(key.id, {
       uses_count: newUseCount,
       redeemed_by_user_ids: newRedeemed,
       status: newStatus
     });

     // Only update member profile if user exists
     if (user) {
       let profile = null;
       const profiles = await base44.asServiceRole.entities.MemberProfile.filter({ user_id: user.id });
       if (profiles && profiles.length > 0) {
         profile = profiles[0];
       }

       if (profile) {
         await base44.asServiceRole.entities.MemberProfile.update(profile.id, {
           callsign: callsign.trim(),
           rank: key.grants_rank || 'VAGRANT',
           roles: [...(profile.roles || []), ...(key.grants_roles || [])]
         });
       } else {
         // Create profile if it doesn't exist
         await base44.asServiceRole.entities.MemberProfile.create({
           user_id: user.id,
           callsign: callsign.trim(),
           rank: key.grants_rank || 'VAGRANT',
           roles: key.grants_roles || []
         });
       }

       // Log successful redemption
       await base44.asServiceRole.entities.AdminAuditLog.create({
         actor_user_id: user.id,
         action: 'redeem_access_key',
         payload: { code, callsign: callsign.trim(), rank: key.grants_rank, roles: key.grants_roles },
         executed_by: user.id,
         executed_at: new Date().toISOString(),
         step_name: 'access_control',
         status: 'success'
       }).catch(err => console.error('Audit log error:', err));
     }

      clearFailures(userId);

      return Response.json({
        success: true,
        grants_rank: key.grants_rank,
        grants_roles: key.grants_roles,
        message: 'Access code redeemed successfully'
      });
     } catch (error) {
      console.error('redeemAccessKey error:', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
     }
});