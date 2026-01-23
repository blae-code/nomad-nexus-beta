import {
  Radio,
  Calendar,
  MessageCircle,
  Brain,
  Shield,
  Settings,
  Zap,
  Users,
  Coins,
  Map,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

/**
 * Single source of truth for navigation structure.
 * Sections must be exactly: Mission Control, Operations, Comms, Intelligence, Administration
 * NOTE: Rank hierarchies should import from utils/ranks.ts, not define locally
 */

export const navItems = [
  {
    section: 'Mission Control',
    items: [
      {
        id: 'hub',
        label: 'Command Hub',
        icon: Radio,
        route: '/hub',
        page: 'Hub',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: null,
      },
      {
        id: 'mission',
        label: 'Mission Control',
        icon: Zap,
        route: '/nomadopsdashboard',
        page: 'NomadOpsDashboard',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: null,
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        id: 'events',
        label: 'Operations',
        icon: Calendar,
        route: '/events',
        page: 'Events',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: 'eventCount',
      },
      {
        id: 'fleet',
        label: 'Fleet Manager',
        icon: Users,
        route: '/fleetmanager',
        page: 'FleetManager',
        minRank: 'Scout',
        roles: [],
        badgeKey: null,
      },
      {
        id: 'map',
        label: 'Universe Map',
        icon: Map,
        route: '/universemap',
        page: 'UniverseMap',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: null,
      },
      {
        id: 'rescue',
        label: 'Rescue',
        icon: AlertTriangle,
        route: '/rescue',
        page: 'Rescue',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: 'activeRescues',
      },
    ],
  },
  {
    section: 'Comms',
    items: [
      {
        id: 'comms',
        label: 'Comms Console',
        icon: MessageCircle,
        route: '/commsconsole',
        page: 'CommsConsole',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: 'unreadMessages',
      },
      {
        id: 'channels',
        label: 'Channels',
        icon: MessageCircle,
        route: '/channels',
        page: 'Channels',
        minRank: 'Vagrant',
        roles: [],
        badgeKey: null,
      },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      {
        id: 'intelligence',
        label: 'Intelligence',
        icon: Brain,
        route: '/intelligence',
        page: 'Intelligence',
        minRank: 'Scout',
        roles: [],
        badgeKey: null,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        route: '/analytics',
        page: 'Analytics',
        minRank: 'Founder',
        roles: [],
        badgeKey: null,
      },
    ],
  },
  {
    section: 'Administration',
    items: [
      {
        id: 'admin',
        label: 'Admin Cockpit',
        icon: Shield,
        route: '/admin',
        page: 'AdminCockpit',
        minRank: 'Pioneer',
        roles: ['admin'],
        badgeKey: null,
      },
    ],
  },
];

/**
 * Get nav items visible to user based on rank/role
 */
export function getVisibleNavItems(user) {
  if (!user) return [];

  const userRankValue = getRankValue(user.rank);
  const isAdmin = user.role === 'admin';

  const filtered = navItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Check rank
      const minRankValue = getRankValue(item.minRank);
      if (userRankValue < minRankValue) return false;

      // Check roles (if any required)
      if (item.roles.length > 0) {
        const hasRole = isAdmin || item.roles.some(role => user.role_tags?.includes(role));
        if (!hasRole) return false;
      }

      return true;
    }),
  })).filter(section => section.items.length > 0);

  return filtered;
}

/**
 * DEPRECATED: Import getRankValue from utils/ranks.ts instead
 * Kept here for backwards compatibility; will be removed in future cleanup pass
 */
import { getRankValue as _getRankValue } from '@/utils/ranks';

export function getRankValue(rank) {
  return _getRankValue(rank);
}

/**
 * Flatten all nav items (for keyboard nav, etc.)
 */
export function getFlatNavItems(user) {
  const visible = getVisibleNavItems(user);
  return visible.flatMap(section => section.items);
}