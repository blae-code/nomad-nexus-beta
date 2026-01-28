import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';

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
    // Toggle: SidePanel
    {
      id: 'toggle:sidepanel',
      label: 'Toggle Sidebar',
      category: 'Toggle',
      description: 'Show/hide left navigation panel',
      onExecute: () => callbacks.toggleSidePanel?.(),
    },
    // Toggle: ContextPanel
    {
      id: 'toggle:contextpanel',
      label: 'Toggle Systems Panel',
      category: 'Toggle',
      description: 'Show/hide right systems panel',
      onExecute: () => callbacks.toggleContextPanel?.(),
    },
    // Navigate: Dashboard
    {
      id: 'nav:hub',
      label: 'Hub',
      category: 'Navigate',
      description: 'Go to main dashboard',
      onExecute: () => callbacks.navigate('Hub'),
    },
    // Navigate: Events
    {
      id: 'nav:events',
      label: 'Events',
      category: 'Navigate',
      description: 'View operations and events',
      onExecute: () => callbacks.navigate('Events'),
    },
    // Navigate: Comms Console
    {
      id: 'nav:comms',
      label: 'Comms Console',
      category: 'Navigate',
      description: 'Open communication channels',
      onExecute: () => callbacks.navigate('CommsConsole'),
    },
    // Navigate: User Directory
    {
      id: 'nav:directory',
      label: 'User Directory',
      category: 'Navigate',
      description: 'Browse member roster',
      onExecute: () => callbacks.navigate('UserDirectory'),
    },
    // Navigate: Recon/Archive
    {
      id: 'nav:recon',
      label: 'Recon',
      category: 'Navigate',
      description: 'View archived operations',
      onExecute: () => callbacks.navigate('Recon'),
    },
    // Toggle: CommsDock (if exists, safe stub)
    {
      id: 'toggle:comms-dock',
      label: 'Toggle Comms Dock',
      category: 'Toggle',
      description: 'Show/hide right comms panel',
      onExecute: () => callbacks.toggleCommsDock?.(),
    },
    // Open: Request Access
    {
      id: 'open:request-access',
      label: 'Request Focused Access',
      category: 'Open',
      description: 'Apply for Focused comms tier',
      onExecute: () => callbacks.openAccessRequest?.(),
      isVisible: (u) => !canAccessFocusedComms(u, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }),
    },
    // Alerts: Acknowledge pending alerts
    {
      id: 'alert:view',
      label: 'View Alerts',
      category: 'Alerts',
      description: 'Check pending system notifications',
      onExecute: () => {
        // Alerts are visible in notification center; this is a shortcut
        // to focus the notification area (scroll to top-right)
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    // Alerts: Test notifications (dev helper)
    {
      id: 'alert:test-event',
      label: 'Test Event Alert',
      category: 'Alerts',
      description: '[DEV] Trigger sample event notification',
      onExecute: () => callbacks.triggerTestAlert?.('event'),
    },
    {
      id: 'alert:test-system',
      label: 'Test System Alert',
      category: 'Alerts',
      description: '[DEV] Trigger sample system notification',
      onExecute: () => callbacks.triggerTestAlert?.('system'),
    },
  ];
};

/**
 * CommandPaletteProvider — Wraps app, provides context
 */
export function CommandPaletteProvider({ children, onNavigate, onToggleSidePanel, onToggleContextPanel, onOpenAccessRequest, onTriggerTestAlert }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useCurrentUser();

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
      openAccessRequest: () => {
        onOpenAccessRequest?.();
        setIsOpen(false);
      },
      triggerTestAlert: (type) => {
        onTriggerTestAlert?.(type);
        setIsOpen(false);
      },
    }),
    [onNavigate, onToggleSidePanel, onToggleContextPanel, onOpenAccessRequest, onTriggerTestAlert]
  );

  // Build & filter action registry
  const actions = useMemo(() => {
    const allActions = createActionRegistry(user, callbacks);
    return allActions.filter((action) => {
      // Call isVisible predicate if it exists
      if (action.isVisible) {
        return action.isVisible(user);
      }
      return true;
    });
  }, [user, callbacks]);

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