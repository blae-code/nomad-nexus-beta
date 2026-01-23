import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create test event
    const event = await base44.entities.Event.create({
      title: 'TACTICAL EXERCISE ALPHA',
      description: 'Live tactical map training scenario',
      event_type: 'focused',
      priority: 'HIGH',
      phase: 'ACTIVE',
      status: 'active',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      location: 'Combat Zone - Sector 7',
      host_id: user.id,
      assigned_user_ids: [user.id]
    });

    console.log('Created event:', event.id);

    // Create rally points / objectives
    const rallyPoint1 = await base44.entities.MapMarker.create({
      event_id: event.id,
      type: 'rally',
      label: 'RALLY ALPHA',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      description: 'Primary rally point',
      color: '#10b981'
    });

    const rallyPoint2 = await base44.entities.MapMarker.create({
      event_id: event.id,
      type: 'waypoint',
      label: 'WAYPOINT BRAVO',
      coordinates: { lat: 40.7200, lng: -74.0100 },
      description: 'Secondary waypoint',
      color: '#3b82f6'
    });

    const objective = await base44.entities.MapMarker.create({
      event_id: event.id,
      type: 'objective',
      label: 'OBJECTIVE CHARLIE',
      coordinates: { lat: 40.7300, lng: -74.0150 },
      description: 'Primary objective target',
      color: '#f59e0b'
    });

    const lz = await base44.entities.MapMarker.create({
      event_id: event.id,
      type: 'extraction',
      label: 'LZ DELTA',
      coordinates: { lat: 40.7100, lng: -73.9900 },
      description: 'Landing zone for extraction',
      color: '#8b5cf6'
    });

    console.log('Created markers:', { rallyPoint1: rallyPoint1.id, rallyPoint2: rallyPoint2.id, objective: objective.id, lz: lz.id });

    // Create fleet assets with coordinates
    const asset1 = await base44.entities.FleetAsset.create({
      name: 'NOMAD-01',
      model: 'Carrack',
      type: 'SHIP',
      status: 'OPERATIONAL',
      location: 'Airspace',
      current_location: { lat: 40.7150, lng: -74.0080 },
      assigned_user_id: user.id,
      maintenance_notes: 'Systems nominal'
    });

    const asset2 = await base44.entities.FleetAsset.create({
      name: 'NOMAD-02',
      model: 'Cutlass',
      type: 'SHIP',
      status: 'OPERATIONAL',
      location: 'Airspace',
      current_location: { lat: 40.7250, lng: -74.0120 },
      assigned_user_id: user.id,
      maintenance_notes: 'Weapons hot'
    });

    console.log('Created fleet assets:', { asset1: asset1.id, asset2: asset2.id });

    // Create personnel status - READY team
    const personnel1 = await base44.entities.PlayerStatus.create({
      user_id: user.id,
      event_id: event.id,
      status: 'READY',
      role: 'PILOT',
      coordinates: { lat: 40.7160, lng: -74.0090 },
      current_location: 'NOMAD-01 Cockpit',
      notes: 'Standing by for deployment'
    });

    console.log('Created personnel status:', personnel1.id);

    // Create DISTRESS situation - URGENT
    const distressPersonnel = await base44.entities.PlayerStatus.create({
      user_id: 'distress-operative-001',
      event_id: event.id,
      status: 'DISTRESS',
      role: 'MARINE',
      coordinates: { lat: 40.7350, lng: -74.0200 },
      current_location: 'Ground Level - Sector 7B',
      notes: 'UNDER FIRE - REQUESTING IMMEDIATE SUPPORT'
    });

    console.log('Created DISTRESS personnel:', distressPersonnel.id);

    // Create CRITICAL incident at distress location
    const incident = await base44.entities.Incident.create({
      title: 'COMBAT ENGAGEMENT - SECTOR 7B',
      description: 'Ground team under heavy fire. Requesting air support and medical evac.',
      severity: 'CRITICAL',
      status: 'active',
      incident_type: 'combat',
      affected_area: 'Sector 7B - Industrial District',
      coordinates: { lat: 40.7350, lng: -74.0200 },
      event_id: event.id,
      reported_by: user.id,
      priority: 1,
      tags: ['URGENT', 'COMBAT', 'MEDIVAC_REQUIRED']
    });

    console.log('Created CRITICAL incident:', incident.id);

    // Create a HIGH severity incident
    const incidentHigh = await base44.entities.Incident.create({
      title: 'STRUCTURAL COLLAPSE - BUILDING 12',
      description: 'East wing collapse imminent. Civilians trapped on upper levels.',
      severity: 'HIGH',
      status: 'responding',
      incident_type: 'rescue',
      affected_area: 'Building 12 - East Wing',
      coordinates: { lat: 40.7280, lng: -74.0130 },
      event_id: event.id,
      reported_by: user.id,
      priority: 2,
      tags: ['RESCUE', 'STRUCTURAL']
    });

    console.log('Created HIGH severity incident:', incidentHigh.id);

    // Create initial tactical command
    const command = await base44.entities.TacticalCommand.create({
      event_id: event.id,
      message: 'All units converge on rally point ALPHA. Maintain radio discipline on NET COMMAND.',
      issued_by: user.id,
      coordinates: { lat: 40.7128, lng: -74.0060 },
      command_type: 'RALLY',
      priority: 'HIGH',
      status: 'ISSUED'
    });

    console.log('Created tactical command:', command.id);

    // Create event logs for audit trail
    await base44.entities.EventLog.create({
      event_id: event.id,
      type: 'SYSTEM',
      severity: 'HIGH',
      actor_user_id: user.id,
      summary: 'Exercise ALPHA initiated - Combat scenario active',
      details: {
        scenario_type: 'tactical_exercise',
        personnel_count: 2,
        asset_count: 2,
        incident_count: 2
      }
    });

    await base44.entities.EventLog.create({
      event_id: event.id,
      type: 'RESCUE',
      severity: 'HIGH',
      actor_user_id: user.id,
      summary: 'DISTRESS call received - Combat engagement in Sector 7B',
      details: {
        personnel_id: distressPersonnel.id,
        coordinates: { lat: 40.7350, lng: -74.0200 },
        recommended_action: 'Dispatch air support immediately'
      }
    });

    return Response.json({
      success: true,
      event_id: event.id,
      data: {
        event: event.id,
        markers: { rallyPoint1: rallyPoint1.id, rallyPoint2: rallyPoint2.id, objective: objective.id, lz: lz.id },
        assets: { asset1: asset1.id, asset2: asset2.id },
        personnel: { ready: personnel1.id, distress: distressPersonnel.id },
        incidents: { critical: incident.id, high: incidentHigh.id },
        command: command.id
      }
    });
  } catch (error) {
    console.error('Seed failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});