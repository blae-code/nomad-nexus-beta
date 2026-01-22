import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Centralized real-time subscription manager
 * Prevents duplicate subscriptions and manages cleanup
 */
export function useRealtimeSubscriptions({ enabled = true, entities = [] }) {
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef(new Map());

  useEffect(() => {
    if (!enabled || entities.length === 0) return;

    const unsubscribers = [];

    entities.forEach(entityName => {
      // Prevent duplicate subscriptions
      if (subscriptionsRef.current.has(entityName)) return;

      try {
        const unsubscribe = base44.entities[entityName].subscribe((event) => {
          // Invalidate all queries for this entity
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.toLowerCase().includes(entityName.toLowerCase());
            }
          });
        });

        subscriptionsRef.current.set(entityName, unsubscribe);
        unsubscribers.push(() => {
          unsubscribe();
          subscriptionsRef.current.delete(entityName);
        });
      } catch (error) {
        console.warn(`Failed to subscribe to ${entityName}:`, error);
      }
    });

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [enabled, entities.join(','), queryClient]);
}