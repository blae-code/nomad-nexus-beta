/**
 * Generate LiveKit token (LIVE mode)
 * Returns canonical commsResult structure
 */
import { AccessToken } from 'npm:livekit@2.0.0';
import { createCommsResult, createTokenResult } from './_shared/commsResult.ts';

Deno.serve(async (req) => {
  try {
    const { roomName, userIdentity } = await req.json();

    if (!roomName || !userIdentity) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName and userIdentity required'
        })
      );
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'ENV_NOT_CONFIGURED',
          message: 'LiveKit credentials not configured'
        })
      );
    }

    // Create token
    const at = new AccessToken(apiKey, apiSecret);
    at.identity = userIdentity;
    at.name = userIdentity;
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true
    });

    const token = at.toJwt();

    return Response.json(
      createTokenResult(token, roomName, userIdentity)
    );
  } catch (error) {
    console.error('[generateLiveKitToken] Error:', error);
    return Response.json(
      createCommsResult({
        ok: false,
        errorCode: 'SERVER_ERROR',
        message: error.message
      }),
      { status: 500 }
    );
  }
});