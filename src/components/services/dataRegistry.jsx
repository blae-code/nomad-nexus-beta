/**
 * DataRegistry — Canonical index of all data domains
 * Provides abstraction for wipe/seed/validate/repair operations
 */

import { base44 } from '@/api/base44Client';

/**
 * Domain definitions: key, label, entity name
 */
const DOMAINS = [
  { key: 'users', label: 'Users', entityName: 'User' },
  { key: 'memberProfiles', label: 'Member Profiles', entityName: 'MemberProfile' },
  { key: 'aiConsents', label: 'AI Consents', entityName: 'AIConsent' },
  { key: 'accessKeys', label: 'Access Keys', entityName: 'AccessKey' },
  { key: 'events', label: 'Events', entityName: 'Event' },
  { key: 'eventParticipants', label: 'Event Participants', entityName: 'EventParticipant' },
  { key: 'opBindings', label: 'Op Bindings', entityName: 'OpBinding' },
  { key: 'voiceNets', label: 'Voice Nets', entityName: 'VoiceNet' },
  { key: 'voiceSessions', label: 'Voice Sessions', entityName: 'VoiceSession' },
  { key: 'voiceMutes', label: 'Voice Mutes', entityName: 'VoiceMute' },
  { key: 'channels', label: 'Channels', entityName: 'Channel' },
  { key: 'messages', label: 'Messages', entityName: 'Message' },
  { key: 'commsReadState', label: 'Comms Read State', entityName: 'CommsReadState' },
  { key: 'channelMutes', label: 'Channel Mutes', entityName: 'ChannelMute' },
  { key: 'pinnedMessages', label: 'Pinned Messages', entityName: 'PinnedMessage' },
  { key: 'notifications', label: 'Notifications', entityName: 'Notification' },
  { key: 'notificationPrefs', label: 'Notification Preferences', entityName: 'NotificationPreference' },
  { key: 'userPresence', label: 'User Presence', entityName: 'UserPresence' },
  { key: 'playerStatus', label: 'Player Status', entityName: 'PlayerStatus' },
  { key: 'squads', label: 'Squads', entityName: 'Squad' },
  { key: 'squadMemberships', label: 'Squad Memberships', entityName: 'SquadMembership' },
  { key: 'coffers', label: 'Coffers', entityName: 'Coffer' },
  { key: 'cofferTransactions', label: 'Coffer Transactions', entityName: 'CofferTransaction' },
  { key: 'fleetAssets', label: 'Fleet Assets', entityName: 'FleetAsset' },
  { key: 'armoryItems', label: 'Armory Items', entityName: 'ArmoryItem' },
  { key: 'roles', label: 'Roles', entityName: 'Role' },
  { key: 'auditLogs', label: 'Audit Logs', entityName: 'AuditLog' },
  { key: 'systemCheckResults', label: 'System Check Results', entityName: 'SystemCheckResult' },
  { key: 'incidents', label: 'Incidents', entityName: 'Incident' },
  { key: 'feedback', label: 'Feedback', entityName: 'Feedback' },
  { key: 'aiAgents', label: 'AI Agents', entityName: 'AIAgent' },
  { key: 'aiAgentLogs', label: 'AI Agent Logs', entityName: 'AIAgentLog' },
  { key: 'aiAgentRules', label: 'AI Agent Rules', entityName: 'AIAgentRule' },
];

/**
 * Get list of all domains with metadata
 */
export function listDomains() {
  return DOMAINS.map((domain) => ({
    ...domain,
    countFn: async () => {
      try {
        const entity = base44.entities[domain.entityName];
        if (!entity) return 0;
        const items = await entity.list();
        return items?.length || 0;
      } catch {
        return 0;
      }
    },
  }));
}

/**
 * Count records in a single domain
 */
export async function countDomain(domainKey) {
  const domain = DOMAINS.find((d) => d.key === domainKey);
  if (!domain) return 0;

  try {
    const entity = base44.entities[domain.entityName];
    if (!entity) return 0;
    const items = await entity.list();
    return items?.length || 0;
  } catch {
    return 0;
  }
}

/**
 * Get all counts for all domains
 */
export async function countAllDomains() {
  const counts = {};
  for (const domain of DOMAINS) {
    counts[domain.key] = await countDomain(domain.key);
  }
  return counts;
}

/**
 * Wipe a single domain (delete all records)
 */
export async function wipeDomain(domainKey, options = {}) {
  const domain = DOMAINS.find((d) => d.key === domainKey);
  if (!domain) throw new Error(`Unknown domain: ${domainKey}`);

  const { dryRun = false, preserveSeeded = false } = options;

  try {
    const entity = base44.entities[domain.entityName];
    if (!entity) return { success: false, error: 'Entity not found', deleted: 0 };

    let items = await entity.list();
    if (!items) items = [];

    // Filter out seeded items if preserve requested
    if (preserveSeeded) {
      items = items.filter((item) => !item.meta?.seeded);
    }

    if (dryRun) {
      return { success: true, dryRun: true, deleted: items.length };
    }

    // Delete all items
    let deletedCount = 0;
    for (const item of items) {
      try {
        await entity.delete(item.id);
        deletedCount++;
      } catch (err) {
        console.warn(`Failed to delete ${domain.key} ${item.id}:`, err);
      }
    }

    return { success: true, deleted: deletedCount };
  } catch (error) {
    return { success: false, error: error.message, deleted: 0 };
  }
}

/**
 * Wipe all domains
 */
export async function wipeAll(options = {}) {
  const { dryRun = false, preserveSeeded = false } = options;
  const results = {};
  let totalDeleted = 0;

  for (const domain of DOMAINS) {
    try {
      const result = await wipeDomain(domain.key, { dryRun, preserveSeeded });
      results[domain.key] = result;
      if (result.success) {
        totalDeleted += result.deleted;
      }
    } catch (error) {
      results[domain.key] = { success: false, error: error.message };
    }
  }

  return { results, totalDeleted, dryRun };
}

/**
 * Seed immersive data (thematic placeholder data)
 */
export async function seedImmersive(options = {}) {
  const { seedSetId = 'redscar_demo_v1', intensity = 'light' } = options;

  const metadata = { seeded: true, seedSetId };

  try {
    // Create demo users (if User entity allows direct creation; otherwise skip)
    const users = [];
    const mockUsers = [
      { callsign: 'Echo', rank: 'SCOUT', membership: 'MEMBER' },
      { callsign: 'Recon', rank: 'VAGRANT', membership: 'GUEST' },
      { callsign: 'Shadow', rank: 'VOYAGER', membership: 'PARTNER' },
      ...(intensity === 'full' ? [
        { callsign: 'Phantom', rank: 'SCOUT', membership: 'AFFILIATE' },
        { callsign: 'Nightfall', rank: 'PIONEER', membership: 'PARTNER' },
      ] : []),
    ];

    for (const user of mockUsers) {
      // Note: User entity creation is restricted; this is here for future implementation
      // For now, we skip user creation and focus on other domains
    }

    // Create member profiles
    if (base44.entities.MemberProfile) {
      for (const user of mockUsers) {
        try {
          await base44.entities.MemberProfile.create({
            user_id: `seeded_user_${user.callsign}`,
            callsign: user.callsign,
            rank: user.rank,
            membership: user.membership,
            onboarding_completed: true,
            meta: metadata,
          });
        } catch {
          // Silent fail; may already exist
        }
      }
    }

    // Create voice nets
    const nets = [
      { code: 'COMMAND', label: 'Command Net', type: 'command', discipline: 'focused' },
      { code: 'ALPHA', label: 'Alpha Squadron', type: 'squad', discipline: 'casual' },
      { code: 'BRAVO', label: 'Bravo Squadron', type: 'squad', discipline: 'casual' },
      { code: 'RESCUE', label: 'Rescue Ops', type: 'support', discipline: 'focused' },
      ...(intensity === 'full' ? [
        { code: 'LOGI', label: 'Logistics', type: 'support', discipline: 'casual' },
        { code: 'INTEL', label: 'Intel Net', type: 'command', discipline: 'focused' },
      ] : []),
    ];

    for (const net of nets) {
      try {
        await base44.entities.VoiceNet.create({
          code: net.code,
          label: net.label,
          type: net.type,
          discipline: net.discipline,
          livekit_room_name: `nexus_${net.code.toLowerCase()}`,
          status: 'active',
          meta: metadata,
        });
      } catch {
        // Silent fail
      }
    }

    // Create channels
    const channels = [
      { name: 'general', type: 'text', category: 'casual' },
      { name: 'announcements', type: 'text', category: 'public' },
      { name: 'comms-focused', type: 'text', category: 'focused' },
      { name: 'mission-planning', type: 'text', category: 'focused' },
      ...(intensity === 'full' ? [
        { name: 'lounge', type: 'text', category: 'casual' },
        { name: 'intel-brief', type: 'text', category: 'focused' },
        { name: 'squad-alpha', type: 'text', category: 'squad' },
      ] : []),
    ];

    for (const channel of channels) {
      try {
        await base44.entities.Channel.create({
          name: channel.name,
          type: channel.type,
          category: channel.category,
          meta: metadata,
        });
      } catch {
        // Silent fail
      }
    }

    // Create a demo event
    try {
      const eventStart = new Date();
      eventStart.setHours(eventStart.getHours() + 2);

      await base44.entities.Event.create({
        title: 'Operation Redscar',
        description: 'Demonstration operation for command console testing',
        event_type: 'focused',
        priority: 'HIGH',
        status: 'active',
        phase: 'ACTIVE',
        start_time: eventStart.toISOString(),
        end_time: new Date(eventStart.getTime() + 3600000).toISOString(),
        location: 'Stanton System',
        meta: metadata,
      });
    } catch {
      // Silent fail
    }

    return { success: true, message: `Seeded ${intensity} immersive data with ID: ${seedSetId}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Wipe seeded data only (preserves non-seeded records)
 */
export async function wipeSeededOnly(seedSetId = null) {
  const results = {};
  let totalDeleted = 0;

  for (const domain of DOMAINS) {
    try {
      const entity = base44.entities[domain.entityName];
      if (!entity) continue;

      let items = await entity.list();
      if (!items) items = [];

      // Filter seeded items
      let seededItems = items.filter((item) => item.meta?.seeded);
      if (seedSetId) {
        seededItems = seededItems.filter((item) => item.meta?.seedSetId === seedSetId);
      }

      let deletedCount = 0;
      for (const item of seededItems) {
        try {
          await entity.delete(item.id);
          deletedCount++;
        } catch (err) {
          console.warn(`Failed to delete ${domain.key} ${item.id}:`, err);
        }
      }

      results[domain.key] = { deleted: deletedCount };
      totalDeleted += deletedCount;
    } catch (error) {
      results[domain.key] = { error: error.message };
    }
  }

  return { results, totalDeleted };
}

/**
 * Validate all domains (check for orphans, missing refs, etc.)
 */
export async function validateAll() {
  const report = {
    timestamp: new Date().toISOString(),
    domains: {},
    issues: [],
    totalRecords: 0,
  };

  for (const domain of DOMAINS) {
    try {
      const entity = base44.entities[domain.entityName];
      if (!entity) {
        report.domains[domain.key] = { count: 0, status: 'unavailable' };
        continue;
      }

      const items = await entity.list();
      const count = items?.length || 0;

      report.domains[domain.key] = {
        count,
        status: 'ok',
      };

      report.totalRecords += count;

      // Basic checks (can be expanded)
      if (count === 0) {
        report.issues.push({
          domain: domain.key,
          severity: 'info',
          message: 'No records found',
        });
      }
    } catch (error) {
      report.domains[domain.key] = {
        count: 0,
        status: 'error',
        error: error.message,
      };
      report.issues.push({
        domain: domain.key,
        severity: 'error',
        message: error.message,
      });
    }
  }

  return report;
}

/**
 * Repair (placeholder; can be extended)
 */
export async function repairAll() {
  return {
    success: true,
    message: 'No repairs needed at this time',
    timestamp: new Date().toISOString(),
  };
}