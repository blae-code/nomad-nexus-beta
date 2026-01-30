/**
 * Development Mode Detection
 * Allows app owner/developer to access the app from Base44 editor without authentication
 */

export function isDevMode() {
  if (typeof window === 'undefined') return false;
  
  // Check if running in Base44 preview/editor (iframe or special domain)
  const isBase44Editor = window.location.hostname.includes('base44') || 
                         window.self !== window.top || 
                         window.location.search.includes('base44_editor');
  
  // Check for dev flag in localStorage (can be set manually)
  const devFlag = localStorage.getItem('nexus.dev_mode') === 'true';
  
  return isBase44Editor || devFlag;
}

export function enableDevMode() {
  localStorage.setItem('nexus.dev_mode', 'true');
  window.location.reload();
}

export function disableDevMode() {
  localStorage.removeItem('nexus.dev_mode');
  window.location.reload();
}