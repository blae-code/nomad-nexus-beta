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

        // Fetch squads
        const squads = await base44.entities.Squad.list();

        const netsCreated = [];
        const eventShort = eventId.slice(0, 8);

        // Helper to generate unique room name
        const genRoomName = (netCode) => `redscar_evt_${eventShort}_${netCode.toLowerCase()}`;

        // 1. Command Net
        const commandNet = await base44.entities.VoiceNet.create({
            event_id: eventId,
            code: "COMMAND",
            label: "Mission Command",
            type: "command",
            priority: 1,
            min_rank_to_tx: "Voyager",
            min_rank_to_rx: "Scout",
            status: "active",
            livekit_room_name: genRoomName("COMMAND")
        });
        netsCreated.push(commandNet);
        
        // 2. Squad Nets (if any)
        for (const squad of squads) {
            const code = squad.name.split(' ')[0].toUpperCase().substring(0, 8);
            const squadNet = await base44.entities.VoiceNet.create({
                event_id: eventId,
                code: code,
                label: `${squad.name} Comms`,
                type: "squad",
                priority: 2,
                linked_squad_id: squad.id,
                is_default_for_squad: true,
                status: "active",
                livekit_room_name: genRoomName(code)
            });
            netsCreated.push(squadNet);
        }
        
        // 3. General Net
        const generalNet = await base44.entities.VoiceNet.create({
            event_id: eventId,
            code: "GENERAL",
            label: "General Chatter",
            type: "general",
            priority: 3,
            status: "active",
            livekit_room_name: genRoomName("GENERAL")
        });
        netsCreated.push(generalNet);

        return Response.json({ 
            message: 'Comms initialized successfully',
            nets: netsCreated,
            count: netsCreated.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});