
// Polyfill: Base44 SDK calls this during module initialization - MUST run before SDK import
(() => {
  try {
    if (typeof globalThis !== 'undefined' && !globalThis.persistDemoFromUrl) {
      globalThis.persistDemoFromUrl = () => false;
    }
  } catch (e) {
    // Fallback for environments where globalThis doesn't work
    if (typeof window !== 'undefined' && !window.persistDemoFromUrl) {
      window.persistDemoFromUrl = () => false;
    }
  }
})();

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
