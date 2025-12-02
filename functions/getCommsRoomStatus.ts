import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { RoomServiceClient } from 'npm:livekit-server-sdk';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Optional: Verify auth if this info is sensitive, but status is usually public/semi-public
        const user = await base44.auth.me();
        if (!user) {
             return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        const liveKitUrl = Deno.env.get("LIVEKIT_SERVER_URL");

        if (!apiKey || !apiSecret || !liveKitUrl) {
            // Fail silently or return empty to avoid breaking UI if secrets aren't set yet
            return Response.json({ rooms: [] });
        }

        const svc = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
        const rooms = await svc.listRooms();

        // Map to simple status object
        const roomStatuses = rooms.map(room => ({
            roomName: room.name,
            isActive: room.numParticipants > 0,
            participantCount: room.numParticipants,
            sid: room.sid
        }));

        return Response.json({ rooms: roomStatuses });
    } catch (error) {
        // Return empty array on error to keep frontend stable
        return Response.json({ rooms: [], error: error.message });
    }
});