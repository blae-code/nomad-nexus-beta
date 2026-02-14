import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { RoomServiceClient } from 'npm:livekit-server-sdk@2.0.0';
import { enforceContentLength, enforceJsonPost } from './_shared/security.ts';

const ROOM_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;
const MAX_ROOMS_PER_REQUEST = 40;

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }
    const lengthCheck = enforceContentLength(req, 20_000);
    if (!lengthCheck.ok) {
      return Response.json({ error: lengthCheck.error }, { status: lengthCheck.status });
    }

    const payload = await readJson(req);
    const { actorType } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomsRaw = Array.isArray(payload?.rooms) ? payload.rooms : [];
    const rooms = roomsRaw
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .slice(0, MAX_ROOMS_PER_REQUEST);

    if (rooms.length === 0) {
      return Response.json({}, { status: 200 }); // Empty result for no rooms
    }
    for (const roomName of rooms) {
      if (!ROOM_PATTERN.test(roomName)) {
        return Response.json({ error: 'Invalid room name' }, { status: 400 });
      }
    }

    // Get LiveKit credentials
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      return Response.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    // Initialize LiveKit Room Service Client
    const roomClient = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    // Get participant counts for requested rooms
    // Returns object mapping roomName -> { participantCount, isActive }
    const roomStatuses = {};

    for (const roomName of rooms) {
      try {
        const participants = await roomClient.listParticipants(roomName);
        roomStatuses[roomName] = {
          participantCount: participants.length,
          isActive: participants.length > 0
        };
      } catch (err) {
        // Room doesn't exist or is empty
        roomStatuses[roomName] = {
          participantCount: 0,
          isActive: false
        };
      }
    }

    return Response.json({
      ok: true,
      data: roomStatuses
    });

  } catch (error) {
    console.error('[getLiveKitRoomStatus] error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'LiveKit room status failed' }, { status: 500 });
  }
});
