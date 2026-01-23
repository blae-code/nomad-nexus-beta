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
  MapPin,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Inbox,
  Bell,
  FileText,
  Eye,
  TrendingUp,
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

// Missing icon imports - add these to CommandPaletteV3.js icon map
// Gamepad2 (for demo mode)

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
    description: 'Central command dashboard',
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
    description: 'View and manage scheduled operations',
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
    id: 'nav-map',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Tactical Map',
    keywords: ['map', 'tactical', 'universe', 'locations'],
    icon: 'Rocket',
    route: 'UniverseMap',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-rescue',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Rescue System',
    keywords: ['rescue', 'distress', 'emergency', 'beacon'],
    icon: 'AlertCircle',
    route: 'Rescue',
    minRank: 'Vagrant',
  },
  {
    id: 'nav-treasury',
    type: 'NAV',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Treasury',
    keywords: ['auec', 'currency', 'transactions', 'funds'],
    icon: 'Coins',
    route: 'Treasury',
    minRank: 'Pioneer',
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
    description: 'Join voice nets and manage communications',
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
    label: 'Admin Cockpit',
    keywords: ['admin', 'cockpit', 'settings', 'system', 'users', 'roles', 'dashboard'],
    icon: 'Shield',
    route: 'AdminCockpit',
    minRank: 'Pioneer',
    roles: ['admin'],
  },

  // ===== OPERATIONS WORKSPACE =====
  {
    id: 'dock-toggle',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Toggle Comms Dock',
    keywords: ['dock', 'comms', 'messages', 'toggle', 'open'],
    icon: 'MessageSquare',
    handler: 'toggleCommsDock',
    description: 'Open or close the Comms Dock',
    minRank: 'Vagrant',
    shortcut: 'Cmd+Shift+D'
  },
  {
    id: 'dock-comms',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Open Comms Tab',
    keywords: ['dock', 'comms', 'channels', 'messages'],
    icon: 'MessageSquare',
    handler: 'openCommsDock',
    description: 'Open Comms Dock to Comms tab',
    minRank: 'Vagrant'
  },
  {
    id: 'dock-polls',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Open Polls',
    keywords: ['dock', 'polls', 'vote', 'survey'],
    icon: 'Send',
    handler: 'openPollsDock',
    description: 'Open Comms Dock to Polls tab',
    minRank: 'Vagrant'
  },
  {
    id: 'dock-riggsy',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Chat with Riggsy',
    keywords: ['riggsy', 'ai', 'chat', 'help', 'dock'],
    icon: 'Zap',
    handler: 'openRiggsyDock',
    description: 'Open AI chat with Riggsy',
    minRank: 'Vagrant'
  },
  {
    id: 'dock-inbox',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Open Inbox',
    keywords: ['inbox', 'notifications', 'mentions', 'dock'],
    icon: 'Inbox',
    handler: 'openInboxDock',
    description: 'Open Comms Dock to Inbox',
    minRank: 'Vagrant'
  },
  {
    id: 'post-create',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Create Post',
    keywords: ['post', 'message', 'create', 'publish'],
    icon: 'Plus',
    handler: 'createPost',
    description: 'Create a new post in active channel',
    minRank: 'Scout'
  },
  {
    id: 'poll-create',
    type: 'ACTION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Create Poll',
    keywords: ['poll', 'vote', 'survey', 'create'],
    icon: 'Send',
    handler: 'createPoll',
    description: 'Create a new poll',
    minRank: 'Scout'
  },
  // Canonical channel shortcuts (generated from commsRegistry)
  {
    id: 'ch-announcements',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: Announcements',
    keywords: ['channel', 'announcements', 'org', 'broadcast'],
    icon: 'Bell',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-announcements' },
    description: 'Founder org-wide announcements',
    minRank: 'Vagrant'
  },
  {
    id: 'ch-ops-briefings',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: Ops Briefings',
    keywords: ['channel', 'briefings', 'operations', 'ops'],
    icon: 'FileText',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-ops-briefings' },
    description: 'Pre-op briefs with discussion',
    minRank: 'Scout'
  },
  {
    id: 'ch-ops-sitrep',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: SITREP',
    keywords: ['channel', 'sitrep', 'situation', 'report'],
    icon: 'Radio',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-ops-sitrep' },
    description: 'Real-time situation reports',
    minRank: 'Scout'
  },
  {
    id: 'ch-distress',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: Distress Dispatch',
    keywords: ['channel', 'distress', 'rescue', 'dispatch'],
    icon: 'AlertTriangle',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-distress-dispatch' },
    description: 'Rescue alerts & coordination',
    minRank: 'Scout'
  },
  {
    id: 'ch-general',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: General Comms',
    keywords: ['channel', 'general', 'casual', 'chat'],
    icon: 'MessageSquare',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-general-comms' },
    description: 'Org-wide casual discussion',
    minRank: 'Vagrant'
  },
  {
    id: 'ch-intel',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: Intel Ledger',
    keywords: ['channel', 'intel', 'intelligence', 'ledger'],
    icon: 'Eye',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-intel-ledger' },
    description: 'Shared intelligence reports',
    minRank: 'Scout'
  },
  {
    id: 'ch-logistics',
    type: 'NAVIGATION',
    section: COMMAND_SECTIONS.COMMS,
    label: 'Channel: Market & Logistics',
    keywords: ['channel', 'logistics', 'market', 'trading'],
    icon: 'TrendingUp',
    handler: 'openChannel',
    handlerArgs: { slug: 'org-market-logistics' },
    description: 'Industry & supply coordination',
    minRank: 'Vagrant'
  },
  {
    id: 'ops-open-active',
    type: 'ACTION',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Open My Active Operation',
    keywords: ['workspace', 'active', 'operation', 'continue'],
    icon: 'Radio',
    handler: 'openActiveWorkspace',
    description: 'Switch to your current active operation workspace',
    minRank: 'Scout',
    inOpsContext: true,
  },
  {
    id: 'ops-drop-rally',
    type: 'ACTION',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Drop Rally Point',
    keywords: ['rally', 'point', 'marker', 'map', 'tactics'],
    icon: 'MapPin',
    handler: 'dropRallyPoint',
    description: 'Mark rally point on tactical map',
    minRank: 'Scout',
    inOpsContext: true,
  },
  {
    id: 'ops-broadcast',
    type: 'ACTION',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Broadcast Command',
    keywords: ['broadcast', 'command', 'announce', 'all-hands'],
    icon: 'Radio',
    handler: 'broadcastCommand',
    description: 'Send urgent broadcast to all squads',
    minRank: 'Pioneer',
    inOpsContext: true,
  },
  {
    id: 'ops-create-incident',
    type: 'ACTION',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Create Incident',
    keywords: ['incident', 'report', 'emergency', 'problem'],
    icon: 'AlertTriangle',
    handler: 'createIncident',
    description: 'Report operational incident',
    minRank: 'Scout',
    inOpsContext: true,
  },
  {
    id: 'ops-resolve-incident',
    type: 'ACTION',
    section: COMMAND_SECTIONS.OPERATIONS,
    label: 'Resolve Incident',
    keywords: ['incident', 'resolve', 'close', 'clear'],
    icon: 'CheckCircle2',
    handler: 'resolveIncident',
    description: 'Mark incident as resolved',
    minRank: 'Scout',
    inOpsContext: true,
  },

  // ===== QUICK ACTIONS =====
  {
    id: 'action-create-event',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Create Event',
    keywords: ['new', 'event', 'mission', 'operation', 'initialize'],
    icon: 'Plus',
    handler: 'createEvent',
    description: 'Initialize a new operation',
    minRank: 'Voyager',
  },
  {
    id: 'action-join-net',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Join Voice Net',
    keywords: ['join', 'net', 'voice', 'comms', 'channel'],
    icon: 'Radio',
    handler: 'joinComms',
    description: 'Join the most recent active voice net',
    minRank: 'Vagrant',
  },
  {
    id: 'action-set-status',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Set Status',
    keywords: ['status', 'presence', 'state', 'online'],
    icon: 'RotateCcw',
    handler: 'setStatus',
    description: 'Set your presence: Online, In-Call, Transmitting, Away, Offline',
    minRank: 'Vagrant',
  },
  {
    id: 'action-distress',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ACTIONS,
    label: 'Send Distress Signal',
    keywords: ['distress', 'emergency', 'help', 'rescue', 'mayday'],
    icon: 'AlertCircle',
    handler: 'sendDistress',
    description: 'Broadcast emergency distress beacon',
    minRank: 'Vagrant',
    requiresConfirm: true,
  },

  // ===== ADMIN ACTIONS =====
  {
    id: 'action-admin-cockpit',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'Open Admin Cockpit',
    keywords: ['cockpit', 'admin', 'panel', 'control'],
    icon: 'Shield',
    handler: 'openAdminCockpit',
    description: 'Open centralized admin control panel',
    roles: ['admin'],
  },
  {
    id: 'action-demo-preflight',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'Run Demo Preflight',
    keywords: ['demo', 'preflight', 'readiness', 'check'],
    icon: 'CheckCircle2',
    handler: 'runDemoPreflight',
    description: 'System readiness check for demo',
    roles: ['admin'],
  },
  {
    id: 'action-comms-test',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'Run Comms Smoke Test',
    keywords: ['comms', 'test', 'voice', 'smoke'],
    icon: 'Radio',
    handler: 'runCommsTest',
    description: 'Test communications infrastructure',
    roles: ['admin'],
  },
  {
    id: 'action-seed-data',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'Seed Faux Week',
    keywords: ['seed', 'data', 'demo', 'populate'],
    icon: 'Zap',
    handler: 'seedData',
    description: 'Populate sample data for testing',
    roles: ['admin'],
  },
  {
    id: 'action-wipe-data',
    type: 'ACTION',
    section: COMMAND_SECTIONS.ADMINISTRATION,
    label: 'Wipe Data',
    keywords: ['wipe', 'delete', 'clear', 'reset'],
    icon: 'RotateCcw',
    handler: 'wipeData',
    description: 'Clear all operational data (DESTRUCTIVE)',
    roles: ['admin'],
    requiresConfirm: true,
  },

  // ===== UTILITY =====
  {
    id: 'action-diagnostics',
    type: 'ACTION',
    section: COMMAND_SECTIONS.UTILITY,
    label: 'System Diagnostics',
    keywords: ['diagnostics', 'health', 'status', 'system', 'debug'],
    icon: 'Activity',
    handler: 'openDiagnostics',
    roles: ['admin'],
  },
  {
    id: 'util-sign-out',
    type: 'ACTION',
    section: COMMAND_SECTIONS.UTILITY,
    label: 'Sign Out',
    keywords: ['logout', 'exit', 'sign out', 'disconnect'],
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