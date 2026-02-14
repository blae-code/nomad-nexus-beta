import { useCallback, useRef, useState } from 'react';
import type { NexusAppLifecycleEntry, NexusAppLifecycleState } from './appLifecycle';

export interface NexusPerformanceSample {
  id: string;
  label: string;
  appId: string;
  state: NexusAppLifecycleState;
  durationMs: number;
  capturedAt: string;
}

const THROTTLE_MULTIPLIER_BY_STATE: Record<NexusAppLifecycleState, number> = {
  foreground: 1,
  background: 2.5,
  suspended: 6,
  error: 4,
  closed: 8,
};

function perfNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function createSampleId(): string {
  return `nx_perf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function resolveLifecycleThrottleMs(baseMs: number, state: NexusAppLifecycleState): number {
  const safeBase = Math.max(1000, baseMs);
  const multiplier = THROTTLE_MULTIPLIER_BY_STATE[state] || 1;
  return Math.round(safeBase * multiplier);
}

export function shouldRunLifecycleWork(state: NexusAppLifecycleState): boolean {
  return state !== 'suspended' && state !== 'closed';
}

export function useNexusBackgroundPerformance(input: {
  entries: Record<string, NexusAppLifecycleEntry>;
  enabled?: boolean;
  sampleLimit?: number;
  slowThresholdMs?: number;
  onSlowSample?: (sample: NexusPerformanceSample) => void;
}) {
  const enabled = Boolean(input.enabled);
  const sampleLimit = Math.max(6, input.sampleLimit || 20);
  const slowThresholdMs = Math.max(8, input.slowThresholdMs || 18);
  const onSlowSampleRef = useRef(input.onSlowSample);
  onSlowSampleRef.current = input.onSlowSample;

  const [recentSamples, setRecentSamples] = useState<NexusPerformanceSample[]>([]);

  const getState = useCallback(
    (appId: string): NexusAppLifecycleState => input.entries[appId]?.state || 'closed',
    [input.entries]
  );

  const getThrottleMs = useCallback(
    (appId: string, baseMs: number) => resolveLifecycleThrottleMs(baseMs, getState(appId)),
    [getState]
  );

  const shouldRunWork = useCallback((appId: string) => shouldRunLifecycleWork(getState(appId)), [getState]);

  const captureSample = useCallback(
    (sample: NexusPerformanceSample) => {
      if (!enabled) return;
      setRecentSamples((prev) => [sample, ...prev].slice(0, sampleLimit));
      if (sample.durationMs >= slowThresholdMs) {
        onSlowSampleRef.current?.(sample);
      }
    },
    [enabled, sampleLimit, slowThresholdMs]
  );

  const profileSync = useCallback(
    <T,>(label: string, appId: string, fn: () => T): T => {
      const state = getState(appId);
      const startedAt = perfNow();
      const result = fn();
      const durationMs = Number((perfNow() - startedAt).toFixed(2));
      captureSample({
        id: createSampleId(),
        label,
        appId,
        state,
        durationMs,
        capturedAt: new Date().toISOString(),
      });
      return result;
    },
    [captureSample, getState]
  );

  const profileAsync = useCallback(
    async <T,>(label: string, appId: string, fn: () => Promise<T>): Promise<T> => {
      const state = getState(appId);
      const startedAt = perfNow();
      const result = await fn();
      const durationMs = Number((perfNow() - startedAt).toFixed(2));
      captureSample({
        id: createSampleId(),
        label,
        appId,
        state,
        durationMs,
        capturedAt: new Date().toISOString(),
      });
      return result;
    },
    [captureSample, getState]
  );

  return {
    getThrottleMs,
    shouldRunWork,
    profileSync,
    profileAsync,
    recentSamples,
  };
}
