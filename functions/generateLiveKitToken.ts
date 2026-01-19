import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { AccessToken } from "npm:livekit-server-sdk@^2.0.0";

// Helper function for rank checking
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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            console.error('[LiveKit Token] Unauthorized access attempt');
            return Response.json({ 
                error: 'Authentication required',
                tokens: {},
                errors: ['Please log in to access voice communications']
            }, { status: 401 });
        }

        const payload = await req.json();
        const eventId = payload.eventId;
        const netIds = payload.netIds || [];
        
        if (!eventId || !netIds.length) {
            console.error('[LiveKit Token] Missing parameters:', { eventId, netIds });
            return Response.json({ 
                error: 'Invalid request: Missing eventId or netIds',
                tokens: {},
                errors: ['Cannot generate voice tokens without event and network selection']
            }, { status: 400 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        const livekitUrl = Deno.env.get("LIVEKIT_URL");

        if (!apiKey || !apiSecret || !livekitUrl) {
            console.error('[LiveKit Token] Server misconfiguration: Missing credentials');
            return Response.json({ 
                error: 'Voice server unavailable',
                tokens: {},
                errors: ['Voice communication system is temporarily offline. Contact command.']
            }, { status: 500 });
        }

        // Stable participant identity: user ID (always unique)
        const participantIdentity = user.id;
        const participantName = user.callsign || user.rsi_handle || user.full_name || 'Operative';

        console.log(`[LiveKit Token] Request from ${participantName} (${participantIdentity}) for ${netIds.length} net(s)`);

        // Fetch VoiceNets to validate permissions and get room names
        const nets = await Promise.all(
            netIds.map(async (id) => {
                try {
                    return await base44.entities.VoiceNet.get(id);
                } catch (err) {
                    console.error(`[LiveKit Token] Failed to fetch net ${id}:`, err.message);
                    return null;
                }
            })
        );

        const tokens = {};
        const errors = [];
        const warnings = [];

        // Generate a token for each net with strict permission enforcement
        for (let i = 0; i < nets.length; i++) {
            const net = nets[i];
            const netId = netIds[i];
            
            if (!net) {
                errors.push(`Network ${netId} not found`);
                console.warn(`[LiveKit Token] Net ${netId} not found`);
                continue;
            }
            
            // CRITICAL: Enforce RX permissions first
            const canRx = !net.min_rank_to_rx || hasMinRank(user, net.min_rank_to_rx);
            if (!canRx) {
                const msg = `Access denied to ${net.code}: Rank ${user.rank || 'VAGRANT'} insufficient (requires ${net.min_rank_to_rx}+ to listen)`;
                errors.push(msg);
                console.warn(`[LiveKit Token] ${msg} for user ${participantIdentity}`);
                continue; // No RX → no token at all
            }

            // Check TX permissions
            const canTx = !net.min_rank_to_tx || hasMinRank(user, net.min_rank_to_tx);
            if (!canTx) {
                warnings.push(`${net.code}: Receive-only (requires ${net.min_rank_to_tx}+ to transmit)`);
            }
            
            // Use unique room name per event - prevents cross-talk between events
            let roomName = net.livekit_room_name;
            
            // Fallback/Migration: Generate unique room name if not set
            if (!roomName) {
                const eventShort = eventId.slice(0, 8);
                const netShort = net.id.slice(0, 8);
                roomName = `redscar_evt_${eventShort}_net_${netShort}`;
                
                console.log(`[LiveKit Token] Migrating net ${net.code} to room ${roomName}`);
                
                // Store for future use (using service role to bypass user permissions)
                try {
                    await base44.asServiceRole.entities.VoiceNet.update(net.id, { livekit_room_name: roomName });
                } catch (updateErr) {
                    console.error(`[LiveKit Token] Failed to update room name for net ${net.id}:`, updateErr.message);
                }
            }

            // Generate token with enforced permissions
            const at = new AccessToken(apiKey, apiSecret, {
                identity: participantIdentity, // Unique stable identity
                name: participantName, // Human-readable display name
            });

            at.addGrant({ 
                roomJoin: true, // User passed RX check, can join
                room: roomName, // Unique room per event/net
                canPublish: canTx,  // ENFORCED: TX permission
                canSubscribe: true  // RX is granted (already validated above)
            });
            
            const token = await at.toJwt();
            tokens[net.id] = token;
            
            console.log(`[LiveKit Token] Generated token for ${net.code} (${roomName}): RX=true TX=${canTx}`);
        }

        // Consistent response shape
        const response = {
            tokens,
            livekitUrl,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };

        if (Object.keys(tokens).length === 0 && errors.length > 0) {
            console.warn(`[LiveKit Token] No tokens generated for user ${participantIdentity}:`, errors);
            return Response.json(response, { status: 403 });
        }

        console.log(`[LiveKit Token] Success: ${Object.keys(tokens).length} token(s) generated`);
        return Response.json(response);

    } catch (error) {
        console.error('[LiveKit Token] Unexpected error:', error);
        return Response.json({ 
            error: 'Internal server error',
            tokens: {},
            errors: ['Voice communication system error. Please try again or contact support.']
        }, { status: 500 });
    }
});