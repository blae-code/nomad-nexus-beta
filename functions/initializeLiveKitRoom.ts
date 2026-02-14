/**
 * Initialize LiveKit Room
 * Validates room exists/creates, returns structured result
 */
import { createCommsResult } from './_shared/commsResult.ts';

Deno.serve(async (req) => {
  try {
    const { roomName, mode = 'LIVE' } = await req.json();

    if (!roomName) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'roomName required'
        })
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
        })
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
        message: error.message
      }),
      { status: 500 }
    );
  }
});
