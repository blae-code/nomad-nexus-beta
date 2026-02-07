import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_METRICS = {
  lastSync: null,
  recentActivity: [],
  members: null,
  channels: null,
  voiceNets: null,
  commsScheduled: null,
  commsBridges: null,
  commsNegativeSignals: null,
  eventsActive: null,
  eventsUpcoming: null,
  commandsOpen: null,
  commandsTotal: null,
  missionsOpen: null,
  contractsOpen: null,
  missionCatalogTotal: null,
  reportTemplates: null,
  reportSchedules: null,
  reportDistributions: null,
  fleetAssets: null,
  fleetReservations: null,
  engineeringOpen: null,
  fleetDeployments: null,
  fleetConditionAlerts: null,
  threatsOpen: null,
  intelReports: null,
  trainingScenarios: null,
  trainingSimulations: null,
  registryReputation: null,
  registryAchievements: null,
  memberCertifications: null,
  registryMentorLinks: null,
  highCommandVotesOpen: null,
  diplomacyEntries: null,
  alliancesActive: null,
  vaultDocuments: null,
  vaultKnowledge: null,
  vaultArchived: null,
  nexusTutorials: null,
  nexusVideos: null,
  nexusFeedback: null,
  statuses: null,
  inventory: null,
};

function parseFleetStateFromNotes(notes) {
  const text = String(notes || '');
  const regex = /\[fleet_command_state\]([\s\S]*?)\[\/fleet_command_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return { reservations: [], engineering_queue: [] };
  try {
    const parsed = JSON.parse(match[1]);
    return {
      reservations: Array.isArray(parsed?.reservations) ? parsed.reservations : [],
      engineering_queue: Array.isArray(parsed?.engineering_queue) ? parsed.engineering_queue : [],
    };
  } catch {
    return { reservations: [], engineering_queue: [] };
  }
}

function parseRegistryStateFromNotes(notes) {
  const text = String(notes || '');
  const regex = /\[nomad_registry_state\]([\s\S]*?)\[\/nomad_registry_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return { reputation_entries: [], achievements: [], mentor_member_profile_id: null };
  try {
    const parsed = JSON.parse(match[1]);
    return {
      reputation_entries: Array.isArray(parsed?.reputation_entries) ? parsed.reputation_entries : [],
      achievements: Array.isArray(parsed?.achievements) ? parsed.achievements : [],
      mentor_member_profile_id: parsed?.mentor_member_profile_id ? String(parsed.mentor_member_profile_id) : null,
    };
  } catch {
    return { reputation_entries: [], achievements: [], mentor_member_profile_id: null };
  }
}

const safeList = async (entityName, order = '-created_date', limit = 200) => {
  const entity = base44?.entities?.[entityName];
  if (!entity?.list) return [];
  try {
    return (await entity.list(order, limit)) || [];
  } catch (error) {
    console.warn(`[HubMetrics] ${entityName} list failed:`, error?.message);
    return [];
  }
};

function classifyCommsSentiment(message) {
  const ai = String(message?.sentiment || message?.analysis?.sentiment || '').toLowerCase();
  if (ai === 'negative' || ai === 'urgent') return -1;
  if (ai === 'positive') return 1;
  const body = String(message?.content || '').toLowerCase();
  const negativeTokens = ['bad', 'fail', 'failure', 'hostile', 'risk', 'urgent', 'delay'];
  const positiveTokens = ['good', 'great', 'secure', 'success', 'ready', 'clear'];
  let score = 0;
  for (const token of negativeTokens) {
    if (body.includes(token)) score -= 1;
  }
  for (const token of positiveTokens) {
    if (body.includes(token)) score += 1;
  }
  return score;
}

export function useHubMetrics({ enabled = true, refreshMs = 30000 } = {}) {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const now = new Date();

    const [
      members,
      channels,
      voiceNets,
      bridgeSessions,
      events,
      commands,
      missions,
      gameMissions,
      assets,
      incidents,
      eventLogs,
      eventReports,
      eventTemplates,
      polls,
      statuses,
      inventory,
      commsMessages,
    ] = await Promise.all([
      safeList('MemberProfile', '-created_date', 300),
      safeList('Channel', '-created_date', 300),
      safeList('VoiceNet', '-created_date', 200),
      safeList('BridgeSession', '-created_date', 200),
      safeList('Event', '-start_time', 200),
      safeList('TacticalCommand', '-created_date', 200),
      safeList('MissionBoardPost', '-created_date', 200),
      safeList('GameMission', '-created_date', 500),
      safeList('FleetAsset', '-created_date', 300),
      safeList('Incident', '-created_date', 300),
      safeList('EventLog', '-created_date', 400),
      safeList('EventReport', '-created_date', 400),
      safeList('EventTemplate', '-created_date', 300),
      safeList('Poll', '-created_date', 250),
      safeList('PlayerStatus', '-created_date', 300),
      safeList('InventoryItem', '-created_date', 300),
      safeList('Message', '-created_date', 400),
    ]);

    const activeEvents = events.filter((e) => {
      const status = (e.status || '').toString().toLowerCase();
      const phase = (e.phase || '').toString().toUpperCase();
      return status === 'active' || phase === 'ACTIVE';
    });
    const upcomingEvents = events.filter((e) => {
      if (!e.start_time) return false;
      return new Date(e.start_time) > now;
    });

    const openCommands = commands.filter((command) => {
      if (!command?.requires_ack) return false;
      const targets = Array.isArray(command.target_member_profile_ids)
        ? command.target_member_profile_ids
        : Array.isArray(command.target_ids)
          ? command.target_ids
          : [];
      const acknowledgements = Array.isArray(command.acknowledged_by_member_profile_ids)
        ? command.acknowledged_by_member_profile_ids
        : [];
      if (targets.length === 0) {
        return acknowledgements.length === 0;
      }
      return acknowledgements.length < targets.length;
    });

    const openMissions = missions.filter(
      (m) => (m.status || '').toString().toLowerCase() === 'open'
    );

    const reportTemplates = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'REPORT_TEMPLATE_SAVED'
    ).length;
    const reportSchedules = eventLogs.filter((entry) => {
      if (String(entry?.type || '').toUpperCase() !== 'REPORT_SCHEDULED') return false;
      const status = String(entry?.details?.status || 'scheduled').toLowerCase();
      return status === 'scheduled' || status === 'active' || status === '';
    }).length;
    const reportDistributions = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'REPORT_DISTRIBUTION_SENT'
    ).length;

    const scheduleStateById = new Map();
    for (const entry of eventLogs) {
      const type = String(entry?.type || '').toUpperCase();
      const details = entry?.details || {};
      if (type === 'COMMS_SCHEDULED_MESSAGE') {
        const id = String(details?.id || details?.schedule_id || '').trim();
        if (!id) continue;
        const createdAt = new Date(entry?.created_date || 0).getTime();
        const state = scheduleStateById.get(id);
        if (!state || createdAt >= state.at) {
          scheduleStateById.set(id, { status: 'scheduled', at: createdAt });
        }
      }
      if (type === 'COMMS_SCHEDULED_MESSAGE_STATE') {
        const id = String(details?.scheduled_message_id || details?.id || details?.schedule_id || '').trim();
        if (!id) continue;
        const status = String(details?.status || '').toLowerCase() || 'scheduled';
        const createdAt = new Date(entry?.created_date || 0).getTime();
        const state = scheduleStateById.get(id);
        if (!state || createdAt >= state.at) {
          scheduleStateById.set(id, { status, at: createdAt });
        }
      }
    }
    let commsScheduled = 0;
    for (const entry of scheduleStateById.values()) {
      if (entry.status === 'scheduled') commsScheduled += 1;
    }

    const commsBridges = (bridgeSessions || []).filter((bridge) => {
      const status = String(bridge?.status || '').toLowerCase();
      return status === 'active' || status === 'bridging' || status === '';
    }).length;

    const commsNegativeSignals = (commsMessages || []).reduce((count, message) => {
      return classifyCommsSentiment(message) < 0 ? count + 1 : count;
    }, 0);

    const nowMs = Date.now();
    let fleetReservations = 0;
    let engineeringOpen = 0;
    let fleetConditionAlerts = 0;
    let registryReputation = 0;
    let registryAchievements = 0;
    let memberCertifications = 0;
    let registryMentorLinks = 0;
    for (const asset of assets) {
      const assetStatus = String(asset?.status || '').toUpperCase();
      const state = parseFleetStateFromNotes(asset?.maintenance_notes);
      fleetReservations += state.reservations.filter((entry) => {
        const status = String(entry?.status || '').toLowerCase();
        const end = entry?.end_time ? new Date(entry.end_time).getTime() : null;
        return status === 'scheduled' && (!end || end >= nowMs);
      }).length;
      engineeringOpen += state.engineering_queue.filter((task) => {
        const status = String(task?.status || '').toLowerCase();
        return status !== 'resolved' && status !== 'cancelled';
      }).length;
      const criticalOpen = state.engineering_queue.some((task) => {
        const status = String(task?.status || '').toLowerCase();
        const severity = String(task?.severity || '').toLowerCase();
        return status !== 'resolved' && status !== 'cancelled' && (severity === 'critical' || severity === 'high');
      });
      const overdueReservation = state.reservations.some((entry) => {
        const status = String(entry?.status || '').toLowerCase();
        const end = entry?.end_time ? new Date(entry.end_time).getTime() : null;
        return status === 'scheduled' && end && end < nowMs;
      });
      const lowFuel = Number(asset?.fuel_level ?? asset?.fuel ?? -1);
      const lowHealth = Number(asset?.health ?? asset?.hull_integrity ?? -1);
      if (
        assetStatus === 'MAINTENANCE' ||
        assetStatus === 'DESTROYED' ||
        criticalOpen ||
        overdueReservation ||
        (Number.isFinite(lowFuel) && lowFuel >= 0 && lowFuel <= 20) ||
        (Number.isFinite(lowHealth) && lowHealth >= 0 && lowHealth <= 50)
      ) {
        fleetConditionAlerts += 1;
      }
    }
    for (const member of members) {
      const state = parseRegistryStateFromNotes(member?.notes);
      registryReputation += state.reputation_entries.length;
      registryAchievements += state.achievements.length;
      if (state.mentor_member_profile_id) registryMentorLinks += 1;
      const certifications = Array.isArray(member?.certifications)
        ? member.certifications
        : Array.isArray(member?.certification_list)
          ? member.certification_list
          : [];
      memberCertifications += certifications.filter((cert) => {
        if (typeof cert === 'string') return true;
        const status = String(cert?.status || 'active').toLowerCase();
        return status !== 'revoked';
      }).length;
    }

    const openThreats = incidents.filter((incident) => {
      const status = String(incident?.status || '').toLowerCase();
      return status === 'open' || status === 'investigating' || status === 'active';
    }).length;
    const intelReportCount = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'INTEL_REPORT'
    ).length;
    const trainingScenarios = eventTemplates.filter((template) => {
      const tags = Array.isArray(template?.tags)
        ? template.tags.map((tag) => String(tag).toLowerCase())
        : [];
      return tags.includes('war-academy') || tags.includes('scenario');
    }).length;
    const trainingSimulations = events.filter((event) => {
      const tags = Array.isArray(event?.tags)
        ? event.tags.map((tag) => String(tag).toLowerCase())
        : [];
      return tags.includes('training') || tags.includes('simulation') || tags.includes('war-academy');
    }).length;
    const highCommandVotesOpen = polls.filter((poll) => {
      const scope = String(poll?.scope || '').toUpperCase();
      const scopeId = String(poll?.scope_id || '').toUpperCase();
      if (scope !== 'GLOBAL' || scopeId !== 'HIGH_COMMAND') return false;
      if (!poll?.closes_at) return true;
      return new Date(poll.closes_at).getTime() > nowMs;
    }).length;
    const diplomacyEntries = eventLogs.filter((entry) => {
      if (String(entry?.type || '').toUpperCase() !== 'HIGH_COMMAND_DIPLOMACY') return false;
      const status = String(entry?.details?.status || '').toLowerCase();
      return status === 'active' || status === 'pending' || status === '';
    }).length;
    const allianceStatusByName = new Map();
    for (const entry of eventLogs) {
      const type = String(entry?.type || '').toUpperCase();
      if (type !== 'HIGH_COMMAND_ALLIANCE' && type !== 'HIGH_COMMAND_ALLIANCE_STATUS') continue;
      const details = entry?.details || {};
      const name = String(details?.alliance_name || '').trim();
      if (!name) continue;
      const status = String(details?.status || '').toLowerCase() || 'proposed';
      const at = new Date(entry?.created_date || 0).getTime();
      const existing = allianceStatusByName.get(name);
      if (!existing || at >= existing.at) {
        allianceStatusByName.set(name, { status, at });
      }
    }
    let alliancesActive = 0;
    for (const entry of allianceStatusByName.values()) {
      if (entry.status === 'active' || entry.status === 'ratified') alliancesActive += 1;
    }
    const vaultKnowledge = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'DATA_VAULT_KNOWLEDGE'
    ).length;
    const vaultArchiveStateByRecord = new Map();
    for (const entry of eventLogs) {
      if (String(entry?.type || '').toUpperCase() !== 'DATA_VAULT_ARCHIVE_STATE') continue;
      const details = entry?.details || {};
      const recordType = String(details?.record_type || '').toLowerCase() === 'event_log' ? 'event_log' : 'event_report';
      const recordId = String(details?.record_id || '').trim();
      if (!recordId) continue;
      const status = String(details?.status || '').toLowerCase() || 'archived';
      const at = new Date(entry?.created_date || 0).getTime();
      const key = `${recordType}:${recordId}`;
      const existing = vaultArchiveStateByRecord.get(key);
      if (!existing || at >= existing.at) {
        vaultArchiveStateByRecord.set(key, { status, at });
      }
    }
    let vaultArchived = 0;
    for (const entry of vaultArchiveStateByRecord.values()) {
      if (entry.status === 'archived') vaultArchived += 1;
    }
    const vaultDocuments = eventReports.length;
    const nexusTutorials = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'NEXUS_TRAINING_TUTORIAL'
    ).length;
    const nexusVideos = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'NEXUS_TRAINING_VIDEO'
    ).length;
    const nexusFeedback = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'NEXUS_TRAINING_FEEDBACK'
    ).length;
    const fleetDeployments = eventLogs.filter(
      (entry) => String(entry?.type || '').toUpperCase() === 'FLEET_DEPLOYMENT_HISTORY'
    ).length;
    const recentActivity = (eventLogs || []).slice(0, 12).map((entry) => ({
      id: entry?.id || `${entry?.type || 'event'}-${entry?.created_date || ''}`,
      type: String(entry?.type || '').toUpperCase(),
      summary: String(entry?.summary || entry?.details?.title || entry?.details?.name || entry?.type || 'Activity'),
      created_date: entry?.created_date || null,
    }));

    setMetrics({
      lastSync: new Date().toISOString(),
      recentActivity,
      members: members.length,
      channels: channels.length,
      voiceNets: voiceNets.length,
      commsScheduled,
      commsBridges,
      commsNegativeSignals,
      eventsActive: activeEvents.length,
      eventsUpcoming: upcomingEvents.length,
      commandsOpen: openCommands.length,
      commandsTotal: commands.length,
      missionsOpen: openMissions.length,
      contractsOpen: openMissions.length,
      missionCatalogTotal: gameMissions.length,
      reportTemplates,
      reportSchedules,
      reportDistributions,
      fleetAssets: assets.length,
      fleetReservations,
      engineeringOpen,
      fleetDeployments,
      fleetConditionAlerts,
      threatsOpen: openThreats,
      intelReports: intelReportCount,
      trainingScenarios,
      trainingSimulations,
      registryReputation,
      registryAchievements,
      memberCertifications,
      registryMentorLinks,
      highCommandVotesOpen,
      diplomacyEntries,
      alliancesActive,
      vaultDocuments,
      vaultKnowledge,
      vaultArchived,
      nexusTutorials,
      nexusVideos,
      nexusFeedback,
      statuses: statuses.length,
      inventory: inventory.length,
    });
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    let mounted = true;
    if (!enabled) return undefined;

    const run = async () => {
      if (!mounted) return;
      await loadMetrics();
    };

    run();
    const timer = setInterval(run, refreshMs);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [enabled, loadMetrics, refreshMs]);

  return { metrics, loading, refresh: loadMetrics };
}

export default useHubMetrics;
