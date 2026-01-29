/**
 * Scroll Guard — Prevent horizontal overflow and body scrolling
 */

export function initScrollGuard() {
  // Disable body scrolling (app shell handles scroll)
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.height = '100%';

  // Dev-only: warn on horizontal overflow
  if (process.env.NODE_ENV === 'development') {
    const checkOverflow = () => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      if (hasHorizontalScroll) {
        console.warn(
          '[ScrollGuard] Horizontal overflow detected:',
          {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        );
      }
    };

    // Check on load and resize
    setTimeout(checkOverflow, 1000);
    window.addEventListener('resize', checkOverflow);
  }
}