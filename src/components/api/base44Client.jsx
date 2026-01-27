// CRITICAL: persistDemoFromUrl fallback MUST execute before SDK initialization
// This function may be called by Base44 platform code during module loading
(function() {
  if (typeof window !== 'undefined' && !window.persistDemoFromUrl) {
    window.persistDemoFromUrl = () => false;
  }
  if (typeof globalThis !== 'undefined' && !globalThis.persistDemoFromUrl) {
    globalThis.persistDemoFromUrl = () => false;
  }
})();

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});