/* eslint-disable no-restricted-globals */
/**
 * Nexus OS Service Worker (PWA + offline + push shell)
 *
 * Guardrails:
 * - Provides cache support only; does not fabricate operational data.
 * - Uses stale-while-revalidate/network-first patterns for app shell resilience.
 */

const CACHE_NAME = 'nexus-os-shell-v2';
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/offline.html', '/icons/nexus-192.svg', '/icons/nexus-512.svg'];
const STATIC_EXTENSIONS = new Set([
  'js', 'mjs', 'css', 'json', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'map',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isCacheableAsset(request) {
  if (request.method !== 'GET') return false;
  const requestUrl = new URL(request.url);
  if (!isSameOrigin(requestUrl)) return false;
  if (request.mode === 'navigate') return true;
  const pathname = requestUrl.pathname || '/';
  if (pathname.startsWith('/api/') || pathname.startsWith('/functions/')) return false;
  if (pathname.includes('/auth/') || pathname.includes('/session')) return false;
  if (pathname === '/' || pathname === '/index.html' || pathname === '/offline.html' || pathname === '/manifest.webmanifest') return true;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return false;
  return STATIC_EXTENSIONS.has(match[1].toLowerCase());
}

async function safeCachePut(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  if (!isCacheableAsset(request)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          safeCachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  if (!isCacheableAsset(request)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || new Response('', { status: 503, statusText: 'Offline' })))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          safeCachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: 'Nexus OS Alert', body: event.data?.text() || 'New operational notification.' };
    }
  })();

  const title = payload.title || 'Nexus OS Alert';
  const options = {
    body: payload.body || 'New operational notification.',
    icon: '/icons/nexus-192.svg',
    badge: '/icons/nexus-192.svg',
    data: {
      url: payload.url || '/Hub',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/Hub';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
