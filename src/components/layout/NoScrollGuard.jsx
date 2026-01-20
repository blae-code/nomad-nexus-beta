import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Dev-only: NoScroll Guard diagnostic
 * Fails loudly if page content exceeds viewport height
 */

export default function NoScrollGuard({ currentPage }) {
  const [violation, setViolation] = useState(null);

  useEffect(() => {
    const checkScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      if (docHeight > viewportHeight + 1) {
        // Find top 5 tallest elements
        const allElements = Array.from(document.querySelectorAll('*'));
        const tallest = allElements
          .map((el) => ({
            tag: el.tagName,
            class: el.className.split(' ')[0] || '(no class)',
            height: el.offsetHeight,
          }))
          .sort((a, b) => b.height - a.height)
          .slice(0, 5);

        const violation = {
          docHeight,
          viewportHeight,
          excess: docHeight - viewportHeight,
          page: currentPage,
          tallest,
        };

        console.error('[NoScroll Guard] VIOLATION:', violation);
        setViolation(violation);
      } else {
        setViolation(null);
      }
    };

    // Check on mount
    setTimeout(checkScroll, 100);

    // Check on window resize
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [currentPage]);

  if (!violation) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-red-950 border-2 border-red-600 p-3 rounded text-xs font-mono z-50 shadow-lg">
      <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
        <AlertTriangle className="w-4 h-4" />
        SCROLL VIOLATION
      </div>
      <div className="space-y-1 text-red-300">
        <div>Page: {violation.page}</div>
        <div>Doc: {violation.docHeight}px | Viewport: {violation.viewportHeight}px | Excess: {violation.excess}px</div>
        <div className="mt-2 text-red-400 font-bold">Top 5 Tallest:</div>
        <div className="ml-2 space-y-1">
          {violation.tallest.map((el, idx) => (
            <div key={idx} className="text-red-300">
              {el.tag}.{el.class} = {el.height}px
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}