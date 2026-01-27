// src/lib/demo-mode.js
export function isDemoMode() {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname || '';
  const search = window.location.search || '';

  // Demo mode triggers:
  // - explicit query flag
  // - local dev hostnames
  return (
    search.includes('demo=true') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  );
}