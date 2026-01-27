
// CRITICAL: Set fallback unconditionally before SDK import
(function() {
  const fallback = () => false;
  if (typeof globalThis !== 'undefined') {
    globalThis.persistDemoFromUrl = fallback;
  }
  if (typeof window !== 'undefined') {
    window.persistDemoFromUrl = fallback;
  }
  if (typeof self !== 'undefined') {
    self.persistDemoFromUrl = fallback;
  }
})();

// CRITICAL: Must execute BEFORE SDK import
if (typeof globalThis !== 'undefined') globalThis.persistDemoFromUrl = () => false;
if (typeof window !== 'undefined') window.persistDemoFromUrl = () => false;
if (typeof self !== 'undefined') self.persistDemoFromUrl = () => false;

import { createClient } from '@base44/sdk';

// Use same-origin API endpoints for custom domain support
// This ensures credentials flow correctly on nomadnexus.space
export const base44 = createClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : ''
});
