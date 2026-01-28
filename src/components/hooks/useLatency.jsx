/**
 * Latency Hook
 * Measures connection latency periodically; visibility-aware
 */

import { useState, useEffect, useRef } from 'react';
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
  const probeIntervalRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const probe = async () => {
      try {
        const measured = await latencyProbe.measureLatency();
        latencyProbe.updateLatency(measured);
        setLatencyState(latencyProbe.getLatencyState());
      } catch (error) {
        console.error('[useLatency] Probe failed:', error);
        latencyProbe.recordLatencyError(error);
        setLatencyState(latencyProbe.getLatencyState());
      }
    };

    // Probe immediately
    probe();

    // Probe on interval
    probeIntervalRef.current = setInterval(probe, intervalMs);

    // Pause probing when tab hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (probeIntervalRef.current) {
          clearInterval(probeIntervalRef.current);
          probeIntervalRef.current = null;
        }
      } else {
        probe();
        probeIntervalRef.current = setInterval(probe, intervalMs);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (probeIntervalRef.current) {
        clearInterval(probeIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs]);

  return latencyState;
}

export default useLatency;