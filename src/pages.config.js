// Routing configuration - provides aliases and overrides for page routing
// Mirrors the page mapping in Layout.js for consistency

export const PAGE_ROUTE_ALIASES = {
  '/accessgate': '/access-gate',
  '/AccessGate': '/access-gate',
  '/login': '/access-gate',
};

export const PAGE_ROUTE_OVERRIDES = {
  '/adminconsole': '/admin',
};

export const VALID_ROUTES = [
  '/',
  '/hub',
  '/academy',
  '/events',
  '/comms-console',
  '/intelligence',
  '/admin',
  '/universe-map',
  '/fleet-manager',
  '/rescue',
  '/channels',
  '/profile',
  '/settings',
  '/access-gate',
];

const pagesConfig = {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
  VALID_ROUTES,
};

export default pagesConfig;