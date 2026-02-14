import { useEffect, useRef } from 'react';

/**
 * Dev-only lightweight render profiler.
 * Logs slow renders to help detect accidental O(N^2) UI paths.
 */
export function useRenderProfiler(componentName: string, thresholdMs = 22) {
  const startedAt = useRef(0);
  startedAt.current = performance.now();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const elapsed = performance.now() - startedAt.current;
    if (elapsed <= thresholdMs) return;
    console.info(`[NexusOS][RenderProfiler] ${componentName} render ${elapsed.toFixed(1)}ms`);
  });
}

