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
  const results = { created: {}, errors: [], featured_event_id: null };
  const refs = { squads: [], events: [], channels: [], voiceNets: [], assets: [], users: [] };
  
  // Canon ranks & roles
  const ranks = ['Pioneer', 'Founder', 'Voyager', 'Pathfinder', 'Scout', 'Vagrant'];
  const roles = ['Commander', 'Officer', 'Specialist', 'Member'];
  const rankColors = { Pioneer: '#fbbf24', Founder: '#f97316', Voyager: '#ef4444', Pathfinder: '#3b82f6', Scout: '#22c55e', Vagrant: '#6b7280' };

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

  // === EVENTS (full week: past, present, future with featured demo) ===
  try {
    const now = new Date();
    const events = [];
    let featuredIdx = -1;
    const eventCount = Math.ceil(12 + rng() * 13 * scale);
    
    for (let i = 0; i < eventCount; i++) {
      const daysOffset = -2 + Math.floor(rng() * 7);
      const eventDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const eventType = rng() > 0.4 ? 'focused' : 'casual';
      const priorities = ['CRITICAL', 'HIGH', 'STANDARD', 'LOW'];
      const priority = priorities[Math.floor(rng() * priorities.length)];
      
      let phase = 'PLANNING';
      let status = 'scheduled';
      if (daysOffset < 0) {
        phase = rng() > 0.3 ? 'ARCHIVED' : 'DEBRIEF';
        status = 'completed';
      } else if (daysOffset === 0) {
        phase = 'ACTIVE';
        status = 'active';
      }
      
      const isFeatured = eventType === 'focused' && featuredIdx === -1 && rng() > 0.6;
      if (isFeatured) featuredIdx = i;
      
      events.push({
        title: `Op-${String(i + 1).padStart(2, '0')} ${eventType === 'focused' ? '[TACTICAL]' : '[SOCIAL]'}`,
        description: `${eventType === 'focused' ? 'Disciplined tactical operation' : 'Casual squadron gathering'} - ${Math.floor(rng() * 100 + 20)} min duration`,
        event_type: eventType,
        priority,
        phase,
        status,
        start_time: eventDate.toISOString(),
        end_time: new Date(eventDate.getTime() + (20 + Math.floor(rng() * 120)) * 60 * 1000).toISOString(),
        location: ['Arccorp Hub', 'Crusader', 'Delamar', 'MicroTech', 'Stanton'][Math.floor(rng() * 5)],
        host_id: userId,
        tags: [eventType, 'redscar', 'demo'],
        is_featured: isFeatured || undefined
      });
    }
    
    const createdEvents = await base44.asServiceRole.entities.Event.bulkCreate(events);
    refs.events = createdEvents;
    if (featuredIdx >= 0 && createdEvents[featuredIdx]) {
      results.featured_event_id = createdEvents[featuredIdx].id;
    }
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
      'All personnel report status.',
      'Commencing operation, all nets stand by.',
      'Mission success, returning to base.',
      'Navigation lock acquired on target.',
      'Performing diagnostics on port systems.',
      'Requesting resupply at Stanton.',
      'Contact lost at last known position.',
      'Standby for tactical briefing.',
      'Extraction point confirmed, moving to LZ.',
      'Copy that, ETA 5 minutes.',
      'Hostile contact, taking evasive action!',
      'Medical assistance required immediately.',
      'Asset integrity nominal.',
      'Standing by for orders.',
      'Transmitting telemetry now.'
    ];
    
    const msgCount = Math.ceil(250 + rng() * 950 * scale);
    for (let i = 0; i < msgCount; i++) {
      const channel = refs.channels[Math.floor(rng() * refs.channels.length)];
      messages.push({
        channel_id: channel.id,
        user_id: userId,
        content: msgTemplates[Math.floor(rng() * msgTemplates.length)],
        read_by: [userId],
        created_date: new Date(Date.now() - rng() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
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

  // === INCIDENTS (emergencies & issues) - min 2 active ===
  try {
    const incidents = [];
    const incidentCount = Math.ceil(6 + rng() * 9 * scale);
    
    // Ensure 2 active incidents
    for (let i = 0; i < 2; i++) {
      incidents.push({
        title: `[ACTIVE] ${['Hull Breach', 'Engine Malfunction', 'Life Support Failure', 'Navigation Failure'][i % 4]}`,
        description: 'Active incident requiring immediate response',
        severity: 'CRITICAL',
        status: 'open',
        event_id: refs.events[Math.floor(rng() * refs.events.length)]?.id,
        reported_by: userId,
        reported_at: new Date(Date.now() - rng() * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Fill remaining incidents with varied statuses
    for (let i = 2; i < incidentCount; i++) {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const statuses = ['open', 'investigating', 'resolved'];
      incidents.push({
        title: `Incident #${i + 1}`,
        description: 'Operational incident requiring attention',
        severity: severities[Math.floor(rng() * severities.length)],
        status: statuses[Math.floor(rng() * statuses.length)],
        event_id: refs.events[Math.floor(rng() * refs.events.length)]?.id,
        reported_by: userId,
        reported_at: new Date(Date.now() - rng() * 7 * 24 * 60 * 60 * 1000).toISOString()
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

  // === PLAYER STATUS (with 2 DISTRESS) ===
  try {
    const statuses = [];
    const eventForStatus = refs.events[0];
    if (eventForStatus) {
      // 2 DISTRESS statuses
      for (let i = 0; i < 2; i++) {
        statuses.push({
          event_id: eventForStatus.id,
          user_id: userId,
          status: 'DISTRESS',
          role: roles[i % roles.length]
        });
      }
      // Mix of other statuses
      const otherStatuses = ['READY', 'ENGAGED', 'DOWN', 'RTB'];
      for (let i = 2; i < Math.ceil(4 + rng() * 4 * scale); i++) {
        statuses.push({
          event_id: eventForStatus.id,
          user_id: userId,
          status: otherStatuses[Math.floor(rng() * otherStatuses.length)],
          role: roles[Math.floor(rng() * roles.length)]
        });
      }
      
      const created = await base44.asServiceRole.entities.PlayerStatus.bulkCreate(statuses);
      results.created.playerStatuses = created.length;
    }
  } catch (error) {
    results.errors.push(`PlayerStatuses: ${error.message}`);
  }

  // === RESCUE REQUEST (wired to RESCUE net) ===
  try {
    const rescueNet = refs.voiceNets.find(n => n.code === 'RESCUE');
    if (rescueNet) {
      const rescue = await base44.asServiceRole.entities.Incident.create({
        title: '[RESCUE] Pilot Down - Signal Lost',
        description: 'Pilot ejected, beacon active, coordinating rescue on RESCUE net',
        severity: 'CRITICAL',
        status: 'open',
        reported_by: userId,
        reported_at: new Date().toISOString(),
        comms_net: rescueNet.code,
        comms_net_id: rescueNet.id,
        location: 'Crusader - Daymar Crash Site'
      });
      results.created.rescueRequest = rescue.id;
    }
  } catch (error) {
    results.errors.push(`RescueRequest: ${error.message}`);
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