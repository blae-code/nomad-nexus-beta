import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const ENTITIES_TO_CLEAR = [
  'CofferTransaction',
  'MapMarker',
  'EventLog',
  'EventReport',
  'PlayerStatus',
  'Incident',
  'EventDutyAssignment',
  'EventRecurrence',
  'EventTemplate',
  'EventNotification',
  'Message',
  'PinnedMessage',
  'ChannelMute',
  'Channel',
  'VoiceNetStatus',
  'VoiceMute',
  'VoiceNet',
  'NetPatch',
  'LeadershipComms',
  'CommsSimulation',
  'SquadApplication',
  'SquadRecruitment',
  'SquadEvent',
  'SquadMembership',
  'SquadRole',
  'SquadResource',
  'Squad',
  'Event',
  'FleetAsset',
  'Notification',
  'NotificationPreference',
  'UserPresence',
  'Coffer',
  'AuditLog',
  'SystemCheckResult',
  'RitualBonfire'
];

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, adminUser, memberProfile } = await getAuthContext(req, payload);

    // Admin-only operation
    const isAdmin = Boolean(adminUser) || isAdminMember(memberProfile);
    if (!isAdmin) {
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
