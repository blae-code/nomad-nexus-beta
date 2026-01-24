// Page routing configuration for the app
export const pagesConfig = [
  { path: '/hub', name: 'hub' },
  { path: '/academy', name: 'academy' },
  { path: '/events', name: 'events' },
  { path: '/comms-console', name: 'comms' },
  { path: '/intelligence', name: 'intelligence' },
  { path: '/admin', name: 'admin' },
  { path: '/universe-map', name: 'universemap' },
  { path: '/fleet-manager', name: 'fleetmanager' },
  { path: '/rescue', name: 'rescue' },
  { path: '/channels', name: 'channels' },
  { path: '/profile', name: 'profile' },
  { path: '/settings', name: 'settings' },
  { path: '/access-gate', name: 'access-gate' }
];

export const PAGE_ROUTE_ALIASES = {
  '/': '/hub',
  '/nomadopsdashboard': '/events',
  '/commsconsole': '/comms-console',
  '/universemap': '/universe-map',
  '/fleetmanager': '/fleet-manager',
  '/adminconsole': '/admin',
  '/accessgate': '/access-gate'
};

export const PAGE_ROUTE_OVERRIDES = {};