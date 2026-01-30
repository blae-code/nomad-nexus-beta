/**
 * Development Mode Detection
 * Allows app owner/developer to access the app from Base44 editor without authentication
 */

export function isDevMode() {
  if (typeof window === 'undefined') return false;
  
  // Check if running in Base44 preview/editor (most reliable - no localStorage needed)
  const isBase44Preview = window.location.hostname.includes('base44') || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname === '[::1]';
  
  if (isBase44Preview) return true;
  
  // Check localStorage override as fallback
  try {
    const devFlag = localStorage.getItem('nexus.dev_mode');
    if (devFlag === 'true') return true;
  } catch (e) {
    // localStorage might not be available in some contexts
  }
  
  return false;
}

export function enableDevMode() {
  localStorage.setItem('nexus.dev_mode', 'true');
  window.location.reload();
}

export function disableDevMode() {
  localStorage.removeItem('nexus.dev_mode');
  window.location.reload();
}