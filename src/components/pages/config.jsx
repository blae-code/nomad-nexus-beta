
/**
 * Pages Configuration
 * Central registry for route aliases and overrides
 */

const PAGE_ROUTE_ALIASES = {
  '/nomadopsdashboard': '/NomadOpsDashboard',
  '/commsconsole': '/CommsConsole',
  '/adminconsole': '/AdminCockpit',
};

const PAGE_ROUTE_OVERRIDES = {
  '/': '/Hub',
  '/hub': '/Hub',
  '/academy': '/Academy',
  '/events': '/Events',
  '/intelligence': '/Intelligence',
  '/admin': '/AdminCockpit',
  '/universemap': '/UniverseMap',
  '/fleetmanager': '/FleetManager',
  '/rescue': '/Rescue',
  '/channels': '/Channels',
  '/profile': '/Profile',
  '/settings': '/Settings',
  '/access-gate': '/AccessGate',
  '/accessgate': '/AccessGate',
  '/login': '/AccessGate',
};

export { PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES };

export default {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
};
