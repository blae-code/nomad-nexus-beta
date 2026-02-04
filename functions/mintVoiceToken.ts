import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { SignJWT } from 'npm:jose@5.0.0';

/**
 * Mint LiveKit access tokens for voice net sessions.
 * Called by frontend when user joins a voice net.
 * Returns { url, token, roomName } or error.
 */
Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { netId, userId, callsign, clientId, netType } = payload;

    if (!netId || !userId) {
      return Response.json({ error: 'Missing netId or userId' }, { status: 400 });
    }

    if (actorType === 'member' && memberProfile?.id && userId !== memberProfile.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Enforce policy: Focused nets require Member/Affiliate/Partner membership
    if (netType === 'FOCUSED' && !netId.includes('briefing-temp')) {
      const membership = memberProfile?.membership || (isAdminMember(memberProfile) ? 'PARTNER' : 'CASUAL');
      const allowedMemberships = ['MEMBER', 'AFFILIATE', 'PARTNER'];
      
      if (!allowedMemberships.includes(membership)) {
        return Response.json(
          {
            code: 'ACCESS_DENIED',
            reason: 'Focused nets require Member, Affiliate, or Partner membership.',
          },
          { status: 403 }
        );
      }
    }

    // Check env vars
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');
    const liveKitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const liveKitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
      // Return structured error; client can fall back to mock
      return Response.json(
        {
          error: 'VOICE_NOT_CONFIGURED',
          message: 'LiveKit credentials not configured. Voice comms unavailable.',
        },
        { status: 503 }
      );
    }

    // Generate room name from netId (deterministic)
    const roomName = `nexus-net-${netId}`;

    // Generate JWT token via JOSE
    const token = await new SignJWT({
      sub: userId,
      iss: liveKitApiKey,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      video: {
        canPublish: false,
        canPublishData: true,
        canSubscribe: true,
      },
      audio: {
        canPublish: true,
        canSubscribe: true,
      },
      metadata: JSON.stringify({
        callsign: callsign || memberProfile?.display_callsign || memberProfile?.callsign || adminUser?.full_name || 'Unknown',
        clientId: clientId || '',
        netId: netId,
      }),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(new TextEncoder().encode(liveKitApiSecret));

    return Response.json({
      url: liveKitUrl,
      token,
      roomName,
    });
  } catch (error) {
    console.error('[mintVoiceToken]', error.message);
    return Response.json(
      {
        error: 'VOICE_TOKEN_FAILED',
        message: error.message,
      },
      { status: 500 }
    );
  }
});
