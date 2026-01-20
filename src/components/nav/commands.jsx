/**
 * Command Registry: Single source of truth for all navigation and actions
 * Each command includes type (NAV/ACTION), label, keywords, icon name, and clearance gating
 */

import {
  LayoutGrid,
  Calendar,
  Radio,
  Shield,
  Bot,
  Zap,
  Users,
  Coins,
  RotateCcw,
  AlertCircle,
  Plus,
  LogOut,
  User,
  Settings,
} from 'lucide-react';

export const COMMAND_SECTIONS = {
  MISSION_CONTROL: 'Mission Control',
  OPERATIONS: 'Operations',
  COMMS: 'Comms',
  INTELLIGENCE: 'Intelligence',
  ADMINISTRATION: 'Administration',
  ACTIONS: 'Quick Actions',
  UTILITY: 'Utility',
};

export const commands = [
  // ===== MISSION CONTROL =====
  {
    id: 'nav-hub',
    type: 'NAV',
    section: COMMAND_SECTIONS.MISSION_CONTROL,
    label: 'Command Hub',
    keywords: ['dashboard', 'home', 'overview'],
    icon: 'LayoutGrid',
    route: 'Hub',
    shortcut: 'Cmd+Shift+H',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-nomad-ops',
    type: 'NAV',
    section: COMMAND_SECTIONS.MISSION_CONTROL,
    label: 'Nomad Ops Dashboard',
    keywords: ['ops', 'dashboard', 'tactical'],
    icon: 'Activity',
    route: 'NomadOpsDashboard',
    shortcut: 'Cmd+Shift+O',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-profile',
    type: 'NAV',
    section: COMMAND_SECTIONS.MISSION_CONTROL,
    label: 'Profile',
    keywords: ['profile', 'operative', 'settings', 'account'],
    icon: 'User',
    route: 'Profile',
    minRank: 'Vagrant',
  },

  // ===== OPERATIONS =====
  {
    id: 'nav-events',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Operations Board',
    keywords: ['events', 'missions', 'operations', 'schedule'],
    icon: 'Calendar',
    route: 'Events',
    shortcut: 'Cmd+Shift+E',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-fleet',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Fleet Manager',
    keywords: ['fleet', 'assets', 'ships', 'inventory'],
    icon: 'Rocket',
    route: 'FleetManager',
    shortcut: 'Cmd+Shift+F',
    minRank: 'Scout',
  },
  {
    id: 'nav-treasury',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Treasury',
    keywords: ['auec', 'currency', 'transactions', 'funds'],
    icon: 'Coins',
    route: 'Treasury',
    minRank: 'Scout',
  },

  // ===== COMMS =====
  {
    id: 'nav-comms',
    type: 'NAV',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Comms Array',
    keywords: ['comms', 'radio', 'voice', 'nets', 'channels'],
    icon: 'Radio',
    route: 'CommsConsole',
    shortcut: 'Cmd+Shift+C',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-channels',
    type: 'NAV',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channels',
    keywords: ['channels', 'chat', 'text', 'discussion'],
    icon: 'MessageSquare',
    route: 'Channels',
    minRank: 'Vagrant',
  },

  // ===== INTELLIGENCE =====
  {
    id: 'nav-intelligence',
    type: 'NAV',
    section: COMMAND_SECTIONS.INTELLIGENCE,
    label: 'Intelligence Console',
    keywords: ['ai', 'intelligence', 'analysis', 'insights', 'agents'],
    icon: 'Bot',
    route: 'Intelligence',
    minRank: 'Scout',
  },

  // ===== ADMINISTRATION =====
  {
    id: 'nav-admin',
    type: 'NAV',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'System Administration',
    keywords: ['admin', 'settings', 'system', 'users', 'roles'],
    icon: 'Shield',
    route: 'AdminConsole',
    minRank: 'Scout',
    roles: ['admin'],
  },

  // ===== QUICK ACTIONS =====
  {
    id: 'action-create-event',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Create Event',
    keywords: ['new', 'event', 'mission', 'operation'],
    icon: 'Plus',
    handler: 'createEvent',
    minRank: 'Voyager',
  },
  {
    id: 'action-set-status',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Set Status',
    keywords: ['status', 'presence', 'state'],
    icon: 'RotateCcw',
    handler: 'setStatus',
    minRank: 'Vagrant',
  },
  {
    id: 'action-distress',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Send Distress Signal',
    keywords: ['distress', 'emergency', 'help', 'rescue'],
    icon: 'AlertCircle',
    handler: 'sendDistress',
    minRank: 'Vagrant',
    requiresConfirm: true,
  },

  // ===== UTILITY =====
  {
    id: 'action-diagnostics',
    type: 'ACTION',
    section: COMMAND_SECTIONS.UTILITY,
    label: 'System Diagnostics',
    keywords: ['diagnostics', 'health', 'status', 'system'],
    icon: 'Activity',
    handler: 'openDiagnostics',
    roles: ['admin'],
  },
  {
    id: 'util-sign-out',
    type: 'ACTION',
    section: COMMAND_SECTIONS.UTILITY,
    label: 'Sign Out',
    keywords: ['logout', 'exit', 'sign out'],
    icon: 'LogOut',
    handler: 'logout',
    minRank: 'Vagrant',
  },
];

/**
 * Filter commands by user rank and role
 */
export function filterCommandsByUser(user) {
  if (!user) return [];

  return commands.filter((cmd) => {
    // Check minimum rank requirement
    if (cmd.minRank) {
      const rankOrder = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];
      const userRankIndex = rankOrder.indexOf(user.rank || 'Vagrant');
      const cmdRankIndex = rankOrder.indexOf(cmd.minRank);
      if (userRankIndex < cmdRankIndex) return false;
    }

    // Check role requirements (for admin-only commands)
    if (cmd.roles && !cmd.roles.includes(user.role)) return false;

    return true;
  });
}

/**
 * Find command by ID
 */
export function getCommandById(id) {
  return commands.find((cmd) => cmd.id === id);
}

/**
 * Search commands by query
 */
export function searchCommands(query, availableCommands) {
  const lowerQuery = query.toLowerCase();
  return availableCommands.filter((cmd) => {
    return (
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Group commands by section
 */
export function groupCommandsBySection(cmds) {
  const grouped = {};
  cmds.forEach((cmd) => {
    if (!grouped[cmd.section]) grouped[cmd.section] = [];
    grouped[cmd.section].push(cmd);
  });
  return grouped;
}