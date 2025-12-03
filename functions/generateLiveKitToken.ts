import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { AccessToken } from "npm:livekit-server-sdk@^2.0.0";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Basic auth check
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        // Support both legacy single room and new multi-room
        let rooms = [];
        
        if (payload.roomNames && Array.isArray(payload.roomNames)) {
            rooms = payload.roomNames;
        } else if (payload.roomName) {
            rooms = [payload.roomName];
        } else {
             return Response.json({ error: 'Missing roomNames or roomName' }, { status: 400 });
        }

        const participantName = payload.participantName || user.callsign || user.rsi_handle || user.full_name || 'Unknown';

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

        if (!apiKey || !apiSecret) {
            return Response.json({ error: 'Server misconfigured: Missing LiveKit credentials' }, { status: 500 });
        }

        const tokens = {};

        // Generate a token for each room
        for (const room of rooms) {
            const at = new AccessToken(apiKey, apiSecret, {
                identity: participantName,
                name: participantName,
            });

            at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });
            tokens[room] = await at.toJwt();
        }

        const livekitUrl = Deno.env.get("LIVEKIT_URL");

        return Response.json({ tokens, livekitUrl });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});