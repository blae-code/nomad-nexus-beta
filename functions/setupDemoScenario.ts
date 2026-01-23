import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Setup Demo Scenario: Creates featured event, distress incident, rescue, and map markers
 * Called when demo mode is enabled in Admin Cockpit
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const in30mins = new Date(now.getTime() + 30 * 60000);

    // 1. Create or fetch featured FOCUSED event
    let event = await base44.asServiceRole.entities.Event.filter(
      { event_type: 'focused', phase: { $ne: 'ARCHIVED' } },
      '-updated_date',
      1
    ).then(events => events[0]);

    if (!event) {
      event = await base44.asServiceRole.entities.Event.create({
        title: 'RESCUE OPERATION - Demo Scenario',
        description: 'Distressed pilot in Stanton sector. Coordinate rescue via comms and tactical map.',
        event_type: 'focused',
        priority: 'CRITICAL',
        status: 'active',
        phase: 'ACTIVE',
        start_time: now.toISOString(),
        end_time: in30mins.toISOString(),
        location: 'Stanton Sector 7-G',
        host_id: user.id,
        assigned_user_ids: [user.id],
        phase_transitioned_at: now.toISOString()
      });
    }

    // 2. Create distress incident
    const incident = await base44.asServiceRole.entities.Incident.create({
      title: 'Distress Signal - Pilot Down',
      description: 'Pilot ejected after hull breach. Location: Stanton 7-G. Awaiting rescue team.',
      severity: 'CRITICAL',
      status: 'active',
      incident_type: 'rescue',
      affected_area: 'Stanton Sector 7-G',
      coordinates: { lat: 15.5, lng: -42.3 },
      event_id: event.id,
      reported_by: user.id,
      priority: 1,
      tags: ['rescue', 'demo', 'critical']
    });

    // 3. Create command voice net for the event
    const net = await base44.asServiceRole.entities.VoiceNet.create({
      event_id: event.id,
      code: 'COMMAND',
      label: 'Command Net - Demo',
      type: 'command',
      discipline: 'focused',
      priority: 1,
      status: 'active',
      livekit_room_name: `demo-command-${event.id.slice(0, 8)}`
    });

    // 4. Create rescue request linked to comms room
    const rescueRequest = await base44.asServiceRole.entities.Incident.create({
      title: 'Rescue Request - MR-7',
      description: 'Medical rescue in progress. 2-person team deploying. ETA 5 mins.',
      severity: 'HIGH',
      status: 'responding',
      incident_type: 'rescue',
      affected_area: 'Stanton 7-G - Debris Field',
      coordinates: { lat: 15.5, lng: -42.3 },
      event_id: event.id,
      assigned_net_id: net.id,
      reported_by: user.id,
      priority: 1,
      tags: ['rescue', 'medical', 'demo']
    });

    // 5. Create tactical map markers: hot zone + rally point
    const hotZone = await base44.asServiceRole.entities.MapMarker.create({
      event_id: event.id,
      type: 'distress',
      label: 'Hot Zone - Distress Location',
      coordinates: { lat: 15.5, lng: -42.3 },
      created_by: user.id
    });

    const rallyPoint = await base44.asServiceRole.entities.MapMarker.create({
      event_id: event.id,
      type: 'rally',
      label: 'Rally Point Bravo',
      coordinates: { lat: 16.1, lng: -41.9 },
      created_by: user.id
    });

    // 6. Create command history for ping breadcrumb
    const command = await base44.asServiceRole.entities.TacticalCommand.create({
      event_id: event.id,
      message: 'RESCUE TEAM: Proceed to Rally Point Bravo, then advance to distress coordinates. Maintain OPSEC.',
      coordinates: { lat: 16.1, lng: -41.9 },
      issued_by: user.id,
      priority: 'CRITICAL',
      command_type: 'RALLY',
      status: 'ISSUED'
    });

    return Response.json({
      success: true,
      scenario: {
        eventId: event.id,
        eventTitle: event.title,
        netId: net.id,
        netCode: net.code,
        incidentId: incident.id,
        rescueId: rescueRequest.id,
        hotZoneId: hotZone.id,
        rallyPointId: rallyPoint.id,
        commandId: command.id,
        coordinates: { lat: 15.5, lng: -42.3 },
        rallyCoordinates: { lat: 16.1, lng: -41.9 }
      }
    });
  } catch (error) {
    console.error('Demo scenario setup failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});