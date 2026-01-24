const PAGE_ROUTE_ALIASES = {
  '/': '/hub',
  '/hub': '/hub',
  '/academy': '/academy',
  '/nomadopsdashboard': '/nomadopsdashboard',
  '/events': '/events',
  '/commsconsole': '/commsconsole',
  '/intelligence': '/intelligence',
  '/admin': '/admin',
  '/adminconsole': '/admin',
  '/universemap': '/universemap',
  '/fleetmanager': '/fleetmanager',
  '/rescue': '/rescue',
  '/channels': '/channels',
  '/profile': '/profile',
  '/settings': '/settings',
  '/access-gate': '/access-gate',
  '/accessgate': '/access-gate',
  '/login': '/access-gate',
};

const PAGE_ROUTE_OVERRIDES = {};

export default {
  aliases: PAGE_ROUTE_ALIASES,
  overrides: PAGE_ROUTE_OVERRIDES,
};

export { PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES };