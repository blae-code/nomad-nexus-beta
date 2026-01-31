import React, { useState, useEffect } from 'react';
import '@/globals.css';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import ConstructionTicker from '@/components/layout/ConstructionTicker';
import CSSDebugOverlay from '@/components/debug/CSSDebugOverlay';
import TailwindReadyGate from '@/components/tailwind/TailwindReadyGate';
import TailwindSafelist from '@/components/tailwind/TailwindSafelist';

import ContextPanel from '@/components/layout/ContextPanel';

import CommandPaletteUI from '@/components/providers/CommandPaletteUI';
import { CommandPaletteProvider } from '@/components/providers/CommandPaletteContext';
import { NotificationProvider } from '@/components/providers/NotificationContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ShellUIProvider, useShellUI } from '@/components/providers/ShellUIContext';
import { useAlertSimulator } from '@/components/hooks/useAlertSimulator';
import PermissionGuard from '@/components/PermissionGuard';
import { usePresenceHeartbeat } from '@/components/hooks/usePresenceHeartbeat';
import TextCommsDock from '@/components/comms/TextCommsDock';
import { VoiceNetProvider } from '@/components/voice/VoiceNetProvider';
import { ActiveOpProvider } from '@/components/ops/ActiveOpProvider';
import { BootOverlay, useBootOverlay } from '@/components/boot/BootOverlay';
import { initScrollGuard } from '@/components/utils/scrollGuard';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import FatalAuthError from '@/components/auth/FatalAuthError';
import AuthDebugOverlay from '@/components/auth/AuthDebugOverlay';

/**
 * AppShell — Top-level layout wrapper for all routes.
 * Provides: Header, Main content area, Voice/Comms Docks, Command Palette
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
  // Full-screen pages that hide shell UI
  const fullScreenPages = ['AccessGate', 'Disclaimers', 'Onboarding'];
  const isFullScreen = fullScreenPages.includes(currentPageName);

  if (!children) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  // Single AuthProvider at app root (wraps all pages)
  // TailwindReadyGate ensures styles load before rendering anything
  return (
    <>
      <TailwindSafelist />
      <TailwindReadyGate timeoutMs={8000}>
        <AuthProvider>
          <AuthDebugOverlay />
          <LayoutWithAuth currentPageName={currentPageName} children={children} isFullScreen={isFullScreen} />
        </AuthProvider>
      </TailwindReadyGate>
    </>
  );
}

function LayoutWithAuth({ children, currentPageName, isFullScreen }) {
  const { error: authError, initialized } = useAuth();

  // Never block rendering - let AccessGate handle unauth routing
  // Only show fatal error if there's an actual initialization failure (not just "no user")
  if (initialized && authError && authError.message && !authError.message.includes('401')) {
    return <FatalAuthError error={authError} />;
  }

  return (
    <NotificationProvider>
      <ShellUIProvider>
        <ActiveOpProvider>
          <VoiceNetProvider>
            {isFullScreen ? (
              <div className="min-h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden">
                {children}
              </div>
            ) : (
              <LayoutContent currentPageName={currentPageName} children={children} />
            )}
          </VoiceNetProvider>
        </ActiveOpProvider>
      </ShellUIProvider>
    </NotificationProvider>
  );
}

function LayoutContent({ currentPageName, children }) {
  // Start presence heartbeat (non-blocking background task)
  usePresenceHeartbeat();

  const { isContextPanelOpen, isCommsDockOpen, dockMinimized, contextPanelMinimized, toggleContextPanel, toggleCommsDock, setDockMinimized, setContextPanelMinimized } = useShellUI();
  const { triggerEventAlert, triggerSystemAlert } = useAlertSimulator();
  const bootOverlay = useBootOverlay();

  // Initialize scroll guard
  React.useEffect(() => {
    initScrollGuard();
  }, []);

  const handleNavigate = (page) => {
    window.location.href = createPageUrl(page);
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
      onToggleContextPanel={toggleContextPanel}
      onToggleCommsDock={toggleCommsDock}
      onTriggerTestAlert={handleTriggerTestAlert}
      onCopyDiagnostics={handleCopyDiagnostics}
      onResetUILayout={handleResetUILayout}
      onReplayBoot={handleReplayBoot}
    >
      {/* Boot Overlay */}
      <BootOverlay forceShow={bootOverlay.showBoot} onDismiss={bootOverlay.dismiss} />
      <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
         {/* CSS Debug Overlay */}
         <CSSDebugOverlay />

         {/* Notification Center */}
         <NotificationCenter />

        {/* Header — fixed at top (z-50) */}
        <Header />

        {/* Construction Ticker — below fixed header */}
        <div className="relative z-[750] pt-16">
          <ConstructionTicker />
        </div>

        {/* Main content area — offset for fixed header (pt-16) + dock spacer */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-hidden flex gap-0">
            <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isCommsDockOpen && !dockMinimized ? 'pb-96' : isCommsDockOpen && dockMinimized ? 'pb-12' : 'pb-0'} transition-all duration-200`}>
              <PermissionGuard>{children}</PermissionGuard>
            </main>

            {/* ContextPanel — right sidebar, collapsible */}
            {isContextPanelOpen && (
              <div className={`${contextPanelMinimized ? 'w-12' : 'w-80'} border-l border-orange-500/20 flex-shrink-0 z-[900] relative transition-all duration-200`}>
                <ContextPanel isOpen={true} onClose={toggleContextPanel} isMinimized={contextPanelMinimized} onMinimize={setContextPanelMinimized} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Text Comms Dock (fixed, collapsible, respects context panel) */}
         {isCommsDockOpen && (
           <div className={`fixed bottom-0 left-0 z-[600] border-t border-orange-500/20 bg-zinc-950 ${isContextPanelOpen ? contextPanelMinimized ? 'right-12' : 'right-80' : 'right-0'} transition-all duration-200`}>
             <TextCommsDock isOpen={true} isMinimized={dockMinimized} onMinimize={setDockMinimized} />
           </div>
         )}

        {/* Command Palette Modal */}
        <CommandPaletteUI />
      </div>
      </CommandPaletteProvider>
        );
        }