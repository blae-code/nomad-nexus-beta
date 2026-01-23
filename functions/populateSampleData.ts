import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Deterministic RNG for consistency with seed
function seededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

async function seedWeekOfActivity(base44, userId, seed = 42, scale = 1.0) {
  const rng = seededRandom(seed);
  const results = { created: {}, errors: [] };
  const refs = { squads: [], events: [], channels: [], voiceNets: [], assets: [] };

  // === SQUADS ===
  try {
    const squads = await base44.asServiceRole.entities.Squad.bulkCreate([
      { name: 'Redscar Command', description: 'Leadership & strategy', leader_id: userId, status: 'active' },
      { name: 'Flight Alpha', description: 'Combat ops', leader_id: userId, status: 'active' },
      { name: 'Support Squadron', description: 'Logistics & rescue', leader_id: userId, status: 'active' }
    ]);
    refs.squads = squads;
    results.created.squads = squads.length;
  } catch (error) {
    results.errors.push(`Squads: ${error.message}`);
  }

  // === VOICE NETS (with live room names) ===
  try {
    const voiceNets = await base44.asServiceRole.entities.VoiceNet.bulkCreate([
      {
        code: 'COMMAND',
        label: 'Command Channel',
        type: 'command',
        discipline: 'focused',
        priority: 1,
        livekit_room_name: 'redscar_global_command'
      },
      {
        code: 'ALPHA',
        label: 'Flight Alpha',
        type: 'squad',
        discipline: 'casual',
        priority: 2,
        linked_squad_id: refs.squads[1]?.id,
        livekit_room_name: 'redscar_squad_alpha'
      },
      {
        code: 'RESCUE',
        label: 'Rescue Operations',
        type: 'support',
        discipline: 'focused',
        priority: 1,
        livekit_room_name: 'redscar_global_rescue'
      },
      {
        code: 'LOGISTICS',
        label: 'Logistics Channel',
        type: 'support',
        discipline: 'casual',
        priority: 3,
        livekit_room_name: 'redscar_global_logi'
      }
    ]);
    refs.voiceNets = voiceNets;
    results.created.voiceNets = voiceNets.length;
  } catch (error) {
    results.errors.push(`VoiceNets: ${error.message}`);
  }

  // === FLEET ASSETS ===
  try {
    const ships = [
      { name: 'Redscar-01', model: 'Anvil Carrack', type: 'SHIP', status: 'OPERATIONAL', location: 'MicroTech Orbit' },
      { name: 'Redscar-02', model: 'Drake Cutlass', type: 'SHIP', status: 'OPERATIONAL', location: 'Crusader' },
      { name: 'Redscar-03', model: 'RSI Constellation', type: 'SHIP', status: 'MAINTENANCE', location: 'Port Olisar' },
      { name: 'Redscar-04', model: 'Aegis Avenger', type: 'SHIP', status: 'OPERATIONAL', location: 'Stanton' },
      { name: 'Redscar-05', model: 'MISC Prospector', type: 'SHIP', status: 'OPERATIONAL', location: 'Yela' },
      { name: 'Redscar-Rover-01', model: 'Greycat PTV', type: 'VEHICLE', status: 'OPERATIONAL', location: 'Daymar' }
    ];
    const assets = await base44.asServiceRole.entities.FleetAsset.bulkCreate(ships);
    refs.assets = assets;
    results.created.fleetAssets = assets.length;
  } catch (error) {
    results.errors.push(`FleetAssets: ${error.message}`);
  }

  // === EVENTS (full week: past, present, future) ===
  try {
    const now = new Date();
    const events = [];
    
    for (let i = -2; i < 5; i++) {
      const eventDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const eventTypes = ['focused', 'casual'];
      const eventType = eventTypes[Math.floor(rng() * eventTypes.length)];
      const priorities = ['CRITICAL', 'HIGH', 'STANDARD', 'LOW'];
      const priority = priorities[Math.floor(rng() * priorities.length)];
      
      let phase = 'PLANNING';
      let status = 'scheduled';
      if (i < 0) {
        phase = Math.random() > 0.3 ? 'ARCHIVED' : 'DEBRIEF';
        status = 'completed';
      } else if (i === 0) {
        phase = 'ACTIVE';
        status = 'active';
      }
      
      events.push({
        title: `Operation ${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: `${eventType === 'focused' ? 'Tactical' : 'Casual'} operations`,
        event_type: eventType,
        priority,
        phase,
        status,
        start_time: eventDate.toISOString(),
        end_time: new Date(eventDate.getTime() + (1 + Math.floor(rng() * 4)) * 60 * 60 * 1000).toISOString(),
        location: ['Arccorp Hub', 'Crusader', 'Delamar', 'MicroTech'][Math.floor(rng() * 4)],
        host_id: userId,
        tags: ['operation', eventType]
      });
    }
    
    const createdEvents = await base44.asServiceRole.entities.Event.bulkCreate(events);
    refs.events = createdEvents;
    results.created.events = createdEvents.length;
  } catch (error) {
    results.errors.push(`Events: ${error.message}`);
  }

  // === CHANNELS ===
  try {
    const channels = await base44.asServiceRole.entities.Channel.bulkCreate([
      { name: 'general', type: 'public', description: 'General discussion' },
      { name: 'operations', type: 'public', description: 'Operational updates' },
      { name: 'logistics', type: 'private', description: 'Supply management' },
      { name: 'command', type: 'private', description: 'Leadership comms' },
      { name: 'rescue', type: 'public', description: 'Rescue coordination' }
    ]);
    refs.channels = channels;
    results.created.channels = channels.length;
  } catch (error) {
    results.errors.push(`Channels: ${error.message}`);
  }

  // === MESSAGES (distributed across channels & events) ===
  try {
    const messages = [];
    const msgTemplates = [
      'All personnel report status',
      'Commencing operation, all nets stand by',
      'Mission success, returning to base',
      'Navigation lock acquired',
      'Performing diagnostics on port systems',
      'Requesting resupply at Stanton',
      'Contact lost at last known position',
      'Standby for tactical briefing',
      'Extraction point confirmed'
    ];
    
    for (const channel of refs.channels) {
      for (let j = 0; j < Math.ceil(rng() * 5 * scale); j++) {
        messages.push({
          channel_id: channel.id,
          user_id: userId,
          content: msgTemplates[Math.floor(rng() * msgTemplates.length)],
          read_by: [userId]
        });
      }
    }
    
    const created = await base44.asServiceRole.entities.Message.bulkCreate(messages);
    results.created.messages = created.length;
  } catch (error) {
    results.errors.push(`Messages: ${error.message}`);
  }

  // === EVENT LOGS (tactical activity) ===
  try {
    const logs = [];
    const logTypes = ['STATUS', 'COMMS', 'RESCUE', 'SYSTEM', 'NOTE'];
    
    for (const event of refs.events) {
      for (let i = 0; i < Math.ceil(rng() * 3 * scale); i++) {
        const timestamp = new Date(new Date(event.start_time).getTime() + i * 15 * 60 * 1000);
        logs.push({
          event_id: event.id,
          timestamp: timestamp.toISOString(),
          type: logTypes[Math.floor(rng() * logTypes.length)],
          severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(rng() * 3)],
          summary: `Activity log entry ${i + 1}`,
          details: { net_code: refs.voiceNets[Math.floor(rng() * refs.voiceNets.length)]?.code }
        });
      }
    }
    
    const created = await base44.asServiceRole.entities.EventLog.bulkCreate(logs);
    results.created.eventLogs = created.length;
  } catch (error) {
    results.errors.push(`EventLogs: ${error.message}`);
  }

  // === MAP MARKERS (event objectives) ===
  try {
    const markers = [];
    const markerTypes = ['objective', 'hazard', 'waypoint', 'rally'];
    
    for (const event of refs.events) {
      for (let i = 0; i < Math.ceil(rng() * 2); i++) {
        markers.push({
          event_id: event.id,
          type: markerTypes[Math.floor(rng() * markerTypes.length)],
          label: `Marker ${i + 1}`,
          coordinates: {
            lat: -100 + rng() * 200,
            lng: -100 + rng() * 200
          },
          description: 'Tactical objective',
          color: '#ea580c'
        });
      }
    }
    
    const created = await base44.asServiceRole.entities.MapMarker.bulkCreate(markers);
    results.created.mapMarkers = created.length;
  } catch (error) {
    results.errors.push(`MapMarkers: ${error.message}`);
  }

  // === INCIDENTS (emergencies & issues) ===
  try {
    const incidents = [];
    
    for (let i = 0; i < Math.ceil(rng() * 3 * scale); i++) {
      incidents.push({
        title: `Incident Report ${i + 1}`,
        description: 'Operational incident requiring attention',
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(rng() * 4)],
        status: ['open', 'investigating', 'resolved'][Math.floor(rng() * 3)],
        event_id: refs.events[Math.floor(rng() * refs.events.length)]?.id,
        reported_by: userId,
        reported_at: new Date().toISOString()
      });
    }
    
    const created = await base44.asServiceRole.entities.Incident.bulkCreate(incidents);
    results.created.incidents = created.length;
  } catch (error) {
    results.errors.push(`Incidents: ${error.message}`);
  }

  // === COFFER TRANSACTIONS (treasury activity) ===
  try {
    const transactions = [];
    const txTypes = ['mission_payout', 'supply_purchase', 'asset_repair', 'event_expense', 'fundraiser'];
    
    for (let i = 0; i < Math.ceil(rng() * 8 * scale); i++) {
      const amount = Math.floor(rng() * 50000) + 1000;
      transactions.push({
        description: `${txTypes[Math.floor(rng() * txTypes.length)]} - Operation funds`,
        amount,
        transaction_type: Math.random() > 0.4 ? 'inflow' : 'outflow',
        recorded_by: userId,
        timestamp: new Date(Date.now() - rng() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    const created = await base44.asServiceRole.entities.CofferTransaction.bulkCreate(transactions);
    results.created.cofferTransactions = created.length;
  } catch (error) {
    results.errors.push(`CofferTransactions: ${error.message}`);
  }

  // === NOTIFICATION PREFS ===
  try {
    await base44.asServiceRole.entities.NotificationPreference.create({
      user_id: userId,
      high_priority_alerts: true,
      event_assignments: true,
      event_status_changes: true,
      new_messages: true,
      direct_messages: true,
      incident_alerts: true,
      delivery_methods: ['in_app', 'browser'],
      quiet_hours_enabled: false
    });
    results.created.notificationPreferences = 1;
  } catch (error) {
    results.errors.push(`NotificationPreferences: ${error.message}`);
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse optional seed & scale from query params or body
    let seed = 42;
    let scale = 1.0;
    try {
      const payload = await req.json().catch(() => ({}));
      seed = payload.seed || 42;
      scale = payload.scale || 1.0;
    } catch (_) {}

    const results = await seedWeekOfActivity(base44, user.id, seed, scale);

    return Response.json({
      success: true,
      message: 'Sample data seeded successfully',
      created: results.created,
      errors: results.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});