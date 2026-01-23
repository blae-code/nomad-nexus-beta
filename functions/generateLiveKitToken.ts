/**
 * Generate LiveKit token (LIVE mode)
 * Request: { roomName: string, userIdentity: string }
 * Response: { ok: true, data: { token, roomName, identity, url } }
 */
import { AccessToken } from 'npm:livekit@2.0.0';

Deno.serve(async (req) => {
  try {
    const { roomName, userIdentity } = await req.json();

    if (!roomName || !userIdentity) {
      return Response.json({
        ok: false,
        errorCode: 'INVALID_PARAMS',
        message: 'roomName and userIdentity required',
        data: null
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret) {
      return Response.json({
        ok: false,
        errorCode: 'ENV_NOT_CONFIGURED',
        message: 'LiveKit credentials not configured',
        data: null
      }, { status: 500 });
    }

    if (!livekitUrl) {
      return Response.json({
        ok: false,
        errorCode: 'ENV_NOT_CONFIGURED',
        message: 'LIVEKIT_URL not configured',
        data: null
      }, { status: 500 });
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

    return Response.json({
      ok: true,
      data: {
        token,
        roomName,
        identity: userIdentity,
        url: livekitUrl
      }
    });
  } catch (error) {
    console.error('[generateLiveKitToken] Error:', error);
    return Response.json({
      ok: false,
      errorCode: 'SERVER_ERROR',
      message: error.message,
      data: null
    }, { status: 500 });
  }
});