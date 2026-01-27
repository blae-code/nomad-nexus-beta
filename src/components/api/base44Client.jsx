
// Polyfill: MUST define BEFORE SDK import, on ALL global objects
if (typeof globalThis !== 'undefined') {
  if (!globalThis.persistDemoFromUrl) {
    globalThis.persistDemoFromUrl = () => false;
  }
}
if (typeof window !== 'undefined') {
  if (!window.persistDemoFromUrl) {
    window.persistDemoFromUrl = () => false;
  }
}

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
