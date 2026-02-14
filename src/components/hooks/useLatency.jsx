/**
 * Latency Hook
 * Measures connection latency using a shared app-wide monitor
 */

import { useState, useEffect } from 'react';
import * as latencyProbe from '@/components/services/latencyProbe';

const LATENCY_PROBE_INTERVAL_MS = 20000; // 20 seconds

/**
 * useLatency
 * Measures and tracks connection latency
 * @param {Object} [config] - { intervalMs, enabled }
 * @returns {Object} - { latencyMs, isHealthy, error, lastMeasuredAt }
 */
export function useLatency(config = {}) {
  const { intervalMs = LATENCY_PROBE_INTERVAL_MS, enabled = true } = config;
  const [latencyState, setLatencyState] = useState(() => latencyProbe.getLatencyState());

  useEffect(() => {
    if (!enabled) return undefined;

    const unsubscribe = latencyProbe.subscribeLatencyState((nextState) => {
      setLatencyState(nextState);
    });
    latencyProbe.retainLatencyMonitor(intervalMs);

    return () => {
      unsubscribe();
      latencyProbe.releaseLatencyMonitor();
    };
  }, [enabled, intervalMs]);

  return latencyState;
}

export default useLatency;
