
// Polyfill: Base44 SDK calls this during module initialization - MUST run before SDK import
if (typeof globalThis !== 'undefined') {
  globalThis.persistDemoFromUrl = () => false;
}
if (typeof window !== 'undefined') {
  window.persistDemoFromUrl = () => false;
}

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
