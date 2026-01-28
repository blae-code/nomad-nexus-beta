import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import SidePanel from '@/components/layout/SidePanel';
import ContextPanel from '@/components/layout/ContextPanel';
import CommsDock from '@/components/layout/CommsDock';
import CommandPaletteUI from '@/components/providers/CommandPaletteUI';
import { CommandPaletteProvider } from '@/components/providers/CommandPaletteContext';
import { NotificationProvider } from '@/components/providers/NotificationContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ShellUIProvider, useShellUI } from '@/components/providers/ShellUIContext';
import { useLayoutPreferences } from '@/components/hooks/useLayoutPreferences';
import { useAlertSimulator } from '@/components/hooks/useAlertSimulator';
import PermissionGuard from '@/components/PermissionGuard';

/**
 * AppShell — Top-level layout wrapper for all routes.
 * Provides: Header, SidePanel (left nav with gating), Main content area, CommsDock (right)
 * No horizontal scrolling, responsive, stable under resize.
 */
const cn = (...classes) => {
  return classes
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function Layout({ children, currentPageName }) {
  const { loaded, prefs, toggleSidePanel, toggleCommsDock } = useLayoutPreferences();
  const [dockOpen, setDockOpen] = useState(false);

  // Sync localStorage state with UI state
  useEffect(() => {
    if (loaded) {
      setDockOpen(prefs.commsDockOpen);
    }
  }, [loaded, prefs.commsDockOpen]);

  if (!children) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  const handleNavigate = (page) => {
    window.location.href = createPageUrl(page);
  };

  const handleToggleDock = () => {
    const newState = !dockOpen;
    setDockOpen(newState);
    toggleCommsDock();
  };

  const handleOpenAccessRequest = () => {
    // TODO: wire to SidePanel modal or dedicated page
  };

  return (
    <NotificationProvider>
      <LayoutContent currentPageName={currentPageName} children={children} />
    </NotificationProvider>
  );
}

function LayoutContent({ currentPageName, children }) {
  const { loaded, prefs, toggleSidePanel, toggleCommsDock } = useLayoutPreferences();
  const { triggerEventAlert, triggerSystemAlert } = useAlertSimulator();

  const handleNavigate = (page) => {
    window.location.href = createPageUrl(page);
  };

  const handleToggleDock = () => {
    toggleCommsDock();
  };

  const handleOpenAccessRequest = () => {
    // TODO: wire to SidePanel modal or dedicated page
  };

  const handleTriggerTestAlert = (type) => {
    if (type === 'event') {
      triggerEventAlert();
    } else if (type === 'system') {
      triggerSystemAlert();
    }
  };

  return (
    <CommandPaletteProvider
      onNavigate={handleNavigate}
      onToggleDock={handleToggleDock}
      onOpenAccessRequest={handleOpenAccessRequest}
      onTriggerTestAlert={handleTriggerTestAlert}
    >
        <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
          {/* Notification Center */}
          <NotificationCenter />

          {/* Header — top navigation */}
          <Header />

        {/* Main layout grid: sidebar + content + dock */}
        <div className="flex flex-1 overflow-hidden">
          {/* SidePanel — left navigation with gating */}
          {!prefs.sidePanelCollapsed && <SidePanel currentPageName={currentPageName} onToggleCollapse={toggleSidePanel} />}

          {/* Main content area — route outlet */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <PermissionGuard>{children}</PermissionGuard>
          </main>

          {/* CommsDock — right panel, collapsible */}
          {prefs.commsDockOpen && <CommsDock isOpen={prefs.commsDockOpen} onClose={() => {
            setDockOpen(false);
            toggleCommsDock();
          }} />}
        </div>

          {/* Command Palette Modal */}
          <CommandPaletteUI />
        </div>
      </CommandPaletteProvider>
  );
}

export { cn };