// src/pages.config.js
// Compatibility config: guarantees named exports used across the app.

const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true });

function pageNameFromPath(path) {
  const m = path.match(/\/([^/]+)\.jsx$/);
  return m?.[1] ?? null;
}

// ✅ MUST exist as named exports (various components import these)
export const PAGE_ROUTE_OVERRIDES = {
  Hub: '/hub',
  AccessGate: '/accessgate',
  AdminCockpit: '/admin',
  PageNotFound: '/404',
};

export const PAGE_ROUTE_ALIASES = {
  '/': '/hub',
  '/home': '/hub',
  '/index': '/hub',
  '/login': '/accessgate',
  '/access-gate': '/accessgate',
  '/accessGate': '/accessgate',
};

function routeFromName(name) {
  if (!name) return '/';
  if (PAGE_ROUTE_OVERRIDES[name]) return PAGE_ROUTE_OVERRIDES[name];
  return `/${name.toLowerCase()}`;
}

export const pagesConfig = Object.entries(pagesGlob)
  .map(([path, mod]) => {
    const name = pageNameFromPath(path);
    const Comp = mod?.default ?? (name ? mod?.[name] : null);
    if (!name || typeof Comp !== 'function') return null;
    return { name, route: routeFromName(name), component: Comp, file: path };
  })
  .filter(Boolean);

export const PAGES = pagesConfig.reduce((acc, p) => {
  acc[p.name] = p;
  return acc;
}, {});

export function resolveRouteAlias(pathname = '/') {
  return PAGE_ROUTE_ALIASES[pathname] ?? pathname;
}

export default pagesConfig;
