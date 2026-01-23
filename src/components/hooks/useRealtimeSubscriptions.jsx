import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to subscribe to real-time updates for multiple entity types
 * Replaces polling with efficient event-driven invalidations
 */
export function useRealtimeSubscriptions({ enabled = true, entities = [] }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !entities.length) return;

    const unsubscribers = entities.map(entityName => {
      const entityType = base44.entities[entityName];
      if (!entityType) return null;

      return entityType.subscribe(() => {
        // Invalidate all queries for this entity type
        queryClient.invalidateQueries({ queryKey: [entityName.toLowerCase()] });
      });
    }).filter(Boolean);

    return () => unsubscribers.forEach(unsub => unsub?.());
  }, [enabled, entities, queryClient]);
}