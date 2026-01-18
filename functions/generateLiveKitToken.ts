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
        const eventId = payload.eventId;
        const netIds = payload.netIds || [];
        
        if (!eventId || !netIds.length) {
            return Response.json({ error: 'Missing eventId or netIds' }, { status: 400 });
        }

        const participantName = user.callsign || user.rsi_handle || user.full_name || 'Unknown';

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

        if (!apiKey || !apiSecret) {
            return Response.json({ error: 'Server misconfigured: Missing LiveKit credentials' }, { status: 500 });
        }

        // Fetch VoiceNets to validate permissions and get room names
        const nets = await Promise.all(
            netIds.map(id => base44.entities.VoiceNet.get(id))
        );

        const tokens = {};

        // Generate a token for each net with permission enforcement
        for (const net of nets) {
            if (!net) continue;
            
            // Enforce RX permissions
            const canRx = !net.min_rank_to_rx || hasMinRank(user, net.min_rank_to_rx);
            if (!canRx) {
                continue; // Skip this net - user can't even listen
            }

            // Check TX permissions
            const canTx = !net.min_rank_to_tx || hasMinRank(user, net.min_rank_to_tx);
            
            // Generate stable room name: evt_<eventId_short>__<netCode>
            const eventShort = eventId.slice(0, 8);
            const roomName = `evt_${eventShort}__${net.code}`;
            
            // Store room name on VoiceNet if not set
            if (!net.livekit_room_name) {
                await base44.entities.VoiceNet.update(net.id, { livekit_room_name: roomName });
            }

            const at = new AccessToken(apiKey, apiSecret, {
                identity: user.id, // Stable identity
                name: participantName, // Display name
            });

            at.addGrant({ 
                roomJoin: true, 
                room: roomName, 
                canPublish: canTx,  // Enforce TX permission
                canSubscribe: true  // RX is granted (already validated above)
            });
            
            tokens[net.id] = await at.toJwt();
        }

        // Helper function for rank checking (copied from permissions)
        function hasMinRank(user, minRank) {
            if (!user) return false;
            if (user.role === 'admin') return true;
            if (!user.rank) return false;
            if (!minRank) return true;
            const RANK_VALUES = {
                'Pioneer': 6,
                'Founder': 5,
                'Voyager': 4,
                'Scout': 3,
                'Affiliate': 2,
                'Vagrant': 1
            };
            return (RANK_VALUES[user.rank] || 0) >= (RANK_VALUES[minRank] || 0);
        }

        const livekitUrl = Deno.env.get("LIVEKIT_URL");

        return Response.json({ tokens, livekitUrl });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});