import { useEffect, useState } from 'react';

/**
 * No-op compatibility export for Base44 infrastructure
 * Tailwind is managed by Base44, no injection needed
 */
export function ensureTailwindCdn() {
  return Promise.resolve();
}

/**
 * Passive Tailwind detection - trusts Base44 infrastructure
 * No injection, no safelist, no style verification
 */
function detectTailwind() {
  if (typeof window === 'undefined') return false;
  
  // Fast O(1) checks
  const hasScript = Boolean(document.querySelector('script[src*="cdn.tailwindcss.com"]'));
  const hasGlobal = typeof window.tailwind !== 'undefined';
  
  return hasScript || hasGlobal;
}

/**
 * Two-tier readiness: DOM-ready (fast) + App-ready (beacon or fallback)
 */
function checkAppReady() {
  // Tier A: DOM-ready
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    return false;
  }
  
  const root = document.getElementById('root');
  if (!root) return false;
  
  // Tier B: App-ready (prefer beacon)
  const beacon = document.getElementById('nn-ready');
  if (beacon) return true;
  
  // Fallback: React mounted (root has children)
  return root.children.length > 0;
}

/**
 * useTailwindReady - Passive detection with fast readiness contract
 * @param {number} timeoutMs - Timeout in milliseconds (default 3000)
 * @returns {object} { ready: boolean, error: string | null, waiting: boolean }
 */
export function useTailwindReady({ timeoutMs = 3000 } = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const checkReady = () => {
      if (!isMounted) return false;
      
      const tailwindPresent = detectTailwind();
      const appReady = checkAppReady();
      
      if (tailwindPresent && appReady) {
        setReady(true);
        setWaiting(false);
        return true;
      }
      return false;
    };

    // Immediate check
    if (checkReady()) return;

    // Fast polling (100ms)
    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!isMounted) return;
      
      setError({
        phase: 'timeout',
        waitedMs: Date.now() - startTime,
        tailwindPresent: detectTailwind(),
        appReady: checkAppReady(),
      });
      setWaiting(false);
    }, timeoutMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [timeoutMs]);

  return { ready, error, waiting };
}