import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // List of entities to wipe (keeping User entity intact, only removing other data)
    const entitiesToWipe = [
      'Event', 'Squad', 'SquadMembership', 'VoiceNet', 'Channel', 'Message',
      'EventLog', 'EventReport', 'MapMarker', 'FleetAsset', 'Incident',
      'EventNotification', 'Notification', 'NotificationPreference', 'PinnedMessage',
      'ChannelMute', 'VoiceMute', 'UserPresence', 'EventDutyAssignment',
      'AuditLog', 'EventTemplate', 'EventRecurrence', 'RitualBonfire',
      'NetPatch', 'SystemCheckResult', 'PlayerStatus', 'Role', 'Coffer',
      'ArmoryItem', 'CofferTransaction', 'AIAgent', 'AIAgentRule', 'AIAgentLog'
    ];

    const results = {};
    
    for (const entity of entitiesToWipe) {
      try {
        // Fetch all records for this entity
        const records = await base44.asServiceRole.entities[entity].list('-created_date', 1000);
        
        // Delete each record
        for (const record of records) {
          await base44.asServiceRole.entities[entity].delete(record.id);
        }
        
        results[entity] = { deleted: records.length, success: true };
      } catch (error) {
        results[entity] = { deleted: 0, success: false, error: error.message };
      }
    }

    // Count remaining entities
    let remainingCounts = {};
    try {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 1);
      remainingCounts['User'] = users.length;
    } catch (e) {
      remainingCounts['User'] = 'error';
    }

    return Response.json({
      success: true,
      message: 'App data wiped successfully',
      results,
      remainingData: remainingCounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});