import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { AccessToken } from "npm:livekit-server-sdk";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Basic auth check
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { roomName, participantName } = await req.json();

        if (!roomName || !participantName) {
             return Response.json({ error: 'Missing roomName or participantName' }, { status: 400 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        // wsUrl is mainly for the client to connect, but good to have if we do server-side operations later

        if (!apiKey || !apiSecret) {
            return Response.json({ error: 'Server misconfigured: Missing LiveKit credentials' }, { status: 500 });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            name: participantName,
        });

        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

        const token = await at.toJwt();

        return Response.json({ token });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});