import { useEffect, useState } from 'react';

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

/**
 * useTailwindReady - Detects if Tailwind styles are loaded (bundled or CDN) by testing computed styles
 * @param {number} timeoutMs - Timeout in milliseconds (default 8000)
 * @returns {object} { ready: boolean, error: string | null, waiting: boolean }
 */
export function useTailwindReady({ timeoutMs = 8000 } = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [waiting, setWaiting] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let pollInterval = null;
    let timeoutHandle = null;
    let isMounted = true;
    const startTime = Date.now();

    // Step 1: Ensure Tailwind CDN is present (inject if missing)
    ensureTailwindCdn({ timeoutMs })
      .then(() => {
        if (!isMounted) return;

        // Step 2: Tailwind is confirmed ready
        setReady(true);
        setWaiting(false);
        console.log('✓ Tailwind CSS ready (computed style test passed)');
      })
      .catch((err) => {
        if (!isMounted) return;

        // Step 3: Fallback - poll for readiness in case CDN loads asynchronously
        console.warn('⚠️ ensureTailwindCdn failed, falling back to polling:', err.message);

        const checkTailwind = () => {
          try {
            const tailwindReady = testTailwindUtility();

            if (tailwindReady && isMounted) {
              clearInterval(pollInterval);
              clearTimeout(timeoutHandle);
              setReady(true);
              setWaiting(false);
              console.log('✓ Tailwind CSS ready (fallback poll succeeded)');
            }

            return tailwindReady;
          } catch (err) {
            console.warn('Error checking Tailwind:', err);
            return false;
          }
        };

        // Initial check
        if (checkTailwind()) {
          return;
        }

        // Poll every 50ms
        pollInterval = setInterval(() => {
          if (!isMounted) return;

          const elapsed = Date.now() - startTime;
          setElapsed(elapsed);

          if (checkTailwind()) {
            clearInterval(pollInterval);
            clearTimeout(timeoutHandle);
          }
        }, 50);

        // Timeout after specified duration
        timeoutHandle = setTimeout(() => {
          if (isMounted && !ready) {
            clearInterval(pollInterval);
            const finalElapsed = Date.now() - startTime;
            setElapsed(finalElapsed);
            setWaiting(false);

            // Gather detailed diagnostics
            const stylesheets = Array.from(document.styleSheets);
            const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            const tailwindScript = document.querySelector('script[src*="cdn.tailwindcss.com"]');
            const totalRules = stylesheets.reduce((sum, s) => {
              try {
                return sum + (s.cssRules?.length || 0);
              } catch (e) {
                return sum;
              }
            }, 0);

            const details = [
              `Waited ${finalElapsed}ms without Tailwind utilities loading.`,
              `Stylesheets: ${stylesheets.length} (${totalRules} rules)`,
              `Link tags: ${linkTags.length}`,
              `Tailwind CDN script: ${tailwindScript ? 'present' : 'missing'}`,
              'Check browser console & network tab for CSS/CDN load errors.',
            ].join(' ');

            setError(details);

            console.error('✗ Tailwind CSS timeout:', {
              waited: finalElapsed,
              tailwindScript: tailwindScript ? 'present' : 'missing',
              linkTags: linkTags.map(l => l.href),
              stylesheets: stylesheets.map((s) => ({
                href: s.href || 'inline',
                rules: (() => { try { return s.cssRules?.length || 0; } catch { return 'CORS blocked'; } })(),
              })),
              totalRules,
            });
          }
        }, timeoutMs);
      });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearTimeout(timeoutHandle);
    };
  }, [timeoutMs]);

  return { ready, error, waiting, elapsed };
}