/**
 * Page Configuration
 * Maps page names to their metadata
 */

export const PAGE_ROUTE_ALIASES = {
  'comms-console': '/commsconsole',
  'fleet-manager': '/fleetmanager',
  'access-gate': '/access-gate',
};

export const PAGE_ROUTE_OVERRIDES = {
  'admin-console': 'admin',
};

const pages = {
  hub: { path: '/hub', label: 'Hub' },
  events: { path: '/events', label: 'Events' },
  comms: { path: '/commsconsole', label: 'Comms' },
  admin: { path: '/admin', label: 'Admin' },
  rescue: { path: '/rescue', label: 'Rescue' },
  channels: { path: '/channels', label: 'Channels' },
  profile: { path: '/profile', label: 'Profile' },
  'access-gate': { path: '/access-gate', label: 'Access Gate' },
};

export default pages;