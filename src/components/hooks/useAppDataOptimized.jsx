import { useQueries, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useVisibilityPause } from './useVisibilityPause';

/**
 * Optimized app data fetching hook with:
 * - Bounded queries (limit + sort)
 * - Visibility-aware pausing
 * - Stale times to prevent network churn
 * - Preference for realtime subscriptions where possible
 */
export function useDashboardDataOptimized(user) {
  const isTabVisible = useVisibilityPause();

  // Parallel queries with bounds
  const queries = useQueries({
    queries: [
      // Recent events (limit 50, sorted by updated_date desc)
      {
        queryKey: ['dashboard-events'],
        queryFn: async () => {
          if (!user?.id) return [];
          return base44.entities.Event.filter(
            { phase: { $ne: 'ARCHIVED' } },
            '-updated_date',
            50
          );
        },
        enabled: !!user && isTabVisible,
        staleTime: 30000,
        gcTime: 5 * 60 * 1000
      },

      // Recent event logs (limit 50)
      {
        queryKey: ['dashboard-event-logs'],
        queryFn: async () => {
          return base44.entities.EventLog.filter(
            {},
            '-created_date',
            50
          );
        },
        enabled: isTabVisible,
        staleTime: 20000,
        gcTime: 5 * 60 * 1000
      },

      // Active incidents (limit 30)
      {
        queryKey: ['dashboard-incidents'],
        queryFn: async () => {
          return base44.entities.Incident.filter(
            { status: { $ne: 'resolved' } },
            '-created_date',
            30
          );
        },
        enabled: isTabVisible,
        staleTime: 15000,
        gcTime: 5 * 60 * 1000
      },

      // Online users (limit 100)
      {
        queryKey: ['dashboard-online-users'],
        queryFn: async () => {
          return base44.entities.User.filter(
            {},
            '-updated_date',
            100
          );
        },
        enabled: isTabVisible,
        staleTime: 60000,
        gcTime: 5 * 60 * 1000
      },

      // Voice nets (limit 20)
      {
        queryKey: ['dashboard-voice-nets'],
        queryFn: async () => {
          return base44.entities.VoiceNet.filter(
            { status: 'active' },
            '-created_date',
            20
          );
        },
        enabled: isTabVisible,
        staleTime: 30000,
        gcTime: 5 * 60 * 1000
      },

      // Recent messages (limit 30)
      {
        queryKey: ['dashboard-recent-messages'],
        queryFn: async () => {
          return base44.entities.Message.filter(
            {},
            '-created_date',
            30
          );
        },
        enabled: isTabVisible,
        staleTime: 20000,
        gcTime: 5 * 60 * 1000
      }
    ]
  });

  const [eventsQuery, logsQuery, incidentsQuery, usersQuery, netsQuery, messagesQuery] = queries;

  return {
    events: eventsQuery.data || [],
    eventLogs: logsQuery.data || [],
    incidents: incidentsQuery.data || [],
    users: usersQuery.data || [],
    voiceNets: netsQuery.data || [],
    messages: messagesQuery.data || [],
    isLoading: eventsQuery.isLoading || logsQuery.isLoading,
    isTabVisible
  };
}