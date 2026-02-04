import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    
    if (!actorType || !memberProfile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Voyager+ can provision comms plans
    const allowedRanks = ['VOYAGER', 'FOUNDER', 'PIONEER'];
    const rank = (memberProfile.rank || '').toUpperCase();
    if (!isAdminMember(memberProfile) && !allowedRanks.includes(rank)) {
      return Response.json({ error: 'Insufficient permissions - Voyager+ required' }, { status: 403 });
    }

    const { eventId } = payload;

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    // Fetch event
    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch all units (Fleet, Wing, Squad)
    const units = await base44.entities.Squad.list();
    
    // Separate by hierarchy
    const fleets = units.filter(u => u.hierarchy_level === 'fleet');
    const wings = units.filter(u => u.hierarchy_level === 'wing');
    const squads = units.filter(u => u.hierarchy_level === 'squad' || !u.hierarchy_level);

    // Check if nets already exist for this event
    const existingNets = await base44.entities.VoiceNet.filter({ event_id: eventId });
    if (existingNets.length > 0) {
      return Response.json({ 
        error: 'Comms plan already exists',
        suggestion: 'Delete existing nets first or use manual creation',
        existingCount: existingNets.length
      }, { status: 409 });
    }

    const netsToCreate = [];
    const eventPrefix = eventId.slice(0, 8).toUpperCase();

    // Generate unique room name
    const makeRoomName = (code) => `evt-${eventId}-${code}`.toLowerCase();

    // 1. Fleet Command Nets (Priority 1)
    fleets.forEach((fleet, idx) => {
      netsToCreate.push({
        event_id: eventId,
        code: `FLT-CMD-${idx + 1}`,
        label: `${fleet.name} Command`,
        type: 'command',
        discipline: 'focused',
        stage_mode: false,
        linked_squad_id: fleet.id,
        priority: 1,
        min_rank_to_tx: 'Voyager',
        min_rank_to_rx: 'Scout',
        livekit_room_name: makeRoomName(`flt-cmd-${idx + 1}`),
        status: 'active'
      });
    });

    // 2. Wing Nets (Priority 2)
    wings.forEach((wing, idx) => {
      netsToCreate.push({
        event_id: eventId,
        code: `WING-${String.fromCharCode(65 + idx)}`, // WING-A, WING-B, etc.
        label: `${wing.name}`,
        type: 'squad',
        discipline: 'focused',
        stage_mode: false,
        linked_squad_id: wing.id,
        priority: 2,
        min_rank_to_tx: 'Scout',
        min_rank_to_rx: 'Vagrant',
        livekit_room_name: makeRoomName(`wing-${String.fromCharCode(97 + idx)}`),
        status: 'active'
      });
    });

    // 3. Squad Nets (Priority 2)
    squads.forEach((squad, idx) => {
      netsToCreate.push({
        event_id: eventId,
        code: squad.name.substring(0, 8).toUpperCase().replace(/\s+/g, '-'),
        label: squad.name,
        type: 'squad',
        discipline: 'focused',
        stage_mode: false,
        linked_squad_id: squad.id,
        priority: 2,
        min_rank_to_tx: 'Vagrant',
        min_rank_to_rx: 'Vagrant',
        livekit_room_name: makeRoomName(`sq-${idx + 1}`),
        status: 'active'
      });
    });

    // 4. General Net (Priority 3 - Casual)
    netsToCreate.push({
      event_id: eventId,
      code: 'GENERAL',
      label: 'General Comms',
      type: 'general',
      discipline: 'casual',
      stage_mode: false,
      priority: 3,
      min_rank_to_tx: 'Vagrant',
      min_rank_to_rx: 'Vagrant',
      livekit_room_name: makeRoomName('general'),
      status: 'active'
    });

    // 5. Emergency Net (Priority 1 - Focused with Stage Mode)
    netsToCreate.push({
      event_id: eventId,
      code: 'EMERGENCY',
      label: 'Emergency & Rescue',
      type: 'support',
      discipline: 'focused',
      stage_mode: true, // Only commanders can grant TX
      priority: 1,
      min_rank_to_tx: 'Voyager', // Base requirement before stage grants
      min_rank_to_rx: 'Vagrant',
      livekit_room_name: makeRoomName('emergency'),
      status: 'active'
    });

    // Create all nets
    const createdNets = await Promise.all(
      netsToCreate.map(net => base44.entities.VoiceNet.create(net))
    );

    return Response.json({
      success: true,
      message: `Provisioned ${createdNets.length} voice nets for event`,
      nets: createdNets.map(n => ({
        id: n.id,
        code: n.code,
        label: n.label,
        type: n.type,
        room: n.livekit_room_name
      })),
      summary: {
        fleet_command: fleets.length,
        wings: wings.length,
        squads: squads.length,
        support: 2, // General + Emergency
        total: createdNets.length
      }
    });

  } catch (error) {
    console.error('[PROVISION] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to provision comms plan',
      details: error.toString()
    }, { status: 500 });
  }
});
