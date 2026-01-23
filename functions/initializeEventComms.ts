import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId } = await req.json();

        if (!eventId) {
            return Response.json({ error: 'Missing eventId' }, { status: 400 });
        }

        // Check for existing nets - idempotency
        const existing = await base44.entities.VoiceNet.filter({ event_id: eventId });
        if (existing.length > 0) {
            return Response.json({ 
                message: 'Comms already initialized', 
                nets: existing,
                skipped: true 
            });
        }

        // Fetch squads with timeout protection
        let squads = [];
        try {
            squads = await Promise.race([
                base44.entities.Squad.filter({}, '-created_date', 20),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Squad fetch timeout')), 3000))
            ]);
        } catch (error) {
            console.warn('Squad fetch timeout, proceeding with defaults');
            squads = [];
        }

        const eventShort = eventId.slice(0, 8);

        // Helper to generate unique room name
        const genRoomName = (netCode) => `redscar_evt_${eventShort}_${netCode.toLowerCase()}`;

        // Create all nets in parallel for speed
        const netPromises = [
            // 1. Command Net
            base44.asServiceRole.entities.VoiceNet.create({
                event_id: eventId,
                code: "COMMAND",
                label: "Mission Command",
                type: "command",
                priority: 1,
                min_rank_to_tx: "Voyager",
                min_rank_to_rx: "Scout",
                status: "active",
                livekit_room_name: genRoomName("COMMAND")
            }),
            // 2. General Net
            base44.asServiceRole.entities.VoiceNet.create({
                event_id: eventId,
                code: "GENERAL",
                label: "General Chatter",
                type: "general",
                priority: 3,
                status: "active",
                livekit_room_name: genRoomName("GENERAL")
            })
        ];

        // Add squad nets (limit to first 3)
        squads.slice(0, 3).forEach(squad => {
            const code = squad.name.split(' ')[0].toUpperCase().substring(0, 8);
            netPromises.push(
                base44.asServiceRole.entities.VoiceNet.create({
                    event_id: eventId,
                    code: code,
                    label: `${squad.name} Comms`,
                    type: "squad",
                    priority: 2,
                    linked_squad_id: squad.id,
                    is_default_for_squad: true,
                    status: "active",
                    livekit_room_name: genRoomName(code)
                })
            );
        });

        const netsCreated = await Promise.all(netPromises);

        // 4. Log comms provisioning to EventLog
        await base44.asServiceRole.entities.EventLog.create({
            event_id: eventId,
            type: 'SYSTEM',
            severity: 'LOW',
            actor_user_id: user.id,
            summary: `Communications provisioning complete: ${netsCreated.length} nets initialized`,
            details: {
                nets_created: netsCreated.map(n => ({ code: n.code, label: n.label, room: n.livekit_room_name })),
                total_count: netsCreated.length
            }
        });

        return Response.json({ 
            message: 'Comms initialized successfully',
            nets: netsCreated,
            count: netsCreated.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});