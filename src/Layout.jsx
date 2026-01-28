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
import { usePresenceHeartbeat } from '@/components/hooks/usePresenceHeartbeat';

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
  if (!children) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <ShellUIProvider>
        <LayoutContent currentPageName={currentPageName} children={children} />
      </ShellUIProvider>
    </NotificationProvider>
  );
}

function LayoutContent({ currentPageName, children }) {
  const { isSidePanelOpen, isContextPanelOpen, toggleSidePanel, toggleContextPanel } = useShellUI();
  const { triggerEventAlert, triggerSystemAlert } = useAlertSimulator();

  const handleNavigate = (page) => {
    window.location.href = createPageUrl(page);
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
      onToggleSidePanel={toggleSidePanel}
      onToggleContextPanel={toggleContextPanel}
      onOpenAccessRequest={handleOpenAccessRequest}
      onTriggerTestAlert={handleTriggerTestAlert}
    >
      <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
        {/* Notification Center */}
        <NotificationCenter />

        {/* Header — top navigation fixed */}
        <Header />

        {/* Main layout grid: sidepanel + content + contextpanel */}
        <div className="flex flex-1 overflow-hidden">
          {/* SidePanel — left navigation, collapsible */}
          {isSidePanelOpen && <SidePanel currentPageName={currentPageName} onToggleCollapse={toggleSidePanel} />}

          {/* Main content area — route outlet, scrolls internally */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <PermissionGuard>{children}</PermissionGuard>
          </main>

          {/* ContextPanel — right sidebar, collapsible */}
          <ContextPanel isOpen={isContextPanelOpen} onClose={toggleContextPanel} />
        </div>

        {/* Command Palette Modal */}
        <CommandPaletteUI />
      </div>
    </CommandPaletteProvider>
  );
}

export { cn };