/**
 * Shim: provides missing default export for unreachable /src/pages.config.js
 * Prevents build failure in /src/lib/NavigationTracker.jsx
 * Also registers /login route alias pointing to /access-gate
 */

export const PAGE_ROUTE_ALIASES = {
  '/login': '/access-gate'
};

export const PAGE_ROUTE_OVERRIDES = {};

// Valid routes for 404 suggestions (excludes internal config keys)
export const VALID_ROUTES = [
  '/hub',
  '/academy', 
  '/nomadopsdashboard',
  '/events',
  '/commsconsole',
  '/intelligence',
  '/admin',
  '/universemap',
  '/fleetmanager',
  '/rescue',
  '/channels',
  '/profile',
  '/settings',
  '/access-gate',
  '/login'
];

export default {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
  VALID_ROUTES
};