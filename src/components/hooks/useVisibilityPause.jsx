import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Pause React Query polling when tab is hidden, resume when visible.
 * Reduces wasted network calls during idle periods.
 */
export function useVisibilityPause() {
  const queryClient = useQueryClient();
  const visibilityRef = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden;

      if (document.hidden) {
        // Tab hidden: pause active queries
        queryClient.cancelQueries();
      } else {
        // Tab visible: resume queries
        queryClient.refetchQueries({ type: 'active' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);

  return visibilityRef.current;
}