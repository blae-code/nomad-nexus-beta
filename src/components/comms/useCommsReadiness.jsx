import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCommsMode } from './useCommsMode';

/**
 * Determines the effective comms mode by checking if LIVE is truly ready.
 * Returns: { effectiveMode: 'LIVE' | 'SIM', fallbackReason: string | null }
 */
export function useCommsReadiness() {
  const { isLive: desiredLive } = useCommsMode();

  // Query to verify LIVE readiness (check env, token minting capability, etc.)
  const { data: readinessData = {} } = useQuery({
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
    staleTime: 30000, // Recheck every 30 seconds
    refetchInterval: 60000, // Refetch every minute
    enabled: desiredLive // Only check if LIVE is desired
  });

  // Determine effective mode
  const effectiveMode = desiredLive && readinessData?.isReady ? 'LIVE' : 'SIM';
  const fallbackReason = effectiveMode === 'SIM' && desiredLive ? readinessData?.reason : null;

  return {
    effectiveMode,
    fallbackReason,
    desiredLive,
    isReady: readinessData?.isReady || false
  };
}