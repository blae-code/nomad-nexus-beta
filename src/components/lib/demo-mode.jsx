/**
 * Demo Mode Detection
 * Returns true if running in local dev or demo mode
 */
export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('127.0.0.1') ||
    window.location.search.includes('demo=true')
  );
}