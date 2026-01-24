import { lazy } from 'react';

const pageDefinitions = {
  Hub: {
    file: './pages/Hub.jsx',
    loader: () => import('./pages/Hub.jsx'),
  },
  Academy: {
    file: './pages/Academy.jsx',
    loader: () => import('./pages/Academy.jsx'),
  },
  Events: {
    file: './pages/Events.jsx',
    loader: () => import('./pages/Events.jsx'),
  },
  CommsConsole: {
    file: './pages/CommsConsole.jsx',
    loader: () => import('./pages/CommsConsole.jsx'),
  },
  Intelligence: {
    file: './pages/Intelligence.jsx',
    loader: () => import('./pages/Intelligence.jsx'),
  },
  AdminCockpit: {
    file: './pages/AdminCockpit.jsx',
    loader: () => import('./pages/AdminCockpit.jsx'),
  },
  UniverseMap: {
    file: './pages/UniverseMap.jsx',
    loader: () => import('./pages/UniverseMap.jsx'),
  },
  FleetManager: {
    file: './pages/FleetManager.jsx',
    loader: () => import('./pages/FleetManager.jsx'),
  },
  Rescue: {
    file: './pages/Rescue.jsx',
    loader: () => import('./pages/Rescue.jsx'),
  },
  Channels: {
    file: './pages/Channels.jsx',
    loader: () => import('./pages/Channels.jsx'),
  },
  Profile: {
    file: './pages/Profile.jsx',
    loader: () => import('./pages/Profile.jsx'),
  },
  Settings: {
    file: './pages/Settings.jsx',
    loader: () => import('./pages/Settings.jsx'),
  },
  AccessGate: {
    file: './pages/AccessGate.jsx',
    loader: () => import('./pages/AccessGate.jsx'),
  },
};

const Pages = Object.fromEntries(
  Object.entries(pageDefinitions).map(([key, definition]) => [
    key,
    lazy(definition.loader),
  ]),
);

export const pagesConfig = {
  Pages,
  pageDefinitions,
  mainPage: 'Hub',
};

export const PAGE_ROUTE_ALIASES = {
  Events: ['/nomadopsdashboard'],
  CommsConsole: ['/commsconsole'],
  UniverseMap: ['/universemap'],
  FleetManager: ['/fleetmanager'],
  AdminCockpit: ['/adminconsole'],
  AccessGate: ['/accessgate'],
};

export const PAGE_ROUTE_OVERRIDES = {
  CommsConsole: '/comms-console',
  UniverseMap: '/universe-map',
  FleetManager: '/fleet-manager',
  AdminCockpit: '/admin',
};
