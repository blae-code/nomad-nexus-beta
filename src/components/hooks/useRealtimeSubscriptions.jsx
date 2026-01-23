import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to subscribe to real-time updates for entities
 * Replaces polling with efficient event-driven invalidations
 */
export function useRealtimeSubscription(entityName, queryKeys = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const entityType = base44.entities[entityName];
    if (!entityType) return;

    const unsubscribe = entityType.subscribe((event) => {
      // Invalidate affected queries on any entity change
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    });

    return () => unsubscribe?.();
  }, [entityName, queryKeys, queryClient]);
}

/**
 * Hook to batch subscribe to multiple entity types
 */
export function useMultipleRealtimeSubscriptions(subscriptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribers = subscriptions.map(({ entityName, queryKeys }) => {
      const entityType = base44.entities[entityName];
      if (!entityType) return null;

      return entityType.subscribe((event) => {
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      });
    }).filter(Boolean);

    return () => unsubscribers.forEach(unsub => unsub?.());
  }, [subscriptions, queryClient]);
}