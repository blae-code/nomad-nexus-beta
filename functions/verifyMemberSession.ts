import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verify Member Session - Validates custom auth without relying on Base44's User table
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
    const base44 = createClientFromRequest(req);

    let payload;
    try {
      const body = await req.text();
      payload = body ? JSON.parse(body) : {};
    } catch (parseErr) {
      return Response.json({ success: false, message: 'Invalid request format' }, { status: 400 });
    }

    const { code, callsign } = payload;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return Response.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    if (!callsign || typeof callsign !== 'string' || callsign.trim().length === 0) {
      return Response.json({ success: false, message: 'Invalid callsign' }, { status: 400 });
    }

    const trimmedCallsign = callsign.trim();

    // Step 1: Verify AccessKey exists and is active
    let accessKeys = [];
    try {
      accessKeys = await base44.asServiceRole.entities.AccessKey.filter({ code });
    } catch (filterErr) {
      console.error('AccessKey filter error:', filterErr?.message);
      return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
    }

    if (!accessKeys || accessKeys.length === 0) {
      return Response.json({ success: false, message: 'Invalid access code' }, { status: 404 });
    }

    const key = accessKeys[0];

    // Check key status
    if (key.status === 'REVOKED') {
      return Response.json({ success: false, message: 'This access code has been revoked' }, { status: 403 });
    }

    if (key.status === 'EXPIRED' || (key.expires_at && new Date(key.expires_at) < new Date())) {
      return Response.json({ success: false, message: 'This access code has expired' }, { status: 403 });
    }

    // Step 2: Fetch MemberProfile by callsign
    let profiles = [];
    try {
      profiles = await base44.asServiceRole.entities.MemberProfile.filter({ callsign: trimmedCallsign });
    } catch (filterErr) {
      console.error('MemberProfile filter error:', filterErr?.message);
      return Response.json({ success: false, message: 'Failed to verify member' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return Response.json({ success: false, message: 'Member profile not found' }, { status: 404 });
    }

    const memberProfile = profiles[0];

    // Step 3: Verify this profile was created by this access key
    const wasRedeemedByProfile = key.redeemed_by_member_profile_ids?.includes(memberProfile.id);
    if (!wasRedeemedByProfile) {
      return Response.json({ success: false, message: 'Callsign does not match access code' }, { status: 403 });
    }

    // Success: Return the verified member profile
    return Response.json({
      success: true,
      member: {
        id: memberProfile.id,
        callsign: memberProfile.callsign,
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
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
});