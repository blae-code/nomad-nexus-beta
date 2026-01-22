/**
 * Optimized React Query default configuration
 * Reduces unnecessary refetches and network requests
 */
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds - data considered fresh
      cacheTime: 300000, // 5 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      retry: 1, // Only retry failed requests once
      retryDelay: 1000, // 1 second between retries
    },
  },
};

/**
 * Config for real-time data (presence, comms, incidents)
 */
export const realtimeQueryConfig = {
  staleTime: 0,
  cacheTime: 60000,
  refetchInterval: 5000,
  refetchOnWindowFocus: true,
};

/**
 * Config for static/rarely changing data (users, squads, assets)
 */
export const staticQueryConfig = {
  staleTime: 300000, // 5 minutes
  cacheTime: 600000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};