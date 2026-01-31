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
        // First check: Are there any stylesheets loaded?
        const stylesheets = Array.from(document.styleSheets);
        if (stylesheets.length === 0) {
          return false; // No stylesheets yet, keep waiting
        }

        // Second check: Test multiple Tailwind utilities to ensure styles are applied
        const testContainer = document.createElement('div');
        testContainer.style.position = 'absolute';
        testContainer.style.visibility = 'hidden';
        testContainer.style.pointerEvents = 'none';
        
        // Test multiple utilities to be more confident
        testContainer.innerHTML = `
          <div class="hidden" data-test="hidden"></div>
          <div class="flex" data-test="flex"></div>
          <div class="text-red-500" data-test="color"></div>
        `;
        
        document.body.appendChild(testContainer);

        const hiddenEl = testContainer.querySelector('[data-test="hidden"]');
        const flexEl = testContainer.querySelector('[data-test="flex"]');
        const colorEl = testContainer.querySelector('[data-test="color"]');

        const hiddenStyle = window.getComputedStyle(hiddenEl);
        const flexStyle = window.getComputedStyle(flexEl);
        const colorStyle = window.getComputedStyle(colorEl);

        // Clean up
        document.body.removeChild(testContainer);

        // Check if Tailwind utilities are working
        const hiddenWorks = hiddenStyle.display === 'none';
        const flexWorks = flexStyle.display === 'flex';
        const colorWorks = colorStyle.color === 'rgb(239, 68, 68)'; // text-red-500

        const tailwindReady = hiddenWorks && flexWorks && colorWorks;

        if (tailwindReady && isMounted) {
          clearInterval(pollInterval);
          clearTimeout(timeoutHandle);
          setReady(true);
          setWaiting(false);
          console.log('✓ Tailwind CSS loaded and ready', { hiddenWorks, flexWorks, colorWorks });
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