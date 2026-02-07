import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { isAdminUser } from '@/utils';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';
import { pagesConfig } from '@/pages.config';

/**
 * CommandPaletteContext — Global state for command palette
 * Provides: open/close, action registry, filtering by access
 */
const CommandPaletteContext = createContext(null);

/**
 * Command action shape:
 * {
 *   id: string (unique)
 *   label: string (display text)
 *   category: string (e.g., 'Navigate', 'Toggle', 'Open')
 *   description?: string
 *   onExecute: () => void | Promise<void>
 *   isVisible?: (user) => boolean (access predicate, defaults to true)
 * }
 */

/**
 * Built-in action registry
 */
const createActionRegistry = (user, callbacks) => {
  return [
    // Diagnostics: Copy diagnostics
    {
      id: 'diagnostics:copy',
      label: 'Copy Diagnostics',
      category: 'Diagnostics',
      description: 'Copy system diagnostics to clipboard',
      icon: 'ClipboardCopy',
      shortcut: '⌘⇧D',
      onExecute: () => callbacks.copyDiagnostics?.(),
    },
    // Diagnostics: Reset UI layout
    {
      id: 'diagnostics:reset-ui',
      label: 'Reset UI Layout',
      category: 'Diagnostics',
      description: 'Reset panel positions and reload',
      icon: 'RotateCcw',
      shortcut: '⌘⇧R',
      onExecute: () => callbacks.resetUILayout?.(),
    },
    // Boot: Replay boot sequence
    {
      id: 'boot:replay',
      label: 'Replay Boot Sequence',
      category: 'System',
      description: 'Show startup animation',
      icon: 'Zap',
      shortcut: '⌘⇧B',
      onExecute: () => callbacks.replayBoot?.(),
    },
    // Toggle: ContextPanel
    {
      id: 'toggle:contextpanel',
      label: 'Toggle Systems Panel',
      category: 'Toggle',
      description: 'Show/hide right systems panel',
      icon: 'PanelRight',
      shortcut: '⌘⇧S',
      onExecute: () => callbacks.toggleContextPanel?.(),
    },
    // Navigate: Dashboard
    {
      id: 'nav:hub',
      label: 'Hub',
      category: 'Navigate',
      page: 'Hub',
      description: 'Go to main dashboard',
      icon: 'Home',
      shortcut: '⌘H',
      onExecute: () => callbacks.navigate('Hub'),
    },
    // Navigate: Events
    {
      id: 'nav:events',
      label: 'Operations',
      category: 'Navigate',
      page: 'Events',
      description: 'View player-led operations',
      icon: 'Calendar',
      shortcut: '⌘E',
      onExecute: () => callbacks.navigate('Events'),
    },
    // Navigate: Comms Console
    {
      id: 'nav:comms',
      label: 'Comms Console',
      category: 'Navigate',
      page: 'CommsConsole',
      description: 'Open communication channels',
      icon: 'Radio',
      shortcut: '⌘C',
      onExecute: () => callbacks.navigate('CommsConsole'),
    },
    // Navigate: User Directory
    {
      id: 'nav:directory',
      label: 'User Directory',
      category: 'Navigate',
      page: 'UserDirectory',
      description: 'Browse member roster',
      icon: 'Users',
      shortcut: '⌘U',
      onExecute: () => callbacks.navigate('UserDirectory'),
    },
    // Navigate: Universe Map
    {
      id: 'nav:map',
      label: 'Universe Map',
      category: 'Navigate',
      page: 'UniverseMap',
      description: 'Tactical overview and positioning',
      icon: 'Map',
      shortcut: '⌘M',
      onExecute: () => callbacks.navigate('UniverseMap'),
    },
    // Navigate: Command Center
    {
      id: 'nav:command-center',
      label: 'Command Center',
      category: 'Navigate',
      page: 'CommandCenter',
      description: 'Issue orders and track acknowledgements',
      icon: 'Target',
      onExecute: () => callbacks.navigate('CommandCenter'),
    },
    // Navigate: Mission Catalog
    {
      id: 'nav:mission-catalog',
      label: 'Mission Catalog',
      category: 'Navigate',
      page: 'MissionCatalog',
      description: 'Game missions for operation planning',
      icon: 'Target',
      onExecute: () => callbacks.navigate('MissionCatalog'),
    },
    // Navigate: Intel Nexus
    {
      id: 'nav:intel-nexus',
      label: 'Intel Nexus',
      category: 'Navigate',
      page: 'IntelNexus',
      description: 'Threat tracking, intel reports, and predictive analysis',
      icon: 'Database',
      onExecute: () => callbacks.navigate('IntelNexus'),
    },
    // Navigate: War Academy
    {
      id: 'nav:war-academy',
      label: 'War Academy',
      category: 'Navigate',
      page: 'WarAcademy',
      description: 'Training scenarios, certifications, and simulation drills',
      icon: 'GraduationCap',
      onExecute: () => callbacks.navigate('WarAcademy'),
    },
    // Navigate: Nomad Registry
    {
      id: 'nav:nomad-registry',
      label: 'Nomad Registry',
      category: 'Navigate',
      page: 'NomadRegistry',
      description: 'Member profiles, reputation, achievements, and mentorship',
      icon: 'Users',
      onExecute: () => callbacks.navigate('NomadRegistry'),
    },
    // Navigate: High Command
    {
      id: 'nav:high-command',
      label: 'High Command',
      category: 'Navigate',
      page: 'HighCommand',
      description: 'Governance directives, council voting, diplomacy, and alliances',
      icon: 'Gavel',
      onExecute: () => callbacks.navigate('HighCommand'),
    },
    // Navigate: Data Vault
    {
      id: 'nav:data-vault',
      label: 'Data Vault',
      category: 'Navigate',
      page: 'DataVault',
      description: 'Knowledge archive, search, analytics, and exports',
      icon: 'BookOpen',
      onExecute: () => callbacks.navigate('DataVault'),
    },
    // Navigate: Nexus Training
    {
      id: 'nav:nexus-training',
      label: 'Nexus Training',
      category: 'Navigate',
      page: 'NexusTraining',
      description: 'Tutorials, guides, video resources, certifications, and feedback',
      icon: 'HelpCircle',
      onExecute: () => callbacks.navigate('NexusTraining'),
    },
    // Navigate: Contract Exchange
    {
      id: 'nav:mission-board',
      label: 'Contract Exchange',
      category: 'Navigate',
      page: 'MissionBoard',
      description: 'Async contracts, bounties, and orders',
      icon: 'ScrollText',
      onExecute: () => callbacks.navigate('MissionBoard'),
    },
    // Navigate: Logistics
    {
      id: 'nav:logistics',
      label: 'Logistics Hub',
      category: 'Navigate',
      page: 'LogisticsHub',
      description: 'Inventory and resource tracking',
      icon: 'Boxes',
      onExecute: () => callbacks.navigate('LogisticsHub'),
    },
    // Navigate: Strategic Objectives
    {
      id: 'nav:objectives',
      label: 'Strategic Objectives',
      category: 'Navigate',
      page: 'StrategicObjectives',
      description: 'Long-term org goals',
      icon: 'Target',
      onExecute: () => callbacks.navigate('StrategicObjectives'),
    },
    // Navigate: HUD Mode
    {
      id: 'nav:hud',
      label: 'HUD Mode',
      category: 'Navigate',
      page: 'HudMode',
      description: 'Second-screen tactical HUD',
      icon: 'Monitor',
      onExecute: () => callbacks.navigate('HudMode'),
    },
    // Navigate: Onboarding Pipeline
    {
      id: 'nav:onboarding-pipeline',
      label: 'Onboarding Pipeline',
      category: 'Navigate',
      page: 'OnboardingPipeline',
      description: 'Recruit checklist and milestones',
      icon: 'ClipboardList',
      onExecute: () => callbacks.navigate('OnboardingPipeline'),
    },
    // Navigate: Fleet Command
    {
      id: 'nav:fleet',
      label: 'Fleet Command',
      category: 'Navigate',
      page: 'FleetCommand',
      description: 'Asset control, scheduling, engineering, and analytics',
      icon: 'Box',
      shortcut: '⌘F',
      onExecute: () => callbacks.navigate('FleetCommand'),
    },
    // Navigate: Trade Nexus
    {
      id: 'nav:trade-nexus',
      label: 'Trade Nexus',
      category: 'Navigate',
      page: 'TradeNexus',
      description: 'Marketplace, commerce contracts, and treasury analytics',
      icon: 'DollarSign',
      shortcut: '⌘T',
      onExecute: () => callbacks.navigate('TradeNexus'),
    },
    // Navigate: Recon/Archive
    {
      id: 'nav:recon',
      label: 'Recon',
      category: 'Navigate',
      page: 'Recon',
      description: 'Intelligence reports and reputation tracking',
      icon: 'FileSearch',
      shortcut: '⌘R',
      onExecute: () => callbacks.navigate('Recon'),
    },
    // Navigate: System Admin
    {
      id: 'nav:settings',
      label: 'System Admin',
      category: 'Navigate',
      page: 'Settings',
      description: 'Administrator control panel',
      icon: 'Shield',
      shortcut: '⌘⇧A',
      onExecute: () => callbacks.navigate('Settings'),
      isVisible: (u) => isAdminUser(u),
    },
    // Toggle: CommsDock
    {
      id: 'toggle:comms-dock',
      label: 'Toggle Comms Dock',
      category: 'Toggle',
      description: 'Show/hide bottom comms panel',
      icon: 'MessageSquare',
      shortcut: '⌘⇧C',
      onExecute: () => callbacks.toggleCommsDock?.(),
    },
    // Open: Request Access
    {
      id: 'open:request-access',
      label: 'Request Focused Access',
      category: 'Actions',
      description: 'Apply for Focused comms tier',
      icon: 'Lock',
      onExecute: () => callbacks.openAccessRequest?.(),
      isVisible: (u) => !canAccessFocusedComms(u, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }),
    },
    // Alerts: Acknowledge pending alerts
    {
      id: 'alert:view',
      label: 'View Alerts',
      category: 'Alerts',
      description: 'Check pending system notifications',
      icon: 'Bell',
      shortcut: '⌘⇧A',
      onExecute: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    // Alerts: Test notifications (dev helper)
    {
      id: 'alert:test-event',
      label: 'Test Event Alert',
      category: 'Development',
      description: '[DEV] Trigger sample event notification',
      icon: 'Zap',
      onExecute: () => callbacks.triggerTestAlert?.('event'),
    },
    {
      id: 'alert:test-system',
      label: 'Test System Alert',
      category: 'Development',
      description: '[DEV] Trigger sample system notification',
      icon: 'AlertTriangle',
      onExecute: () => callbacks.triggerTestAlert?.('system'),
    },
  ];
};

/**
 * CommandPaletteProvider — Wraps app, provides context
 */
export function CommandPaletteProvider({ 
  children, 
  onNavigate, 
  onToggleSidePanel, 
  onToggleContextPanel,
  onToggleCommsDock,
  onOpenAccessRequest, 
  onTriggerTestAlert,
  onCopyDiagnostics,
  onResetUILayout,
  onReplayBoot,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const availablePages = useMemo(() => new Set(Object.keys(pagesConfig?.Pages || {})), []);

  const callbacks = useMemo(
    () => ({
      navigate: (page) => {
        onNavigate?.(page);
        setIsOpen(false);
      },
      toggleSidePanel: () => {
        onToggleSidePanel?.();
        setIsOpen(false);
      },
      toggleContextPanel: () => {
        onToggleContextPanel?.();
        setIsOpen(false);
      },
      toggleCommsDock: () => {
        onToggleCommsDock?.();
        setIsOpen(false);
      },
      openAccessRequest: () => {
        onOpenAccessRequest?.();
        setIsOpen(false);
      },
      triggerTestAlert: (type) => {
        onTriggerTestAlert?.(type);
        setIsOpen(false);
      },
      copyDiagnostics: () => {
        onCopyDiagnostics?.();
        setIsOpen(false);
      },
      resetUILayout: () => {
        onResetUILayout?.();
        setIsOpen(false);
      },
      replayBoot: () => {
        onReplayBoot?.();
        setIsOpen(false);
      },
    }),
    [onNavigate, onToggleSidePanel, onToggleContextPanel, onToggleCommsDock, onOpenAccessRequest, onTriggerTestAlert, onCopyDiagnostics, onResetUILayout, onReplayBoot]
  );

  // Build & filter action registry
  const actions = useMemo(() => {
    const allActions = createActionRegistry(user, callbacks);
    return allActions.filter((action) => {
      if (action.page && !availablePages.has(action.page)) {
        return false;
      }
      // Call isVisible predicate if it exists
      if (action.isVisible) {
        return action.isVisible(user);
      }
      return true;
    });
  }, [user, callbacks, availablePages]);

  // Filter actions by search
  const filteredActions = useMemo(() => {
    if (!search.trim()) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [actions, search]);

  // Group by category
  const groupedActions = useMemo(() => {
    const groups = {};
    filteredActions.forEach((action) => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });
    return groups;
  }, [filteredActions]);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  const value = {
    isOpen,
    openPalette,
    closePalette,
    search,
    setSearch,
    filteredActions,
    groupedActions,
  };

  return (
    <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
  );
}

/**
 * Hook to use command palette context
 */
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}
