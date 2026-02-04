import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  const payload = await readJson(req);
  const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
    allowAdmin: true,
    allowMember: true
  });
  const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
  if (!isAdmin) {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { eventId } = payload;

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    // Create player statuses with DISTRESS (urgent)
    const playerStatuses = [
      {
        member_profile_id: 'member-1',
        event_id: eventId,
        status: 'READY',
        role: 'PILOT',
        coordinates: { lat: 35.6895, lng: 139.6917 }
      },
      {
        member_profile_id: 'member-2',
        event_id: eventId,
        status: 'ENGAGED',
        role: 'GUNNER',
        coordinates: { lat: 35.6850, lng: 139.6850 },
        notes: 'Taking fire'
      },
      {
        member_profile_id: 'member-3',
        event_id: eventId,
        status: 'DISTRESS',
        role: 'MEDIC',
        coordinates: { lat: 35.6700, lng: 139.7000 },
        notes: 'Critical condition'
      },
      {
        member_profile_id: 'member-4',
        event_id: eventId,
        status: 'DOWN',
        role: 'SCOUT',
        coordinates: { lat: 35.6500, lng: 139.6500 }
      }
    ];

    for (const ps of playerStatuses) {
      await base44.entities.PlayerStatus.create(ps);
    }

    // Create fleet assets
    const assets = [
      {
        name: 'Command Ship',
        model: 'Anvil Carrack',
        type: 'SHIP',
        status: 'OPERATIONAL',
        current_location: { lat: 35.6800, lng: 139.7100 }
      },
      {
        name: 'Support Vessel',
        model: 'Drake Caterpillar',
        type: 'SHIP',
        status: 'MISSION',
        current_location: { lat: 35.6600, lng: 139.6700 }
      }
    ];

    for (const asset of assets) {
      await base44.entities.FleetAsset.create(asset);
    }

    // Create critical incident
    const incident = await base44.entities.Incident.create({
      title: 'DISTRESS: Personnel Down',
      description: 'Personnel requiring immediate medical attention at sector 7',
      severity: 'CRITICAL',
      status: 'active',
      incident_type: 'medical',
      coordinates: { lat: 35.6700, lng: 139.7000 },
      event_id: eventId,
      priority: 1
    });

    // Create tactical markers (objectives, rally points)
    const markers = [
      {
        event_id: eventId,
        type: 'rally',
        label: 'Rally Point Alpha',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        color: '#10b981'
      },
      {
        event_id: eventId,
        type: 'extraction',
        label: 'LZ Bravo',
        coordinates: { lat: 35.6900, lng: 139.7200 },
        color: '#3b82f6'
      },
      {
        event_id: eventId,
        type: 'hazard',
        label: 'Enemy Territory',
        coordinates: { lat: 35.6400, lng: 139.6300 },
        color: '#dc2626'
      }
    ];

    for (const marker of markers) {
      await base44.entities.MapMarker.create(marker);
    }

    // Create tactical command
    const command = await base44.entities.TacticalCommand.create({
      event_id: eventId,
      message: 'Converge on distress position. Medical priority.',
      coordinates: { lat: 35.6700, lng: 139.7000 },
      issued_by_member_profile_id: memberProfile?.id || null,
      command_type: 'RALLY',
      priority: 'CRITICAL',
      status: 'ISSUED'
    });

    // Create event log entries
    await base44.entities.EventLog.create({
      event_id: eventId,
      type: 'RESCUE',
      severity: 'HIGH',
      actor_member_profile_id: memberProfile?.id || null,
      summary: 'Distress beacon activated - personnel medical emergency',
      details: { incident_id: incident.id }
    });

    await base44.entities.EventLog.create({
      event_id: eventId,
      type: 'SYSTEM',
      severity: 'MEDIUM',
      actor_member_profile_id: memberProfile?.id || null,
      summary: 'Tactical map initialized with seed data',
      details: { markers: 3, personnel: 4, incidents: 1 }
    });

    return Response.json({
      success: true,
      markers: markers.length,
      personnel: playerStatuses.length,
      incidents: 1,
      assets: assets.length,
      commands: 1,
      incident_id: incident.id
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
