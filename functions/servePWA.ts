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
 * Nexus Service Worker - Offline support and caching
 */
const CACHE_NAME = 'nexus-v1';

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

// Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
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