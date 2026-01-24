/**
 * Page configuration shim
 */

export const PAGE_ROUTE_ALIASES = {
  '/login': '/access-gate'
};

export const PAGE_ROUTE_OVERRIDES = {};

export const VALID_ROUTES = [
  'hub',
  'academy',
  'mission',
  'events',
  'comms',
  'intelligence',
  'admin',
  'universemap',
  'fleetmanager',
  'rescue',
  'channels',
  'profile',
  'settings',
  'access-gate'
];

export default {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
  VALID_ROUTES
};