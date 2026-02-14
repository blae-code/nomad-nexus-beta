/**
 * PWA Support Handler
 * Serves manifest.json and service worker for PWA functionality
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Serve manifest.json
  if (url.pathname === '/manifest.json') {
    const manifest = {
      name: 'Nexus - Command Operations Hub',
      short_name: 'Nexus',
      description: 'Unified command and control operations platform for coordinated missions, voice comms, and tactical management',
      start_url: '/hub',
      scope: '/',
      display: 'standalone',
      orientation: 'landscape-primary',
      background_color: '#09090b',
      theme_color: '#ea580c',
      categories: ['productivity', 'utilities'],
      icons: [
        {
          src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23ea580c" rx="48"/><circle cx="96" cy="60" r="12" fill="%23090a0b"/><circle cx="96" cy="96" r="12" fill="%23090a0b"/><circle cx="96" cy="132" r="12" fill="%23090a0b"/></svg>',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any'
        },
        {
          src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23ea580c" rx="48"/><circle cx="96" cy="60" r="12" fill="%23090a0b"/><circle cx="96" cy="96" r="12" fill="%23090a0b"/><circle cx="96" cy="132" r="12" fill="%23090a0b"/></svg>',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: 'Hub',
          short_name: 'Hub',
          description: 'Main operations hub',
          url: '/hub'
        },
        {
          name: 'Operations',
          short_name: 'Ops',
          description: 'View active operations',
          url: '/nomadopsdashboard'
        },
        {
          name: 'Comms',
          short_name: 'Comms',
          description: 'Voice and text communications',
          url: '/commsconsole'
        }
      ]
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  // Serve service worker
  if (url.pathname === '/service-worker.js') {
    const sw = `
/**
 * Nexus Service Worker - Offline support and cache-safe static asset handling
 */
const CACHE_NAME = 'nexus-v2';
const STATIC_EXTENSIONS = new Set([
  'js', 'mjs', 'css', 'json', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'map'
]);

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
  if (pathname === '/' || pathname === '/index.html' || pathname === '/offline.html' || pathname === '/manifest.json') return true;
  const match = pathname.match(/\\.([a-zA-Z0-9]+)$/);
  if (!match) return false;
  return STATIC_EXTENSIONS.has(match[1].toLowerCase());
}

async function safeCachePut(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  if (!isCacheableAsset(request)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    return;
  }
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          safeCachePut(request, response).catch(() => undefined);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  if (!isCacheableAsset(request)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
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
      .catch(() => cached || new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      }));
      return cached || network;
    })
  );
});
    `.trim();

    return new Response(sw, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  return new Response('Not found', { status: 404 });
});
