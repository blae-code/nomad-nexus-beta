/**
 * Initialize LiveKit Room
 * Validates room exists/creates, returns structured result
 */
import { createCommsResult } from './_shared/commsResult.ts';
import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { enforceJsonPost } from './_shared/security.ts';

const ROOM_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;

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
    const { actorType } = await getAuthContext(req, payload, {
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
    const mode = String(payload?.mode || 'LIVE').trim().toUpperCase();

    if (!roomName) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName required'
        }),
        { status: 400 }
      );
    }

    if (!ROOM_PATTERN.test(roomName)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName contains unsupported characters'
        }),
        { status: 400 }
      );
    }

    if (mode === 'SIM') {
      // SIM mode doesn't need real initialization
      return Response.json(
        createCommsResult({
          ok: true,
          data: { roomName, mode: 'SIM', participants: [] },
          message: 'Room initialized in SIM mode'
        })
      );
    }

    // LIVE mode: validate LiveKit API is available
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !liveKitUrl) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'ENV_NOT_CONFIGURED',
          message: 'LiveKit not configured; falling back to SIM'
        }),
        { status: 503 }
      );
    }

    return Response.json(
      createCommsResult({
        ok: true,
        data: { roomName, mode: 'LIVE', ready: true },
        message: 'Room ready for LiveKit connection'
      })
    );
  } catch (error) {
    console.error('[initializeLiveKitRoom] Error:', error);
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
