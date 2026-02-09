/**
 * PWA bootstrap helper.
 * Registers service worker and keeps registration non-blocking for app boot.
 */

let pwaRegistrationPromise = null;

export async function registerNexusPwa() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (pwaRegistrationPromise) return pwaRegistrationPromise;

  pwaRegistrationPromise = navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      window.dispatchEvent(new CustomEvent('nexus:pwa-registered', { detail: { scope: registration.scope } }));
      return registration;
    })
    .catch((error) => {
      console.warn('[NexusOS][PWA] service worker registration failed:', error);
      return null;
    });

  return pwaRegistrationPromise;
}

