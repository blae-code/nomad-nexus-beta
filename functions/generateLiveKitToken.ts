/**
 * Generate LiveKit token (LIVE mode)
 * Returns canonical commsResult structure
 */
import { AccessToken } from 'npm:livekit@2.0.0';
import { createCommsResult, createTokenResult } from './_shared/commsResult.ts';
import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceJsonPost } from './_shared/security.ts';

const ROOM_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;
const IDENTITY_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'METHOD_NOT_ALLOWED',
          message: methodCheck.error,
        }),
        { status: methodCheck.status }
      );
    }

    const payload = await readJson(req);
    const { actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });
    if (!actorType) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Unauthorized',
        }),
        { status: 401 }
      );
    }

    const roomName = String(payload?.roomName || '').trim();
    const requestedIdentity = String(payload?.userIdentity || '').trim();
    const actorIdentity = String(memberProfile?.id || adminUser?.id || '').trim();
    const userIdentity =
      actorType === 'member'
        ? actorIdentity
        : (requestedIdentity || actorIdentity);
    const envMode = (Deno.env.get('NODE_ENV') || Deno.env.get('DENO_ENV') || '')?.toLowerCase();
    const isDev = !envMode || envMode === 'development';

    if (!roomName || !userIdentity) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName and userIdentity required'
        }),
        { status: 400 }
      );
    }

    if (!ROOM_PATTERN.test(roomName)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName contains unsupported characters',
        }),
        { status: 400 }
      );
    }

    if (!IDENTITY_PATTERN.test(userIdentity)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'userIdentity contains unsupported characters',
        }),
        { status: 400 }
      );
    }

    if (actorType === 'member' && requestedIdentity && requestedIdentity !== userIdentity) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Members can only mint tokens for their own identity',
        }),
        { status: 403 }
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
        }),
        { status: 503 }
      );
    }

    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!livekitUrl) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'ENV_NOT_CONFIGURED',
          message: 'LiveKit URL not configured'
        }),
        { status: 503 }
      );
    }

    let normalizedUrl = livekitUrl.trim();
    if (!isDev && (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('ws://'))) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INSECURE_LIVEKIT_URL',
          message: 'Insecure LiveKit URL blocked'
        }),
        { status: 400 }
      );
    }

    if (normalizedUrl.startsWith('https://')) {
      normalizedUrl = `wss://${normalizedUrl.slice(8)}`;
    } else if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = `ws://${normalizedUrl.slice(7)}`;
    } else if (!normalizedUrl.startsWith('wss://') && !normalizedUrl.startsWith('ws://')) {
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
        message: error?.message || 'Server error'
      }),
      { status: 500 }
    );
  }
});
