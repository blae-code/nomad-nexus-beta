// src/pages.config.js
// Compatibility config: guarantees named exports used across the app.

const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true });

function pageNameFromPath(path) {
  const m = path.match(/\/([^/]+)\.jsx$/);
  return m?.[1] ?? null;
}

function routeFromName(name) {
  if (!name) return '/';
  if (name.toLowerCase() === 'hub') return '/hub';
  return `/${name.toLowerCase()}`;
}

// ✅ MUST exist as a named export (AdminCockpit/AccessGate/PageNotFound depend on it)
export const PAGE_ROUTE_ALIASES = {
  '/': '/hub',
  '/home': '/hub',
  '/index': '/hub',
  '/login': '/accessgate',
  '/access-gate': '/accessgate',
  '/accessGate': '/accessgate',
};

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
