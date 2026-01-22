import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

// Centralized user data hook
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);
  
  return user;
}

// Centralized dashboard data hook - fetches all data in parallel
export function useDashboardData(user) {
  return useQuery({
    queryKey: ['dashboard-data', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch all data in parallel
      const [
        events,
        squadMemberships,
        fleetAssets,
        activeIncidents,
        onlineUsers,
        allUsers,
        voiceNets,
        recentLogs,
        recentMessages,
        treasuryData
      ] = await Promise.all([
        base44.entities.Event.filter({ status: ['active', 'pending', 'scheduled'] }, '-updated_date', 10),
        base44.entities.SquadMembership.filter({ user_id: user.id, status: 'active' }),
        base44.entities.FleetAsset.filter({ status: 'operational' }, '-updated_date', 5).catch(() => []),
        base44.entities.Incident.filter({ status: ['active', 'responding'] }, '-created_date', 3),
        fetchOnlineUsers(),
        base44.entities.User.list(),
        base44.entities.VoiceNet.filter({ status: 'active' }),
        base44.entities.EventLog.filter({}, '-created_date', 10),
        base44.entities.Message.list('-created_date', 5),
        fetchTreasury().catch(() => 0)
      ]);

      // Fetch squads for memberships
      const squadIds = squadMemberships.map(m => m.squad_id);
      const squads = squadIds.length > 0
        ? await Promise.all(squadIds.map(id => base44.entities.Squad.get(id).catch(() => null)))
        : [];

      return {
        events,
        squadMemberships,
        squads: squads.filter(Boolean),
        fleetAssets,
        activeIncidents,
        onlineUsers,
        allUsers,
        voiceNets,
        recentLogs,
        recentMessages,
        treasuryBalance: treasuryData
      };
    },
    enabled: !!user,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Helper: Fetch online users
async function fetchOnlineUsers() {
  const presences = await base44.entities.UserPresence.filter({ status: ['online', 'in-call'] });
  const now = new Date();
  return presences.filter(p => {
    if (!p.last_activity) return true;
    const lastActivity = new Date(p.last_activity);
    const diffSeconds = (now - lastActivity) / 1000;
    return diffSeconds < 30;
  });
}

// Helper: Fetch treasury
async function fetchTreasury() {
  const coffers = await base44.entities.Coffer.list();
  return coffers.reduce((sum, c) => sum + (c.balance || 0), 0);
}

// Event-specific data hook
export function useEventData(eventId) {
  return useQuery({
    queryKey: ['event-data', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const [event, logs, nets, participants] = await Promise.all([
        base44.entities.Event.get(eventId),
        base44.entities.EventLog.filter({ event_id: eventId }, '-created_date', 20),
        base44.entities.VoiceNet.filter({ event_id: eventId }),
        base44.entities.PlayerStatus.filter({ event_id: eventId })
      ]);

      return { event, logs, nets, participants };
    },
    enabled: !!eventId,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// Comms data hook
export function useCommsData(eventId = null) {
  return useQuery({
    queryKey: ['comms-data', eventId],
    queryFn: async () => {
      const filterQuery = eventId ? { event_id: eventId } : { status: 'active' };
      
      const [nets, presences, messages] = await Promise.all([
        base44.entities.VoiceNet.filter(filterQuery),
        base44.entities.UserPresence.filter({}),
        base44.entities.Message.list('-created_date', 20)
      ]);

      return { nets, presences, messages };
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });
}