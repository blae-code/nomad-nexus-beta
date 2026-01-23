import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only operation
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const results = { created: {}, errors: [] };

    try {
      // Create sample squads
      const squads = await base44.asServiceRole.entities.Squad.bulkCreate([
        {
          name: 'Redscar Command',
          description: 'Leadership and strategic coordination',
          leader_id: user.id,
          status: 'active'
        },
        {
          name: 'Flight Alpha',
          description: 'Combat operations and patrol',
          leader_id: user.id,
          status: 'active'
        },
        {
          name: 'Support Squadron',
          description: 'Logistics and rescue operations',
          leader_id: user.id,
          status: 'active'
        }
      ]);
      results.created.squads = squads.length;
    } catch (error) {
      results.errors.push(`Squads: ${error.message}`);
    }

    try {
      // Create sample voice nets
      await base44.asServiceRole.entities.VoiceNet.bulkCreate([
        {
          code: 'COMMAND',
          label: 'Command Channel',
          type: 'command',
          discipline: 'focused',
          priority: 1
        },
        {
          code: 'ALPHA',
          label: 'Flight Alpha',
          type: 'squad',
          discipline: 'casual',
          priority: 2
        },
        {
          code: 'RESCUE',
          label: 'Rescue Operations',
          type: 'support',
          discipline: 'focused',
          priority: 1
        },
        {
          code: 'LOGISTICS',
          label: 'Logistics Channel',
          type: 'support',
          discipline: 'casual',
          priority: 3
        }
      ]);
      results.created.voiceNets = 4;
    } catch (error) {
      results.errors.push(`VoiceNets: ${error.message}`);
    }

    try {
      // Create sample fleet assets
      const ships = [
        { name: 'Redscar-01', model: 'Anvil Carrack', type: 'SHIP', status: 'OPERATIONAL', location: 'MicroTech Orbit' },
        { name: 'Redscar-02', model: 'Drake Cutlass', type: 'SHIP', status: 'OPERATIONAL', location: 'Crusader' },
        { name: 'Redscar-03', model: 'RSI Constellation', type: 'SHIP', status: 'MAINTENANCE', location: 'Port Olisar' },
        { name: 'Redscar-04', model: 'Aegis Avenger', type: 'SHIP', status: 'OPERATIONAL', location: 'Stanton' },
        { name: 'Redscar-05', model: 'MISC Prospector', type: 'SHIP', status: 'OPERATIONAL', location: 'Yela' },
        { name: 'Redscar-Rover-01', model: 'Greycat PTV', type: 'VEHICLE', status: 'OPERATIONAL', location: 'Daymar' }
      ];
      
      await base44.asServiceRole.entities.FleetAsset.bulkCreate(ships);
      results.created.fleetAssets = ships.length;
    } catch (error) {
      results.errors.push(`FleetAssets: ${error.message}`);
    }

    try {
      // Create sample squad roles
      await base44.asServiceRole.entities.SquadRole.bulkCreate([
        {
          squad_id: 'sample-squad-1',
          name: 'Squad Lead',
          description: 'Leads squad operations',
          color: '#ea580c',
          permissions: ['manage_events', 'manage_members', 'manage_resources', 'schedule_operations'],
          is_leadership_role: true
        },
        {
          squad_id: 'sample-squad-1',
          name: 'Pilot',
          description: 'Operates aircraft and spacecraft',
          color: '#3b82f6',
          permissions: ['manage_events', 'schedule_operations'],
          is_leadership_role: false
        },
        {
          squad_id: 'sample-squad-1',
          name: 'Gunner',
          description: 'Operates weapons systems',
          color: '#ef4444',
          permissions: ['manage_events'],
          is_leadership_role: false
        }
      ]);
      results.created.squadRoles = 3;
    } catch (error) {
      results.errors.push(`SquadRoles: ${error.message}`);
    }

    try {
      // Create sample squad resources
      await base44.asServiceRole.entities.SquadResource.bulkCreate([
        {
          squad_id: 'sample-squad-1',
          name: 'Medical Supplies - Standard',
          type: 'supply',
          quantity: 45,
          status: 'available',
          location: 'Port Olisar Medical Bay'
        },
        {
          squad_id: 'sample-squad-1',
          name: 'Ammunition Cache',
          type: 'supply',
          quantity: 200,
          status: 'available',
          location: 'Weapons Storage'
        },
        {
          squad_id: 'sample-squad-1',
          name: 'Fuel Reserves',
          type: 'supply',
          quantity: 50,
          status: 'in_use',
          location: 'Fuel Storage Facility'
        }
      ]);
      results.created.squadResources = 3;
    } catch (error) {
      results.errors.push(`SquadResources: ${error.message}`);
    }

    try {
      // Create sample events
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      await base44.asServiceRole.entities.Event.bulkCreate([
        {
          title: 'Weekly Command Briefing',
          description: 'Strategic planning and operational updates',
          event_type: 'focused',
          priority: 'HIGH',
          phase: 'BRIEFING',
          status: 'scheduled',
          start_time: tomorrow.toISOString(),
          end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
          location: 'Comm Station Alpha',
          host_id: user.id
        },
        {
          title: 'Cargo Run - Arccorp to Stanton',
          description: 'Standard transport and delivery mission',
          event_type: 'casual',
          priority: 'STANDARD',
          phase: 'PLANNING',
          status: 'scheduled',
          start_time: dayAfter.toISOString(),
          end_time: new Date(dayAfter.getTime() + 3 * 60 * 60 * 1000).toISOString(),
          location: 'Arccorp Hub',
          host_id: user.id,
          tags: ['cargo', 'trading']
        },
        {
          title: 'Search and Rescue - Emergency Response',
          description: 'Active rescue operation in progress',
          event_type: 'focused',
          priority: 'CRITICAL',
          phase: 'ACTIVE',
          status: 'active',
          start_time: now.toISOString(),
          end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          location: 'Delamar Crash Site',
          host_id: user.id,
          tags: ['rescue', 'emergency']
        }
      ]);
      results.created.events = 3;
    } catch (error) {
      results.errors.push(`Events: ${error.message}`);
    }

    try {
      // Create sample channels
      await base44.asServiceRole.entities.Channel.bulkCreate([
        {
          name: 'general',
          type: 'public',
          description: 'General discussion and announcements'
        },
        {
          name: 'operations',
          type: 'public',
          description: 'Operational updates and coordination'
        },
        {
          name: 'logistics',
          type: 'private',
          description: 'Supply and resource management'
        },
        {
          name: 'command',
          type: 'private',
          description: 'Leadership communications'
        }
      ]);
      results.created.channels = 4;
    } catch (error) {
      results.errors.push(`Channels: ${error.message}`);
    }

    try {
      // Create sample notification preferences for user
      await base44.asServiceRole.entities.NotificationPreference.create({
        user_id: user.id,
        high_priority_alerts: true,
        event_assignments: true,
        event_status_changes: true,
        new_messages: true,
        direct_messages: true,
        squad_invitations: true,
        squad_events: true,
        incident_alerts: true,
        delivery_methods: ['in_app', 'browser'],
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      });
      results.created.notificationPreferences = 1;
    } catch (error) {
      results.errors.push(`NotificationPreferences: ${error.message}`);
    }

    return Response.json({
      success: true,
      message: 'Sample data populated successfully',
      created: results.created,
      errors: results.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});