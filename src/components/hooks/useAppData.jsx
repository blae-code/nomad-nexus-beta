import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

/**
 * Centralized user data hook - single source of truth
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return user;
}

/**
 * Centralized hook for dashboard data - batches all queries
 */
export function useDashboardData(user) {
  // Single batch query for all dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-data', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch everything in parallel
      const [
        events,
        squadMemberships,
        fleetAssets,
        activeIncidents,
        onlineUsers,
        allUsers,
        voiceNets,
        recentLogs,
        treasuryCoffers
      ] = await Promise.all([
        base44.entities.Event.filter({ status: ['active', 'pending', 'scheduled'] }, '-updated_date', 10),
        base44.entities.SquadMembership.filter({ user_id: user.id, status: 'active' }),
        base44.entities.FleetAsset.filter({ status: 'operational' }, '-updated_date', 5),
        base44.entities.Incident.filter({ status: ['active', 'responding'] }, '-created_date', 3),
        base44.entities.UserPresence.filter({ status: ['online', 'in-call'] }),
        base44.entities.User.list(),
        base44.entities.VoiceNet.filter({ status: 'active' }),
        base44.entities.EventLog.list('-created_date', 10),
        base44.entities.Coffer.list().catch(() => [])
      ]);

      // Fetch squads for memberships
      const squadIds = squadMemberships.map(m => m.squad_id);
      const userSquads = squadIds.length > 0 
        ? await Promise.all(squadIds.map(id => base44.entities.Squad.get(id).catch(() => null)))
        : [];

      // Calculate treasury balance
      const treasuryBalance = treasuryCoffers.reduce((sum, c) => sum + (c.balance || 0), 0);

      // Filter online users (active in last 30s)
      const now = new Date();
      const activeUsers = onlineUsers.filter(p => {
        if (!p.last_activity) return true;
        const lastActivity = new Date(p.last_activity);
        const diffSeconds = (now - lastActivity) / 1000;
        return diffSeconds < 30;
      });

      return {
        events,
        squadMemberships,
        userSquads: userSquads.filter(Boolean),
        fleetAssets,
        activeIncidents,
        onlineUsers: activeUsers,
        allUsers,
        voiceNets,
        recentLogs,
        treasuryBalance
      };
    },
    enabled: !!user,
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000 // 15 seconds
  });

  return { data, isLoading, error };
}

/**
 * Real-time presence updates
 */
export function usePresenceUpdates() {
  const [presences, setPresences] = useState([]);

  useEffect(() => {
    // Initial fetch
    base44.entities.UserPresence.filter({ status: ['online', 'in-call'] })
      .then(setPresences)
      .catch(() => setPresences([]));

    // Subscribe to updates
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      setPresences(prev => {
        if (event.type === 'create') {
          return [...prev, event.data];
        } else if (event.type === 'update') {
          return prev.map(p => p.id === event.id ? event.data : p);
        } else if (event.type === 'delete') {
          return prev.filter(p => p.id !== event.id);
        }
        return prev;
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return presences;
}

/**
 * Event-specific data hook
 */
export function useEventData(eventId) {
  const { data, isLoading } = useQuery({
    queryKey: ['event-data', eventId],
    queryFn: async () => {
      const [event, logs, nets, participants] = await Promise.all([
        base44.entities.Event.get(eventId),
        base44.entities.EventLog.filter({ event_id: eventId }, '-created_date', 50),
        base44.entities.VoiceNet.filter({ event_id: eventId }),
        base44.entities.PlayerStatus.filter({ event_id: eventId })
      ]);

      return { event, logs, nets, participants };
    },
    enabled: !!eventId,
    staleTime: 5000
  });

  return { data, isLoading };
}