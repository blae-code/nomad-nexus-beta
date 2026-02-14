import { createClient } from 'npm:@base44/sdk@0.8.6';
import { enforceContentLength } from './_shared/security.ts';

const failureMap = new Map<string, { failures: number; lastFailure: number }>();
const FAIL_WINDOW_MS = 5 * 60 * 1000;
const FAIL_LIMIT = 20;
const MAX_FAILURE_RECORDS = 5000;

function normalizeIp(req: Request): string {
  const forwarded = String(req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const realIp = String(req.headers.get('x-real-ip') || '').trim();
  return forwarded || realIp || 'unknown-ip';
}

function fingerprintRequest(req: Request, code = '', callsign = ''): string {
  const ip = normalizeIp(req);
  const ua = String(req.headers.get('user-agent') || '').slice(0, 96);
  const codeToken = String(code || '').trim().toUpperCase().slice(0, 24);
  const callsignToken = String(callsign || '').trim().toLowerCase().slice(0, 40);
  return `${ip}|${ua}|${codeToken}|${callsignToken}`;
}

function trimFailureMap() {
  if (failureMap.size <= MAX_FAILURE_RECORDS) return;
  const entries = Array.from(failureMap.entries())
    .sort((a, b) => Number(a[1]?.lastFailure || 0) - Number(b[1]?.lastFailure || 0));
  const removeCount = Math.max(1, entries.length - MAX_FAILURE_RECORDS);
  for (let i = 0; i < removeCount; i += 1) {
    failureMap.delete(entries[i][0]);
  }
}

function checkRateLimit(key: string): { allowed: boolean; remaining?: number } {
  const rate = failureMap.get(key);
  if (!rate) return { allowed: true };
  if (Date.now() - rate.lastFailure > FAIL_WINDOW_MS) {
    failureMap.delete(key);
    return { allowed: true };
  }
  if (rate.failures >= FAIL_LIMIT) {
    const remaining = Math.ceil((FAIL_WINDOW_MS - (Date.now() - rate.lastFailure)) / 1000);
    return { allowed: false, remaining: Math.max(1, remaining) };
  }
  return { allowed: true };
}

function recordFailure(key: string): void {
  const current = failureMap.get(key) || { failures: 0, lastFailure: Date.now() };
  current.failures += 1;
  current.lastFailure = Date.now();
  failureMap.set(key, current);
  trimFailureMap();
}

function clearFailures(key: string): void {
  failureMap.delete(key);
}

/**
 * Verify Member Session - Validates custom auth without relying on Base44's User table
 * 
 * PUBLIC ENDPOINT - No authentication required
 * 
 * Accepts code + callsign pair and verifies:
 * - AccessKey exists and is valid
 * - MemberProfile exists with matching callsign
 * - Returns the authenticated member's profile
 * 
 * This replaces standard auth.me() for our Member-first authentication flow
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, message: 'Method not allowed' }, { status: 405 });
    }
    const lengthCheck = enforceContentLength(req, 25_000);
    if (!lengthCheck.ok) {
      return Response.json({ success: false, message: lengthCheck.error }, { status: lengthCheck.status });
    }

    const initialFingerprint = fingerprintRequest(req);
    const initialRate = checkRateLimit(initialFingerprint);
    if (!initialRate.allowed) {
      return Response.json({
        success: false,
        message: `Rate limited. Try again in ${initialRate.remaining} seconds`,
      }, { status: 429 });
    }

    // Use service role directly - no request auth needed
    const base44 = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    });

    let payload;
    try {
      const body = await req.text();
      payload = body ? JSON.parse(body) : {};
    } catch (parseErr) {
      recordFailure(initialFingerprint);
      return Response.json({ success: false, message: 'Invalid request format' }, { status: 400 });
    }

    const { code, callsign } = payload;
    const requestFingerprint = fingerprintRequest(req, code, callsign);
    const rate = checkRateLimit(requestFingerprint);
    if (!rate.allowed) {
      return Response.json({
        success: false,
        message: `Rate limited. Try again in ${rate.remaining} seconds`,
      }, { status: 429 });
    }

    // Validate inputs
    if (!code || typeof code !== 'string' || code.trim().length < 4 || code.trim().length > 64) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    if (!callsign || typeof callsign !== 'string' || callsign.trim().length === 0 || callsign.trim().length > 64) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Invalid callsign' }, { status: 400 });
    }

    const trimmedCallsign = callsign.trim();

    // Step 1: Verify AccessKey exists and is active
    let accessKeys = [];
    try {
      accessKeys = await base44.entities.AccessKey.filter({ code });
    } catch (filterErr) {
      console.error('AccessKey filter error:', filterErr?.message);
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
    }

    if (!accessKeys || accessKeys.length === 0) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
    }

    const key = accessKeys[0];

    // Check key status (ACTIVE or REDEEMED are valid for login)
    if (key.status === 'REVOKED') {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'This access code has been revoked' }, { status: 403 });
    }

    if (key.status === 'EXPIRED' || (key.expires_at && new Date(key.expires_at) < new Date())) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'This access code has expired' }, { status: 403 });
    }

    // Step 2: Fetch MemberProfile by callsign (fallback to display_callsign)
    let profiles = [];
    try {
      profiles = await base44.entities.MemberProfile.filter({ callsign: trimmedCallsign });
    } catch (filterErr) {
      console.error('MemberProfile filter error:', filterErr?.message);
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Failed to verify member' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      try {
        profiles = await base44.entities.MemberProfile.filter({ display_callsign: trimmedCallsign });
      } catch (filterErr) {
        console.error('MemberProfile display_callsign filter error:', filterErr?.message);
      }
    }

    if (!profiles || profiles.length === 0) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Member profile not found' }, { status: 404 });
    }

    const memberProfile = profiles[0];

    // Step 3: Verify this profile can use this access key
    // Either: key was redeemed by this profile, OR key is still ACTIVE (first-time login)
    const redeemedIds = key.redeemed_by_member_profile_ids || [];
    const wasRedeemedByProfile = redeemedIds.includes(memberProfile.id);
    const isKeyActive = key.status === 'ACTIVE';
    const canAssociateRedeemed =
      key.status === 'REDEEMED' && redeemedIds.length === 0;
    
    if (!wasRedeemedByProfile && !isKeyActive && !canAssociateRedeemed) {
      recordFailure(requestFingerprint);
      return Response.json({ success: false, message: 'Callsign does not match access code' }, { status: 403 });
    }

    if (!wasRedeemedByProfile && (isKeyActive || canAssociateRedeemed)) {
      try {
        await base44.asServiceRole.entities.AccessKey.update(key.id, {
          redeemed_by_member_profile_ids: [...redeemedIds, memberProfile.id],
        });
      } catch (updateErr) {
        console.error('AccessKey association update failed:', updateErr?.message);
      }
    }

    // Success: Return the verified member profile
    clearFailures(requestFingerprint);
    return Response.json({
      success: true,
      member: {
        id: memberProfile.id,
        callsign: memberProfile.callsign,
        display_callsign: memberProfile.display_callsign,
        rank: memberProfile.rank,
        roles: memberProfile.roles,
        bio: memberProfile.bio,
        onboarding_completed: memberProfile.onboarding_completed,
        accepted_pwa_disclaimer_at: memberProfile.accepted_pwa_disclaimer_at,
        accepted_codes_at: memberProfile.accepted_codes_at,
        ai_consent: memberProfile.ai_consent,
        ai_use_history: memberProfile.ai_use_history,
        created_date: memberProfile.created_date,
        updated_date: memberProfile.updated_date,
      }
    });
  } catch (error) {
    console.error('verifyMemberSession error:', error);
    return Response.json({ success: false, message: 'Session verification failed' }, { status: 500 });
  }
});
