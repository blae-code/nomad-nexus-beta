import React from 'react';
import '@/globals.css';
import { navigateToPage } from '@/utils';
import Header from '@/components/layout/Header';
import CSSDebugOverlay from '@/components/debug/CSSDebugOverlay';

import CommandPaletteUI from '@/components/providers/CommandPaletteUI';
import { CommandPaletteProvider } from '@/components/providers/CommandPaletteContext';
import { NotificationProvider } from '@/components/providers/NotificationContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ShellUIProvider, useShellUI } from '@/components/providers/ShellUIContext';
import { useAlertSimulator } from '@/components/hooks/useAlertSimulator';
import PermissionGuard from '@/components/PermissionGuard';
import { usePresenceHeartbeat } from '@/components/hooks/usePresenceHeartbeat';
import { useVoiceCommands } from '@/components/hooks/useVoiceCommands';
import TextCommsDock from '@/components/comms/TextCommsDock';
import { VoiceNetProvider } from '@/components/voice/VoiceNetProvider';
import { ActiveOpProvider } from '@/components/ops/ActiveOpProvider';
import { BootOverlay, useBootOverlay } from '@/components/boot/BootOverlay';
import { initScrollGuard } from '@/components/utils/scrollGuard';
import { useAuth } from '@/components/providers/AuthProvider';
import FatalAuthError from '@/components/auth/FatalAuthError';
import AuthDebugOverlay from '@/components/auth/AuthDebugOverlay';
import { useRealtimeNotifications } from '@/components/hooks/useRealtimeNotifications';
import OfflineStatusBanner from '@/components/mobile/OfflineStatusBanner';
import MobileQuickActionBar from '@/components/mobile/MobileQuickActionBar';

const TacticalFooter = React.lazy(() => import('@/components/layout/TacticalFooter'));
const TACTICAL_FOOTER_PAGES = new Set([
  'Hub',
  'CommsConsole',
  'CommandCenter',
  'MissionControl',
  'FleetTracking',
  'FleetCommand',
  'UniverseMap',
  'FrontierOps',
  'HighCommand',
]);

/**
 * AppShell — Top-level layout wrapper for all routes.
 * Provides: Header, Main content area, Voice/Comms Docks, Command Palette
 * No horizontal scrolling, responsive, stable under resize.
 */
const cn = (...classes) => {
  return classes.
  filter(Boolean).
  join(' ').
  replace(/\s+/g, ' ').
  trim();
};

export default function Layout({ children, currentPageName }) {
  // Boot marker - app entry executed
  // Rebuild trigger
  React.useEffect(() => {
    window.__NN_BOOTED__ = true;
    window.__NN_BOOT_TIME__ = Date.now();
    console.log('[NN] App booted at', new Date().toISOString());
  }, []);

  // Full-screen pages that hide shell UI
  const fullScreenPages = ['AccessGate', 'Disclaimers', 'Onboarding'];
  const isFullScreen = fullScreenPages.includes(currentPageName);
  const isNexusWorkspace = currentPageName === 'Workspace';

  return (
    <>
      {!children ?
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-orange-500 text-xl">Loading...</div>
        </div> :

      <>
          <AuthDebugOverlay />
          <LayoutWithAuth
          currentPageName={currentPageName}
          children={children}
          isFullScreen={isFullScreen}
          isNexusWorkspace={isNexusWorkspace} />

        </>
      }
    </>);

}

function LayoutWithAuth({ children, currentPageName, isFullScreen, isNexusWorkspace }) {
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
            {isFullScreen ?
            <div className="nexus-immersive-screen min-h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden">
                {children}
              </div> :

            <LayoutContent currentPageName={currentPageName} children={children} isNexusWorkspace={isNexusWorkspace} />
            }
          </VoiceNetProvider>
        </ActiveOpProvider>
      </ShellUIProvider>
    </NotificationProvider>);

}

function LayoutContent({ currentPageName, children, isNexusWorkspace }) {
  // Start presence heartbeat (non-blocking background task)
  usePresenceHeartbeat();
  useRealtimeNotifications();

  const { isContextPanelOpen, isCommsDockOpen, dockMinimized, contextPanelMinimized, toggleContextPanel, toggleCommsDock, setDockMinimized, setContextPanelMinimized } = useShellUI();
  const { triggerEventAlert, triggerSystemAlert } = useAlertSimulator();
  const bootOverlay = useBootOverlay();

  // Initialize scroll guard
  React.useEffect(() => {
    initScrollGuard();
  }, []);

  const handleNavigate = (page) => {
    navigateToPage(page);
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

  if (isNexusWorkspace) {
    return (
      <>
        <div className="nexus-shell-standard h-[100dvh] max-h-[100dvh] bg-zinc-950 flex flex-col overflow-hidden relative">
          <CSSDebugOverlay />
          <NotificationCenter />
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <OfflineStatusBanner />
            <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-hidden">
              <PermissionGuard>{children}</PermissionGuard>
            </main>
          </div>
        </div>
      </>);

  }

  // Mobile-optimized padding: smaller dock on mobile, normal on desktop
  const mobileAwareMainPaddingClass =
  isCommsDockOpen && !dockMinimized ?
  'pb-64 md:pb-96' :
  isCommsDockOpen && dockMinimized ?
  'pb-12' :
  'pb-16 md:pb-0';
  const shouldShowTacticalFooter = TACTICAL_FOOTER_PAGES.has(currentPageName);

  return (
    <CommandPaletteProvider
      onNavigate={handleNavigate}
      onToggleContextPanel={toggleContextPanel}
      onToggleCommsDock={toggleCommsDock}
      onTriggerTestAlert={handleTriggerTestAlert}
      onCopyDiagnostics={handleCopyDiagnostics}
      onResetUILayout={handleResetUILayout}
      onReplayBoot={handleReplayBoot}>

      {/* Boot Overlay */}
      <BootOverlay forceShow={bootOverlay.showBoot} onDismiss={bootOverlay.dismiss} />
      <div className="nexus-shell-standard h-screen max-h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
         <a
          href="#main-content"
          className="absolute left-2 top-2 z-[1200] -translate-y-16 rounded bg-zinc-900 px-3 py-2 text-xs text-orange-300 border border-orange-500/40 transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-orange-500/40">

           Skip to main content
         </a>
         {/* CSS Debug Overlay */}
         <CSSDebugOverlay />

         {/* Notification Center */}
         <NotificationCenter />

        {/* Header — fixed at top (z-50) */}
        <Header />

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          <OfflineStatusBanner />
          <div className="flex-1 overflow-hidden flex">
            <main
              id="main-content"
              tabIndex={-1}
              className={`nexus-page-main flex-1 overflow-hidden ${mobileAwareMainPaddingClass}`}>

              <PermissionGuard>{children}</PermissionGuard>
            </main>


          </div>
        </div>

        {/* Bottom Text Comms Dock (fixed, collapsible) */}
         {isCommsDockOpen &&
        <div className="fixed bottom-0 left-0 right-0 z-[600] border-t border-orange-500/20 bg-zinc-950 transition-all duration-200">
             <TextCommsDock isOpen={true} isMinimized={dockMinimized} onMinimize={setDockMinimized} />
           </div>
        }

        {/* Command Palette Modal */}
        <CommandPaletteUI />

        {/* Tactical Footer - Integrated Tactical Map */}
        {shouldShowTacticalFooter ?
        <React.Suspense fallback={null}>
            <TacticalFooter />
          </React.Suspense> :
        null}

        {/* Mobile quick actions (touch-first nav + toggles) */}
        <MobileQuickActionBar onToggleCommsDock={toggleCommsDock} onToggleContextPanel={toggleContextPanel} />
        </div>
        </CommandPaletteProvider>);

}