import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RoomServiceClient } from 'npm:livekit-server-sdk@2.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rooms } = await req.json();

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return Response.json({}, { status: 200 }); // Empty result for no rooms
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

    return Response.json(roomStatuses);

  } catch (error) {
    console.error('LiveKit room status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});