/**
 * Scroll Guards — Prevent horizontal overflow and layout issues
 * Lightweight dev warnings for layout regressions
 */

let warningThrottled = false;

export function checkHorizontalOverflow() {
  if (typeof window === 'undefined') return;

  const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;

  if (hasOverflow && !warningThrottled) {
    console.warn('[LAYOUT] Horizontal overflow detected. Check for layout issues.');
    warningThrottled = true;
    
    // Reset throttle after 5 seconds
    setTimeout(() => {
      warningThrottled = false;
    }, 5000);
  }
}

export function initScrollGuards() {
  if (typeof window === 'undefined') return;

  // Disable body scroll
  document.body.style.overflow = 'hidden';

  // Check on load
  checkHorizontalOverflow();

  // Check on resize (throttled)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkHorizontalOverflow, 250);
  });

  // Development-only checks
  if (process.env.NODE_ENV === 'development') {
    console.log('[SCROLL GUARDS] Initialized');
  }
}