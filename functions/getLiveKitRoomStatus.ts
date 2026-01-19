import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RoomServiceClient } from 'npm:livekit-server-sdk@2.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    // Get LiveKit credentials
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      return Response.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    // Fetch all voice nets for this event
    const nets = await base44.entities.VoiceNet.filter({ event_id: eventId });

    // Initialize LiveKit Room Service Client
    const roomClient = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    // Get participant counts for all rooms
    const roomStatuses = {};

    for (const net of nets) {
      const roomName = `event-${eventId}-net-${net.code}`;
      
      try {
        const participants = await roomClient.listParticipants(roomName);
        roomStatuses[net.id] = {
          netId: net.id,
          netCode: net.code,
          roomName,
          participantCount: participants.length,
          participants: participants.map(p => ({
            identity: p.identity,
            isSpeaking: p.isSpeaker,
            joinedAt: p.joinedAt
          }))
        };
      } catch (err) {
        // Room doesn't exist or is empty
        roomStatuses[net.id] = {
          netId: net.id,
          netCode: net.code,
          roomName,
          participantCount: 0,
          participants: []
        };
      }
    }

    return Response.json({ 
      eventId,
      roomStatuses,
      totalParticipants: Object.values(roomStatuses).reduce((sum, r) => sum + r.participantCount, 0)
    });

  } catch (error) {
    console.error('LiveKit room status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});