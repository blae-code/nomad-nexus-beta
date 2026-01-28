import { useQuery } from '@tanstack/react-query';
import { useVisibilityPause } from './useVisibilityPause';
import { useExponentialBackoff } from './useExponentialBackoff';

/**
 * Query wrapper with bounded results (limit + sort), visibility pausing, and exponential backoff.
 * Replaces unbounded list() calls with efficient bounded queries.
 */
export function useBoundedQuery(
  queryKey,
  queryFn,
  {
    limit = 50,
    sort = '-created_date',
    enabled = true,
    staleTime = 30000,
    gcTime = 5 * 60 * 1000,
    retryDelay = 1000,
    ...options
  } = {}
) {
  const isTabVisible = useVisibilityPause();
  const { getDelay, resetAttempts } = useExponentialBackoff(5);

  return useQuery({
    queryKey,
    queryFn: () => queryFn({ limit, sort }),
    enabled: enabled && isTabVisible,
    staleTime,
    gcTime,
    retry: (failureCount, error) => {
      // Don't retry network errors with 400+ status
      if (error?.response?.status >= 400 && error.response.status < 500) {
        return false;
      }
      return failureCount < 5;
    },
    retryDelay: ({ attemptIndex }) => {
      const delay = getDelay();
      return delay || Infinity;
    },
    ...options
  });
}