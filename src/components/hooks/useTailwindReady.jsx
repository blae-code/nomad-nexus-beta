import { useEffect, useState } from 'react';

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

    const checkTailwind = () => {
      try {
        // Create test element with a known Tailwind utility
        const testEl = document.createElement('div');
        testEl.className = 'hidden';
        testEl.style.position = 'absolute';
        testEl.style.visibility = 'hidden';
        document.body.appendChild(testEl);

        // Check computed style
        const computed = window.getComputedStyle(testEl);
        const display = computed.display;
        
        // Clean up immediately
        document.body.removeChild(testEl);

        // If display is 'none', Tailwind is loaded
        const tailwindReady = display === 'none';

        if (tailwindReady && isMounted) {
          clearInterval(pollInterval);
          clearTimeout(timeoutHandle);
          setReady(true);
          setWaiting(false);
          console.log('✓ Tailwind CSS loaded and ready');
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
        const hasStyles = stylesheets.length > 0;
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
          hasStyles 
            ? 'Styles present but Tailwind utilities not working.' 
            : 'No stylesheets loaded.',
          'Check browser console & network tab for CSS load errors.',
        ].join(' ');

        setError(details);
        
        console.error('✗ Tailwind CSS timeout:', {
          waited: finalElapsed,
          stylesheets: stylesheets.map((s) => ({
            href: s.href || 'inline',
            rules: (() => { try { return s.cssRules?.length || 0; } catch { return 'CORS blocked'; } })(),
            crossOrigin: s.href ? new URL(s.href).origin !== window.location.origin ? 'cross-origin' : 'same-origin' : 'inline',
          })),
          totalRules,
        });
      }
    }, timeoutMs);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearTimeout(timeoutHandle);
    };
  }, [timeoutMs]);

  return { ready, error, waiting, elapsed };
}