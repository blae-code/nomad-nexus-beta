/**
 * Shim: provides missing default export for unreachable /src/pages.config.js
 * Prevents build failure in /src/lib/NavigationTracker.jsx
 */

export const PAGE_ROUTE_ALIASES = {
  '/login': '/access-gate'
};

export const PAGE_ROUTE_OVERRIDES = {};

export default {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES
};