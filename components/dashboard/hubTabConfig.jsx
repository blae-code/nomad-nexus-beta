/**
 * Hub Tab Configuration
 * Defines all available tabs with metadata for context-aware rendering
 */

import {
  Calendar, AlertCircle, Activity, Users, Radio, Shield,
  Rocket, Heart, BookOpen, Coins, Database, Map,
  Backpack, Settings, Bell
} from 'lucide-react';

export const HUB_TABS = [
  // OPERATIONS GROUP
  {
    id: 'ops',
    label: 'OPERATIONS',
    icon: Calendar,
    group: 'operations',
    minRank: 'Vagrant',
    description: 'Active & upcoming operations'
  },
  {
    id: 'rescue',
    label: 'RESCUE',
    icon: Heart,
    group: 'operations',
    minRank: 'Vagrant',
    description: 'SAR operations & distress coordination'
  },
  {
    id: 'briefings',
    label: 'BRIEFINGS',
    icon: BookOpen,
    group: 'operations',
    minRank: 'Scout',
    description: 'Mission briefings & intelligence'
  },

  // ALERTS & SYSTEM
  {
    id: 'alerts',
    label: 'ALERTS & INCIDENTS',
    icon: AlertCircle,
    group: 'systems',
    minRank: 'Vagrant',
    description: 'System alerts & incident tracking'
  },
  {
    id: 'diagnostics',
    label: 'DIAGNOSTICS',
    icon: Database,
    group: 'systems',
    minRank: 'Admin',
    description: 'System health & diagnostics',
    adminOnly: true
  },

  // ACTIVITY & INTEL
  {
    id: 'activity',
    label: 'ACTIVITY',
    icon: Activity,
    group: 'intel',
    minRank: 'Vagrant',
    description: 'Activity feed & communications'
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    icon: Shield,
    group: 'intel',
    minRank: 'Scout',
    description: 'Strategic analysis & reports'
  },
  {
    id: 'map',
    label: 'TACTICAL MAP',
    icon: Map,
    group: 'intel',
    minRank: 'Vagrant',
    description: 'Real-time operation map'
  },

  // PERSONNEL & ORGANIZATION
  {
    id: 'personnel',
    label: 'PERSONNEL',
    icon: Users,
    group: 'personnel',
    minRank: 'Vagrant',
    description: 'User directory & presence'
  },
  {
    id: 'organization',
    label: 'ORGANIZATION',
    icon: Users,
    group: 'personnel',
    minRank: 'Vagrant',
    description: 'Squads & achievements'
  },

  // LOGISTICS
  {
    id: 'fleet',
    label: 'FLEET',
    icon: Rocket,
    group: 'logistics',
    minRank: 'Scout',
    description: 'Vessel management & deployment'
  },
  {
    id: 'armory',
    label: 'ARMORY',
    icon: Backpack,
    group: 'logistics',
    minRank: 'Scout',
    description: 'Equipment & loadout management'
  },
  {
    id: 'treasury',
    label: 'TREASURY',
    icon: Coins,
    group: 'logistics',
    minRank: 'Scout',
    description: 'Economy & aUEC management'
  },

  // COMMS & UTILITIES
  {
    id: 'comms',
    label: 'COMMS',
    icon: Radio,
    group: 'comms',
    minRank: 'Vagrant',
    description: 'Voice nets & communications'
  },
  {
    id: 'notifications',
    label: 'NOTIFICATIONS',
    icon: Bell,
    group: 'utilities',
    minRank: 'Vagrant',
    description: 'Notification center'
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: Settings,
    group: 'utilities',
    minRank: 'Vagrant',
    description: 'User preferences & keybinds'
  }
];

export const TAB_GROUPS = {
  operations: { label: 'OPERATIONS', order: 1 },
  systems: { label: 'SYSTEMS', order: 2 },
  intel: { label: 'INTELLIGENCE', order: 3 },
  personnel: { label: 'PERSONNEL', order: 4 },
  logistics: { label: 'LOGISTICS', order: 5 },
  comms: { label: 'COMMUNICATIONS', order: 6 },
  utilities: { label: 'UTILITIES', order: 7 }
};

const RANK_HIERARCHY = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];

/**
 * Get tabs available for the current user
 */
export const getAvailableTabs = (userRank, isAdmin) => {
  const rankIndex = RANK_HIERARCHY.indexOf(userRank || 'Vagrant');
  
  return HUB_TABS.filter(tab => {
    // Check admin-only
    if (tab.adminOnly && !isAdmin) return false;
    
    // Check rank requirement
    const minRankIndex = RANK_HIERARCHY.indexOf(tab.minRank);
    if (rankIndex < minRankIndex) return false;
    
    return true;
  });
};

/**
 * Group tabs for navigation
 */
export const getTabsByGroup = (userRank, isAdmin) => {
  const availableTabs = getAvailableTabs(userRank, isAdmin);
  
  const grouped = {};
  availableTabs.forEach(tab => {
    if (!grouped[tab.group]) {
      grouped[tab.group] = [];
    }
    grouped[tab.group].push(tab);
  });
  
  // Sort groups by order
  return Object.entries(grouped).sort(([g1], [g2]) => {
    return (TAB_GROUPS[g1]?.order || 99) - (TAB_GROUPS[g2]?.order || 99);
  });
};