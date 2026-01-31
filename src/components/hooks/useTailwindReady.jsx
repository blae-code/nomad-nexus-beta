import { useEffect, useState } from 'react';
import { getTailwindSafelistHtml } from '@/components/tailwind/tailwindSafelistHtml';

const TAILWIND_CDN_SRC = 'https://cdn.tailwindcss.com';
const TAILWIND_SCRIPT_SELECTOR = 'script[src*="cdn.tailwindcss.com"]';
const SAFELIST_SELECTOR = '[data-nexus-tailwind-safelist="true"]';
const TAILWIND_PROMISE_KEY = '__NEXUS_TAILWIND_CDN_PROMISE__';

/**
 * Tests if Tailwind utilities are working by checking computed styles
 */
function testTailwindUtility() {
  try {
    const testEl = document.createElement('div');
    testEl.className = 'hidden';
    testEl.style.position = 'absolute';
    testEl.style.visibility = 'hidden';
    document.body.appendChild(testEl);

    const computed = window.getComputedStyle(testEl);
    document.body.removeChild(testEl);

    return computed.display === 'none';
  } catch (err) {
    console.warn('Error testing Tailwind utility:', err);
    return false;
  }
}

function ensureSafelistInjected() {
  if (document.querySelector(SAFELIST_SELECTOR)) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = getTailwindSafelistHtml().trim();
  const safelistNode = wrapper.firstElementChild;

  if (!safelistNode) {
    throw new Error('Tailwind safelist HTML is empty');
  }

  if (!safelistNode.getAttribute('data-nexus-tailwind-safelist')) {
    safelistNode.setAttribute('data-nexus-tailwind-safelist', 'true');
  }

  if (!safelistNode.getAttribute('style')) {
    safelistNode.setAttribute('style', 'display:none');
  }

  document.body.appendChild(safelistNode);
}

function getTailwindScript() {
  return document.querySelector(TAILWIND_SCRIPT_SELECTOR);
}

function createTailwindFailure({ phase, waitedMs }) {
  return {
    phase,
    waitedMs,
    scriptPresent: Boolean(getTailwindScript()),
  };
}

function waitForHiddenUtility({ timeoutMs, startTime, resolve, reject }) {
  const checkReady = () => {
    if (testTailwindUtility()) {
      resolve();
      return true;
    }
    return false;
  };

  if (checkReady()) {
    return;
  }

  let timeoutHandle = null;
  const interval = setInterval(() => {
    if (checkReady()) {
      clearInterval(interval);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }, 50);

  timeoutHandle = setTimeout(() => {
    clearInterval(interval);
    reject(
      createTailwindFailure({
        phase: 'readyCheck',
        waitedMs: Date.now() - startTime,
      }),
    );
  }, timeoutMs);
}

/**
 * Ensures Tailwind CDN is loaded, injecting it if missing
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<void>} Resolves when Tailwind is ready, rejects on failure
 */
export function ensureTailwindCdn({ timeoutMs = 16000 } = {}) {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (globalThis[TAILWIND_PROMISE_KEY]) {
    return globalThis[TAILWIND_PROMISE_KEY];
  }

  globalThis[TAILWIND_PROMISE_KEY] = new Promise((resolve, reject) => {
    const startTime = Date.now();

    const rejectWithPhase = (phase) => {
      reject(
        createTailwindFailure({
          phase,
          waitedMs: Date.now() - startTime,
        }),
      );
    };

    try {
      ensureSafelistInjected();
    } catch (error) {
      console.error('Failed to inject Tailwind safelist:', error);
      rejectWithPhase('inject');
      return;
    }

    if (testTailwindUtility()) {
      resolve();
      return;
    }

    const existingScript = getTailwindScript();

    if (existingScript) {
      waitForHiddenUtility({ timeoutMs, startTime, resolve, reject });
      return;
    }

    try {
      const script = document.createElement('script');
      script.src = TAILWIND_CDN_SRC;
      script.async = false;

      script.onload = () => {
        waitForHiddenUtility({ timeoutMs, startTime, resolve, reject });
      };

      script.onerror = () => {
        rejectWithPhase('load');
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to inject Tailwind CDN script:', error);
      rejectWithPhase('inject');
    }
  });

  return globalThis[TAILWIND_PROMISE_KEY];
}

/**
 * useTailwindReady - Detects if Tailwind styles are loaded (bundled or CDN) by testing computed styles
 * @param {number} timeoutMs - Timeout in milliseconds (default 8000)
 * @returns {object} { ready: boolean, error: string | null, waiting: boolean }
 */
export function useTailwindReady({ timeoutMs = 16000 } = {}) {
  const initialReady = typeof window !== 'undefined' && testTailwindUtility();
  const [ready, setReady] = useState(initialReady);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(!initialReady);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (ready) {
      return undefined;
    }

    let isMounted = true;
    const startTime = Date.now();
    const elapsedTimer = setInterval(() => {
      if (!isMounted) return;
      setElapsed(Date.now() - startTime);
    }, 100);

    ensureTailwindCdn({ timeoutMs })
      .then(() => {
        if (!isMounted) return;
        setReady(true);
        setWaiting(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
        setWaiting(false);
        setElapsed(Date.now() - startTime);
      });

    return () => {
      isMounted = false;
      clearInterval(elapsedTimer);
    };
  }, [ready, timeoutMs]);

  return { ready, error, waiting, elapsed, hasHiddenUtility: ready };
}
