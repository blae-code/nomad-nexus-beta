import {
  Radio,
  Calendar,
  Headphones,
  Shield,
  Bot,
  Zap,
  Users,
  Wallet,
  Activity,
} from 'lucide-react';

export const pagesConfig = {
  getNavItemsForUser: (rank, isAdmin) => {
    return [
      {
        id: 'hub',
        label: 'Hub',
        page: 'Hub',
        icon: Radio,
        description: 'Home dashboard',
      },
      {
        id: 'mission',
        label: 'Ops',
        page: 'NomadOpsDashboard',
        icon: Zap,
        description: 'Mission control',
      },
      {
        id: 'events',
        label: 'Events',
        page: 'Events',
        icon: Calendar,
        description: 'Operations board',
      },
      {
        id: 'comms',
        label: 'Comms',
        page: 'CommsConsole',
        icon: Headphones,
        description: 'Communications array',
      },
      {
        id: 'intelligence',
        label: 'Intelligence',
        page: 'Intelligence',
        icon: Bot,
        description: 'AI insights console',
      },
      ...(isAdmin
        ? [
            {
              id: 'admin',
              label: 'Admin',
              page: 'Admin',
              icon: Shield,
              description: 'System administration',
            },
          ]
        : []),
    ];
  },

  getMoreItemsForUser: (rank, isAdmin) => {
    return [
      {
        id: 'roster',
        label: 'Roster',
        page: 'Profile',
        icon: Users,
        description: 'Personnel management',
      },
      {
        id: 'treasury',
        label: 'Treasury',
        page: 'Treasury',
        icon: Wallet,
        description: 'Financial management',
      },
      {
        id: 'rescue',
        label: 'Rescue',
        page: 'Rescue',
        icon: Activity,
        description: 'Distress response',
      },
    ];
  },
};