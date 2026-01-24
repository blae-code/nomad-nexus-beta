import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCommsMode } from './useCommsMode';

/**
 * Determines the effective comms mode with failover logic.
 * If LIVE fails (env, token, join), falls back to SIM with explicit reason.
 * Returns: { effectiveMode, fallbackReason, retryLive, desiredLive, isReady }
 */
export function useCommsReadiness() {
  const { isLive: desiredLive } = useCommsMode();
  const queryClient = useQueryClient();
  const [sessionFailover, setSessionFailover] = React.useState(null);

  // Query to verify LIVE readiness (check env, token minting capability, etc.)
  const { data: readinessData = {}, refetch } = useQuery({
    queryKey: ['comms-readiness'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('verifyCommsReadiness', {});
        return result?.data || { isReady: false, reason: 'Unknown error' };
      } catch (error) {
        return {
          isReady: false,
          reason: error?.message || 'Readiness check failed'
        };
      }
    },
    staleTime: 30000,
    refetchInterval: desiredLive && !sessionFailover ? 60000 : false, // Stop polling if session failover active
    enabled: desiredLive
  });

  React.useEffect(() => {
    const obs = window.__observability;
    if (!obs?.setLiveKitEnv) return;
    if (!readinessData || Object.keys(readinessData).length === 0) return;

    obs.setLiveKitEnv({
      status: readinessData.envStatus || (readinessData.isReady ? 'configured' : 'unknown'),
      missingVars: readinessData.missingVars || [],
      warning: readinessData.warning,
      reason: readinessData.reason
    });
  }, [readinessData]);

  // Determine effective mode
  let effectiveMode = 'SIM';
  let fallbackReason = null;

  if (desiredLive) {
    if (sessionFailover) {
      // Session-level failover is active
      effectiveMode = 'SIM';
      fallbackReason = sessionFailover;
    } else if (readinessData?.isReady) {
      effectiveMode = 'LIVE';
    } else {
      effectiveMode = 'SIM';
      fallbackReason = readinessData?.reason || 'LIVE readiness check failed';
    }
  }

  // Retry LIVE: clear session failover and refetch readiness
  const retryLive = React.useCallback(() => {
    setSessionFailover(null);
    refetch();
  }, [refetch]);

  // Mark session failover (called when connect attempt fails)
  const markFailover = React.useCallback((reason) => {
    setSessionFailover(reason);
  }, []);

  return {
    effectiveMode,
    fallbackReason,
    retryLive,
    markFailover,
    desiredLive,
    isReady: readinessData?.isReady || false
  };
}
