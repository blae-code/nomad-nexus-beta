/**
 * Generate LiveKit token (LIVE mode)
 * Returns canonical commsResult structure
 */
import { AccessToken } from 'npm:livekit@2.0.0';
import { createCommsResult, createTokenResult } from './_shared/commsResult.ts';

Deno.serve(async (req) => {
  try {
    const { roomName, userIdentity } = await req.json();
    const envMode = (Deno.env.get('NODE_ENV') ?? Deno.env.get('DENO_ENV') ?? '').toLowerCase();
    const isDev = envMode === 'development';

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

    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!livekitUrl) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'ENV_NOT_CONFIGURED',
          message: 'LiveKit URL not configured'
        })
      );
    }

    let normalizedUrl = livekitUrl.trim();
    if (normalizedUrl.startsWith('https://')) {
      normalizedUrl = `wss://${normalizedUrl.slice(8)}`;
    } else if (normalizedUrl.startsWith('http://')) {
      if (!isDev) {
        return Response.json(
          createCommsResult({
            ok: false,
            errorCode: 'INSECURE_LIVEKIT_URL',
            message: 'Insecure LiveKit URL blocked'
          })
        );
      }
      normalizedUrl = `ws://${normalizedUrl.slice(7)}`;
    } else if (normalizedUrl.startsWith('ws://')) {
      if (!isDev) {
        return Response.json(
          createCommsResult({
            ok: false,
            errorCode: 'INSECURE_LIVEKIT_URL',
            message: 'Insecure LiveKit URL blocked'
          })
        );
      }
    } else if (!normalizedUrl.startsWith('wss://')) {
      normalizedUrl = `${isDev ? 'ws' : 'wss'}://${normalizedUrl}`;
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
      createTokenResult(token, roomName, userIdentity, normalizedUrl)
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
