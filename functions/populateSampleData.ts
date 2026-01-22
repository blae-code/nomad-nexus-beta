import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const results = {};

    // Create sample users
    const sampleUsers = [
      { full_name: 'Phoenix Lead', email: 'phoenix@ops.local', rank: 'Pioneer' },
      { full_name: 'Raven One', email: 'raven@ops.local', rank: 'Founder' },
      { full_name: 'Viper', email: 'viper@ops.local', rank: 'Voyager' },
      { full_name: 'Echo', email: 'echo@ops.local', rank: 'Scout' },
      { full_name: 'Delta', email: 'delta@ops.local', rank: 'Vagrant' },
      { full_name: 'Foxhound', email: 'foxhound@ops.local', rank: 'Scout' },
    ];

    const userIds = [];
    for (const userData of sampleUsers) {
      try {
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: userData.email }, '-created_date', 1);
        if (existingUsers.length === 0) {
          // Users are created via invites, skip for now
        }
        userIds.push(user.id); // Use current user as placeholder
      } catch (e) {
        console.error('Error with user:', e.message);
      }
    }

    // Create voice nets
    const nets = await base44.asServiceRole.entities.VoiceNet.bulkCreate([
      { code: 'COMMAND', label: 'Command Net', type: 'command', discipline: 'focused', priority: 1, status: 'active' },
      { code: 'ALPHA', label: 'Alpha Squadron', type: 'squad', discipline: 'casual', priority: 2, status: 'active' },
      { code: 'BRAVO', label: 'Bravo Squadron', type: 'squad', discipline: 'casual', priority: 2, status: 'active' },
      { code: 'LOGI', label: 'Logistics Support', type: 'support', discipline: 'focused', priority: 2, status: 'active' },
      { code: 'RESCUE', label: 'SAR Operations', type: 'support', discipline: 'focused', priority: 1, status: 'active' },
      { code: 'TRAINING', label: 'Training Net', type: 'general', discipline: 'casual', priority: 3, status: 'active' },
    ]);
    results.voiceNets = nets.length;

    // Create squads
    const squads = await base44.asServiceRole.entities.Squad.bulkCreate([
      { name: 'Phoenix Squadron', description: 'Elite combat operations unit', hierarchy_level: 'Squadron', leader_id: user.id },
      { name: 'Raven Flight', description: 'Reconnaissance and intelligence', hierarchy_level: 'Flight', leader_id: user.id },
      { name: 'Viper Team', description: 'Tactical assault specialists', hierarchy_level: 'Team', leader_id: user.id },
    ]);
    results.squads = squads.length;

    // Create squad memberships
    const memberships = await base44.asServiceRole.entities.SquadMembership.bulkCreate([
      { squad_id: squads[0].id, user_id: user.id, role: 'leader', status: 'active' },
      { squad_id: squads[1].id, user_id: user.id, role: 'member', status: 'active' },
      { squad_id: squads[2].id, user_id: user.id, role: 'member', status: 'active' },
    ]);
    results.squadMemberships = memberships.length;

    // Create fleet assets
    const assets = await base44.asServiceRole.entities.FleetAsset.bulkCreate([
      { name: 'Javelin-1', model: 'Javelin', owner_id: user.id, owner_name: user.full_name, status: 'operational', crew_capacity: 6, current_location: 'Port Olisar' },
      { name: 'Cutlass Prime', model: 'Cutlass Black', owner_id: user.id, owner_name: user.full_name, status: 'operational', crew_capacity: 2, current_location: 'Levski' },
      { name: 'Connie-Command', model: 'Constellation Andromeda', owner_id: user.id, owner_name: user.full_name, status: 'operational', crew_capacity: 5, current_location: 'Stanton' },
      { name: 'Freelancer-Support', model: 'Freelancer', owner_id: user.id, owner_name: user.full_name, status: 'operational', crew_capacity: 4, current_location: 'Crusader' },
    ]);
    results.fleetAssets = assets.length;

    // Create events with various statuses
    const now = new Date();
    const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const pastTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const events = await base44.asServiceRole.entities.Event.bulkCreate([
      {
        title: 'Operation Phantom Strike',
        description: 'High-priority combat operation targeting hostile assets',
        event_type: 'focused',
        priority: 'CRITICAL',
        phase: 'ACTIVE',
        status: 'active',
        start_time: now.toISOString(),
        end_time: futureTime.toISOString(),
        host_id: user.id,
        assigned_user_ids: [user.id],
        assigned_asset_ids: [assets[0]?.id || ''].filter(Boolean),
        location: 'Stanton - Crusader',
        tags: ['Combat', 'High-Priority', 'Military'],
        auec_split_rules: 'Even Split',
        command_staff: { commander_id: user.id },
        readiness_checklist: { comms_provisioned: true, minimum_attendance_met: true, roles_assigned: true, assets_deployed: true }
      },
      {
        title: 'Salvage Run - Derelict Station',
        description: 'Salvage operations on abandoned station debris',
        event_type: 'casual',
        priority: 'HIGH',
        phase: 'BRIEFING',
        status: 'scheduled',
        start_time: futureTime.toISOString(),
        end_time: new Date(futureTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        host_id: user.id,
        assigned_user_ids: [user.id],
        assigned_asset_ids: [assets[1]?.id || ''].filter(Boolean),
        location: 'Yela - Crusader',
        tags: ['Salvage', 'Economic', 'Exploration'],
        auec_split_rules: 'Host Decides'
      },
      {
        title: 'Search and Rescue - Lost Pilot',
        description: 'Emergency SAR operation for stranded pilot at Arccorp',
        event_type: 'focused',
        priority: 'CRITICAL',
        phase: 'ACTIVE',
        status: 'active',
        start_time: now.toISOString(),
        end_time: new Date(now.getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
        host_id: user.id,
        assigned_user_ids: [user.id],
        assigned_asset_ids: [assets[3]?.id || ''].filter(Boolean),
        location: 'Arccorp - Stanton',
        tags: ['Rescue', 'Emergency', 'Priority'],
        command_staff: { commander_id: user.id, comms_officer_id: user.id }
      },
      {
        title: 'Training Exercise - Formation Flying',
        description: 'Wing training to improve formation discipline and comms',
        event_type: 'casual',
        priority: 'STANDARD',
        phase: 'PLANNING',
        status: 'pending',
        start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
        host_id: user.id,
        assigned_user_ids: [user.id],
        location: 'Crusader - Stanton',
        tags: ['Training', 'Education', 'Tactics'],
        auec_split_rules: 'Training - No Split'
      },
      {
        title: 'Mining Operation - Asteroid Field',
        description: 'Coordinated mining expedition in rich asteroid field',
        event_type: 'casual',
        priority: 'STANDARD',
        phase: 'PLANNING',
        status: 'scheduled',
        start_time: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        host_id: user.id,
        location: 'Yela Fields - Crusader',
        tags: ['Mining', 'Economic', 'Team-Effort'],
        auec_split_rules: 'Even Split'
      },
      {
        title: 'Completed: Industrial Assistance',
        description: 'Provided escort and protection for cargo delivery',
        event_type: 'casual',
        priority: 'HIGH',
        phase: 'ARCHIVED',
        status: 'completed',
        start_time: pastTime.toISOString(),
        end_time: new Date(pastTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        host_id: user.id,
        location: 'Trade Routes',
        tags: ['Cargo', 'Security', 'Economic']
      }
    ]);
    results.events = events.length;

    // Create event logs
    const eventLogs = await base44.asServiceRole.entities.EventLog.bulkCreate([
      { event_id: events[0]?.id || '', type: 'STATUS', severity: 'HIGH', actor_user_id: user.id, summary: 'Operation transitioned to ACTIVE phase', details: { phase_change: 'BRIEFING -> ACTIVE' } },
      { event_id: events[0]?.id || '', type: 'COMMS', severity: 'LOW', actor_user_id: user.id, summary: 'All voice nets provisioned and tested', details: { nets: ['COMMAND', 'ALPHA', 'BRAVO'] } },
      { event_id: events[0]?.id || '', type: 'SYSTEM', severity: 'MEDIUM', actor_user_id: user.id, summary: 'System health check: 98% nominal', details: { health_percent: 98 } },
      { event_id: events[2]?.id || '', type: 'RESCUE', severity: 'HIGH', actor_user_id: user.id, summary: 'SAR beacon detected at coordinates', details: { coordinates: 'X: 12500, Y: 8300' } },
      { event_id: events[2]?.id || '', type: 'RESCUE', severity: 'HIGH', actor_user_id: user.id, summary: 'Distress signal strength improving - rescue unit inbound', details: { signal_strength: '-65 dBm' } },
    ]);
    results.eventLogs = eventLogs.filter(el => el).length;

    // Create channels
    const channels = await base44.asServiceRole.entities.Channel.bulkCreate([
      { name: 'general', type: 'text', category: 'casual', squad_id: squads[0]?.id },
      { name: 'operations', type: 'text', category: 'focused', access_min_rank: 'Scout', is_read_only: true },
      { name: 'announcements', type: 'text', category: 'admin', is_read_only: true },
      { name: 'fleet-updates', type: 'text', category: 'squad', squad_id: squads[0]?.id },
      { name: 'intel-reports', type: 'text', category: 'focused', access_min_rank: 'Voyager', is_read_only: true },
    ]);
    results.channels = channels.length;

    // Create messages
    const messages = await base44.asServiceRole.entities.Message.bulkCreate([
      { channel_id: channels[0]?.id || '', user_id: user.id, content: 'Welcome to Phoenix Squadron operations channel! Stay sharp out there.' },
      { channel_id: channels[0]?.id || '', user_id: user.id, content: 'All pilots report readiness check complete. Standing by for Operation Phantom Strike briefing.' },
      { channel_id: channels[1]?.id || '', user_id: user.id, content: 'OPERATIONAL: All systems nominal. Comm nets verified. Ready for deployment.' },
      { channel_id: channels[3]?.id || '', user_id: user.id, content: 'Fleet Status: 4 vessels operational, 100% combat ready. Loadouts verified.' },
    ]);
    results.messages = messages.filter(m => m).length;

    // Create incidents
    const incidents = await base44.asServiceRole.entities.Incident.bulkCreate([
      {
        title: 'Lost Pilot Distress Call',
        description: 'Pilot ejected near Arccorp, signal weak but active',
        severity: 'CRITICAL',
        status: 'responding',
        incident_type: 'rescue',
        affected_area: 'Arccorp - Stanton',
        assigned_user_ids: [user.id],
        reported_by: user.id,
        event_id: events[2]?.id || '',
        assigned_net_id: nets[4]?.id || '',
        priority: 1,
        tags: ['SAR', 'Priority-1', 'Active']
      },
      {
        title: 'Quantum Drive Malfunction - Javelin-1',
        description: 'QD failure reported on primary vessel during transit',
        severity: 'HIGH',
        status: 'contained',
        incident_type: 'technical',
        affected_area: 'Crusader Airspace',
        assigned_user_ids: [user.id],
        reported_by: user.id,
        event_id: events[0]?.id || '',
        priority: 2,
        tags: ['Technical', 'Fleet', 'Resolved']
      }
    ]);
    results.incidents = incidents.filter(i => i).length;

    // Create user presence records
    const presences = await base44.asServiceRole.entities.UserPresence.bulkCreate([
      { user_id: user.id, status: 'online', is_transmitting: false, last_activity: new Date().toISOString() },
    ]);
    results.userPresence = presences.filter(p => p).length;

    // Create ritual bonfire
    const bonfires = await base44.asServiceRole.entities.RitualBonfire.bulkCreate([
      {
        title: 'Weekly Squadron Gathering',
        scheduled_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Weekly bonfire - all pilots welcome for camaraderie and planning',
        set_by_pioneer_id: user.id,
        voice_net_id: nets[0]?.id || '',
        status: 'scheduled',
        attendee_ids: [user.id]
      }
    ]);
    results.ritualBonfires = bonfires.filter(b => b).length;

    return Response.json({
      success: true,
      message: 'Sample data populated successfully',
      results,
      timestamp: new Date().toISOString(),
      summary: `Created ${Object.values(results).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)} total records`
    });
  } catch (error) {
    console.error('Population error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});