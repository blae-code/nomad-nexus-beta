/**
 * Development Mode Detection
 * Allows app owner/developer to access the app from Base44 editor without authentication
 */

export function isDevMode() {
  if (typeof window === 'undefined') return false;
  
  // Check localStorage first (most reliable for Base44 preview)
  try {
    const devFlag = localStorage.getItem('nexus.dev_mode');
    if (devFlag === 'true') return true;
    if (devFlag === 'false') return false;
  } catch (e) {
    // localStorage might not be available in some contexts
  }
  
  // Check if running in Base44 preview/editor
  const isBase44Preview = window.location.hostname.includes('base44') || 
                          window.location.hostname.includes('localhost') ||
                          window.location.hostname.includes('127.0.0.1');
  
  return isBase44Preview;
}

export function enableDevMode() {
  localStorage.setItem('nexus.dev_mode', 'true');
  window.location.reload();
}

export function disableDevMode() {
  localStorage.removeItem('nexus.dev_mode');
  window.location.reload();
}