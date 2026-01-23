import { RoomServiceClient } from 'npm:livekit-server-sdk@2.0.0';

Deno.serve(async (req) => {
  try {
    const { rooms } = await req.json();

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return Response.json({
        ok: true,
        data: {}
      });
    }

    // Get LiveKit credentials
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      return Response.json({
        ok: false,
        errorCode: 'ENV_NOT_CONFIGURED',
        message: 'LiveKit credentials not configured',
        data: null
      }, { status: 500 });
    }

    // Initialize LiveKit Room Service Client
    const roomClient = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    // Get participant counts for requested rooms
    const roomStatuses: Record<string, { participantCount: number; isActive: boolean }> = {};

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
    console.error('LiveKit room status error:', error);
    return Response.json({
      ok: false,
      errorCode: 'SERVER_ERROR',
      message: error.message,
      data: null
    }, { status: 500 });
  }
});