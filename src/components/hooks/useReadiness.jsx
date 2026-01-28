/**
 * Readiness Hook
 * Derives and tracks system readiness from presence + latency
 */

import { useState, useEffect } from 'react';
import { usePresenceHeartbeat } from '@/components/hooks/usePresenceHeartbeat';
import { useLatency } from '@/components/hooks/useLatency';
import { deriveReadiness, READINESS_STATE } from '@/components/utils/readiness';

/**
 * useReadiness
 * Combines presence heartbeat + latency into readiness state
 * @param {Object} [config] - { enabled }
 * @returns {Object} - { state, reason, context, lastCheckedAt }
 */
export function useReadiness(config = {}) {
  const { enabled = true } = config;

  const { lastWrite } = usePresenceHeartbeat({ enabled });
  const { latencyMs, isHealthy, error, lastMeasuredAt } = useLatency({ enabled });
  const [readiness, setReadiness] = useState({
    state: READINESS_STATE.READY,
    reason: 'Initializing...',
    context: {},
    lastCheckedAt: null,
  });

  useEffect(() => {
    if (!enabled) return;

    const presenceData = {
      lastWriteSuccess: lastWrite.success,
      lastWriteAt: lastWrite.at,
      writeFailureCount: lastWrite.failureCount,
    };

    const latencyData = {
      latencyMs,
      isHealthy,
      error,
      lastMeasuredAt,
    };

    const snapshot = deriveReadiness(presenceData, latencyData);
    setReadiness({
      ...snapshot,
      lastCheckedAt: new Date().toISOString(),
    });
  }, [enabled, lastWrite.success, lastWrite.at, lastWrite.failureCount, latencyMs, isHealthy, error, lastMeasuredAt]);

  return readiness;
}

export default useReadiness;