import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { RoomServiceClient } from 'npm:livekit-server-sdk@2.0.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Optional: Check if user is authenticated
        const user = await base44.auth.me();
        
        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        const livekitUrl = Deno.env.get("LIVEKIT_SERVER_URL");

        if (!apiKey || !apiSecret || !livekitUrl) {
             return Response.json({ error: 'Server configuration error: LiveKit credentials missing' }, { status: 500 });
        }

        const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
        
        // Get all voice nets from DB
        const voiceNets = await base44.entities.VoiceNet.list(); // List all to match against
        
        // List active rooms from LiveKit
        const activeRooms = await svc.listRooms();

        const statusList = voiceNets.map(net => {
            const roomName = net.livekit_room_name || net.code;
            const activeRoom = activeRooms.find(r => r.name === roomName);
            
            return {
                roomName: roomName,
                isActive: !!activeRoom && activeRoom.numParticipants > 0,
                participantCount: activeRoom ? activeRoom.numParticipants : 0,
                netId: net.id,
                netCode: net.code
            };
        });

        return Response.json({ statuses: statusList });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});