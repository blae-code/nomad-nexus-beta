
export default {
  routes: [
    { path: '/', component: () => import('./pages/Hub.jsx') },
    { path: '/access-gate', component: () => import('./pages/AccessGate.jsx') },
    { path: '/events', component: () => import('./pages/Events.jsx') },
    { path: '/comms-console', component: () => import('./pages/CommsConsole.jsx') },
    { path: '/user-directory', component: () => import('./pages/UserDirectory.jsx') },
    { path: '/universe-map', component: () => import('./pages/UniverseMap.jsx') },
    { path: '/fleet-manager', component: () => import('./pages/FleetManager.jsx') },
    { path: '/treasury', component: () => import('./pages/Treasury.jsx') },
    { path: '/settings', component: () => import('./pages/Settings.jsx') },
  ],
  notFound: () => import('./pages/PageNotFound.js')
};
