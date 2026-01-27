
// CRITICAL: persistDemoFromUrl fallback (may be called by Base44 platform)
if (typeof globalThis !== 'undefined' && typeof globalThis.persistDemoFromUrl !== 'function') {
  globalThis.persistDemoFromUrl = () => false;
}

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
