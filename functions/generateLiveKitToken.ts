import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { roomName, userRole } = await req.json();

        if (!roomName) {
            return Response.json({ error: 'Room name is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

        if (!apiKey || !apiSecret) {
             return Response.json({ error: 'Server misconfiguration: Missing LiveKit credentials' }, { status: 500 });
        }

        // Define Permissions based on Role (Redscar Hierarchy)
        // Pioneer, Founder, Voyager, Scout, Affiliate, Shaman -> Publish & Subscribe
        // Vagrant -> Subscribe only (Listen only)
        
        const canPublish = ['Pioneer', 'Founder', 'Voyager', 'Scout', 'Affiliate', 'Shaman'].includes(userRole || user.rank);
        const canSubscribe = true; // Everyone can listen

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: user.full_name || user.rsi_handle || 'Unknown',
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: canPublish,
            canSubscribe: canSubscribe,
            canPublishData: canPublish,
        });

        const token = await at.toJwt();

        return Response.json({ token });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});