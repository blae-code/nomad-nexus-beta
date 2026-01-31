import React from 'react';
import { getTailwindSafelistHtml } from './tailwindSafelistHtml';

/**
 * TailwindSafelist - Forces Tailwind CDN JIT to generate classes used by critical pages
 * Renders a hidden div containing all Tailwind utilities needed by:
 * - AccessGate
 * - Disclaimers
 * - Onboarding
 * 
 * This ensures first-time visitors (incognito) see fully styled pages.
 */
export default function TailwindSafelist() {
  return (
    <div
      aria-hidden="true"
      style={{ display: 'none' }}
      dangerouslySetInnerHTML={{ __html: getTailwindSafelistHtml() }}
    />
  );
}
