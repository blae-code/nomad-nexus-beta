import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_METRICS = {
  lastSync: null,
  members: null,
  channels: null,
  voiceNets: null,
  eventsActive: null,
  eventsUpcoming: null,
  commandsOpen: null,
  commandsTotal: null,
  missionsOpen: null,
  fleetAssets: null,
  statuses: null,
  inventory: null,
};

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
      events,
      commands,
      missions,
      assets,
      statuses,
      inventory,
    ] = await Promise.all([
      safeList('MemberProfile', '-created_date', 300),
      safeList('Channel', '-created_date', 300),
      safeList('VoiceNet', '-created_date', 200),
      safeList('Event', '-start_time', 200),
      safeList('TacticalCommand', '-created_date', 200),
      safeList('MissionBoardPost', '-created_date', 200),
      safeList('FleetAsset', '-created_date', 300),
      safeList('PlayerStatus', '-created_date', 300),
      safeList('InventoryItem', '-created_date', 300),
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

    setMetrics({
      lastSync: new Date().toISOString(),
      members: members.length,
      channels: channels.length,
      voiceNets: voiceNets.length,
      eventsActive: activeEvents.length,
      eventsUpcoming: upcomingEvents.length,
      commandsOpen: openCommands.length,
      commandsTotal: commands.length,
      missionsOpen: openMissions.length,
      fleetAssets: assets.length,
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
