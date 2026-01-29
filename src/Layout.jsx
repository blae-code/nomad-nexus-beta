import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import ConstructionTicker from '@/components/layout/ConstructionTicker';
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
import VoiceCommsDock from '@/components/voice/VoiceCommsDock';
import TextCommsDock from '@/components/comms/TextCommsDock';
import { VoiceNetProvider } from '@/components/voice/VoiceNetProvider';
import { ActiveOpProvider } from '@/components/ops/ActiveOpProvider';
import { BootOverlay, useBootOverlay } from '@/components/boot/BootOverlay';
import { initScrollGuard } from '@/components/utils/scrollGuard';

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

  const [dockMode, setDockMode] = React.useState('voice'); // 'voice' or 'text'

  return (
    <NotificationProvider>
      <ShellUIProvider>
        <ActiveOpProvider>
          <VoiceNetProvider>
            <LayoutContent currentPageName={currentPageName} children={children} dockMode={dockMode} setDockMode={setDockMode} />
          </VoiceNetProvider>
        </ActiveOpProvider>
      </ShellUIProvider>
    </NotificationProvider>
  );
}

function LayoutContent({ currentPageName, children, dockMode, setDockMode }) {
  // Start presence heartbeat (non-blocking background task)
  usePresenceHeartbeat();

  const { isSidePanelOpen, isContextPanelOpen, isCommsDockOpen, toggleSidePanel, toggleContextPanel, toggleCommsDock } = useShellUI();
  const { triggerEventAlert, triggerSystemAlert } = useAlertSimulator();
  const bootOverlay = useBootOverlay();

  // Initialize scroll guard
  React.useEffect(() => {
    initScrollGuard();
  }, []);

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

  const handleCopyDiagnostics = () => {
    // Trigger copy from ContextPanel (via event or ref)
    window.dispatchEvent(new CustomEvent('nexus:copy-diagnostics'));
  };

  const handleResetUILayout = () => {
    if (confirm('Reset UI layout? This will clear panel positions and reload the page.')) {
      localStorage.removeItem('nexus.shell.sidePanelOpen');
      localStorage.removeItem('nexus.shell.contextPanelOpen');
      localStorage.removeItem('nexus.shell.commsDockOpen');
      window.location.reload();
    }
  };

  const handleReplayBoot = () => {
    bootOverlay.replay();
  };

  return (
    <CommandPaletteProvider
      onNavigate={handleNavigate}
      onToggleSidePanel={toggleSidePanel}
      onToggleContextPanel={toggleContextPanel}
      onOpenAccessRequest={handleOpenAccessRequest}
      onTriggerTestAlert={handleTriggerTestAlert}
      onCopyDiagnostics={handleCopyDiagnostics}
      onResetUILayout={handleResetUILayout}
      onReplayBoot={handleReplayBoot}
    >
      {/* Boot Overlay */}
      <BootOverlay forceShow={bootOverlay.showBoot} onDismiss={bootOverlay.dismiss} />
      <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
        {/* Notification Center */}
        <NotificationCenter />

        {/* Header — top navigation (z-40) */}
        <div className="relative z-40">
          <Header />
        </div>

        {/* Construction Ticker */}
        <ConstructionTicker />

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden flex">
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <PermissionGuard>{children}</PermissionGuard>
          </main>

          {/* ContextPanel — right sidebar, collapsible */}
          {isContextPanelOpen && (
            <div className="border-l border-orange-500/20">
              <ContextPanel isOpen={true} onClose={toggleContextPanel} />
            </div>
          )}
        </div>

        {/* Comms Dock Footer — Toggle between Voice and Text */}
        {isCommsDockOpen && dockMode === 'voice' && <VoiceCommsDock isOpen={true} onClose={toggleCommsDock} />}
        {isCommsDockOpen && dockMode === 'text' && <TextCommsDock isOpen={true} onClose={toggleCommsDock} />}

        {/* Command Palette Modal */}
        <CommandPaletteUI />
      </div>
      </CommandPaletteProvider>
        );
        }

export { cn };