import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

/**
 * Centralized user data hook - single source of truth
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 5000)
    );

    Promise.race([
      base44.auth.me(),
      timeoutPromise
    ])
      .then((resolvedUser) => {
        if (isMounted) {
          setUser(resolvedUser);
        }
      })
      .catch((err) => {
        console.error('[useCurrentUser] Auth failed or timed out:', err);
        if (isMounted) {
          setUser(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return user;
}

/**
 * Centralized hook for dashboard data - batches all queries
 */
export function useDashboardData(user) {
  // Batch query with staggered requests to avoid rate limits
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-data', user?.id],
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Refetch every 60s instead of continuously
    queryFn: async () => {
      if (!user) return null;

      try {
        // Batch 1: Essential data (non-user-specific)
        const [events, allUsers, voiceNets, recentLogs] = await Promise.all([
          base44.entities.Event.list('-updated_date', 8).catch(() => []),
          base44.entities.User.list().catch(() => []),
          base44.entities.VoiceNet.filter({ status: 'active' }, null, 5).catch(() => []),
          base44.entities.EventLog.list('-created_date', 15).catch(() => [])
        ]);

        // Small delay before Batch 2
        await new Promise(r => setTimeout(r, 100));

        // Batch 2: User-specific data
        const [squadMemberships, onlineUsers, activeIncidents] = await Promise.all([
          base44.entities.SquadMembership.filter({ user_id: user.id, status: 'active' }, null, 5).catch(() => []),
          base44.entities.UserPresence.filter({ status: ['online', 'in-call'] }, null, 10).catch(() => []),
          base44.entities.Incident.filter({ status: ['active', 'responding'] }, '-created_date', 3).catch(() => [])
        ]);

        // Small delay before Batch 3
        await new Promise(r => setTimeout(r, 100));

        // Batch 3: Optional/supplementary data
        const [fleetAssets, treasuryCoffers] = await Promise.all([
          base44.entities.FleetAsset.list('-updated_date', 5).catch(() => []),
          base44.entities.Coffer.list().catch(() => [])
        ]);

        // Fetch squads with timeout
        const squadIds = squadMemberships.map(m => m.squad_id).slice(0, 3);
        let userSquads = [];
        if (squadIds.length > 0) {
          try {
            userSquads = await Promise.race([
              Promise.all(squadIds.map(id => base44.entities.Squad.get(id).catch(() => null))),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]).catch(() => []);
          } catch (err) {
            userSquads = [];
          }
        }

        // Calculate treasury balance
        const treasuryBalance = treasuryCoffers.reduce((sum, c) => sum + (c.balance || 0), 0);

        // Filter online users
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
          squads: userSquads.filter(Boolean),
          fleetAssets,
          recentMessages: [], // Minimal messages for now
          activeIncidents,
          onlineUsers: activeUsers,
          allUsers,
          voiceNets,
          recentLogs,
          treasuryBalance
        };
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        return {
          events: [],
          squadMemberships: [],
          squads: [],
          fleetAssets: [],
          recentMessages: [],
          activeIncidents: [],
          onlineUsers: [],
          allUsers: [],
          voiceNets: [],
          recentLogs: [],
          treasuryBalance: 0
        };
      }
    },
    enabled: !!user
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
    staleTime: 5000,
    cacheTime: 60000,
    refetchOnWindowFocus: false
  });

  return { data, isLoading };
}
