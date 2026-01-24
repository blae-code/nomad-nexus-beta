
// Route configuration export for NavigationTracker and routing
// Maps page keys to their actual routes

export const PAGE_ROUTE_ALIASES = {
  '/accessgate': '/access-gate',
  '/AccessGate': '/access-gate',
  '/login': '/access-gate',
};

export const PAGE_ROUTE_OVERRIDES = {
  '/adminconsole': '/admin',
};

const pagesConfig = {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
};

export default pagesConfig;
