
// Global fallback MUST run before SDK import
if (typeof window !== "undefined" && typeof window.persistDemoFromUrl !== "function") {
  window.persistDemoFromUrl = () => false;
}

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
