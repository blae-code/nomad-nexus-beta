import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { AccessToken } from 'npm:livekit-server-sdk@2.0.3';

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
             // For development/demo purposes, we'll return a mock token or error if secrets aren't set
             // In production, this should be a strict error
             console.error("LiveKit credentials missing");
             return Response.json({ error: 'Server configuration error: LiveKit credentials missing' }, { status: 500 });
        }

        // Define permissions based on Rank/Role
        // Pioneer, Founder, Voyager, Scout, Affiliate, Shaman -> Publish + Subscribe
        // Vagrant -> Subscribe only
        
        // Check rank for publish permission
        const canPublish = ['Pioneer', 'Founder', 'Voyager', 'Scout', 'Affiliate'].includes(user.rank) || user.is_shaman === true;

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: user.rsi_handle || user.full_name,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: canPublish,
            canSubscribe: true,
            canPublishData: canPublish,
        });

        const token = await at.toJwt();

        return Response.json({ token });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});