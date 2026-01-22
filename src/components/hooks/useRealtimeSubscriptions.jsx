import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Centralized subscription manager for real-time updates
export function useRealtimeSubscriptions(options = {}) {
  const queryClient = useQueryClient();
  const { enabled = true, entities = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const subscriptions = [];

    // Subscribe to entities based on options
    if (entities.includes('UserPresence')) {
      const unsubPresence = base44.entities.UserPresence.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        queryClient.invalidateQueries({ queryKey: ['comms-data'] });
      });
      subscriptions.push(unsubPresence);
    }

    if (entities.includes('Event')) {
      const unsubEvent = base44.entities.Event.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        queryClient.invalidateQueries({ queryKey: ['event-data'] });
      });
      subscriptions.push(unsubEvent);
    }

    if (entities.includes('EventLog')) {
      const unsubLog = base44.entities.EventLog.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['event-data'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      });
      subscriptions.push(unsubLog);
    }

    if (entities.includes('Incident')) {
      const unsubIncident = base44.entities.Incident.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      });
      subscriptions.push(unsubIncident);
    }

    if (entities.includes('Message')) {
      const unsubMessage = base44.entities.Message.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['comms-data'] });
      });
      subscriptions.push(unsubMessage);
    }

    if (entities.includes('VoiceNet')) {
      const unsubNet = base44.entities.VoiceNet.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['comms-data'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      });
      subscriptions.push(unsubNet);
    }

    // Cleanup all subscriptions
    return () => {
      subscriptions.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.warn('Subscription cleanup error:', error);
        }
      });
    };
  }, [enabled, entities.join(','), queryClient]);
}