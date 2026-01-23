import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENTITIES_TO_CLEAR = [
  'Event',
  'Squad',
  'SquadMembership',
  'SquadEvent',
  'SquadRole',
  'SquadResource',
  'FleetAsset',
  'Message',
  'Channel',
  'VoiceNet',
  'Incident',
  'EventLog',
  'EventReport',
  'Notification',
  'NotificationPreference',
  'UserPresence',
  'Coffer'
];

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

    const results = [];
    let totalDeleted = 0;

    for (const entityName of ENTITIES_TO_CLEAR) {
      try {
        // Get all records for this entity
        const records = await base44.asServiceRole.entities[entityName].list();
        
        // Delete all records
        for (const record of records) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
          totalDeleted++;
        }

        results.push({
          entity: entityName,
          deleted: records.length,
          success: true
        });
      } catch (error) {
        results.push({
          entity: entityName,
          deleted: 0,
          success: false,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Wiped all app data - ${totalDeleted} records deleted`,
      details: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});