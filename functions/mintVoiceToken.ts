import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SignJWT } from 'npm:jose@5.0.0';

/**
 * Mint LiveKit access tokens for voice net sessions.
 * Called by frontend when user joins a voice net.
 * Returns { url, token, roomName } or error.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { netId, userId, callsign, clientId } = await req.json();

    if (!netId || !userId) {
      return Response.json({ error: 'Missing netId or userId' }, { status: 400 });
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
        callsign: callsign || 'Unknown',
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