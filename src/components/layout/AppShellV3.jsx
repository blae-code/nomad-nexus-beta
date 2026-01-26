import React from 'react';
import HeaderV3 from '@/components/layout/HeaderV3';
import ContextPanel from '@/components/layout/ContextPanel';
import NoScrollGuard from '@/components/layout/NoScrollGuard';
import BootSplashOverlay from '@/components/layout/BootSplashOverlay';
import { SURFACE_BG_CLASS, SURFACE_BORDER_CLASS } from '@/components/layout/headerStyles';

/**
 * AppShellV3: Palette-driven, header-only nav
 * - No left rail
 * - Header spans full width
 * - 2-column body: [Main 1fr] [RightContext optional]
 */

export default function AppShellV3({ children, currentPage, user, showRightPanel = true }) {
  console.log('[AppShellV3] Rendering, currentPage:', currentPage);
  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 flex flex-col">
      {/* Boot Splash Overlay */}
      <BootSplashOverlay />

      {/* Fixed Header */}
      <HeaderV3 />

      {/* Body: 2-column layout (no left rail) */}
      <div className="flex-1 h-full overflow-hidden flex gap-0">
        {/* Main content (full width or minus right panel) */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">{children}</div>

        {/* Optional right context panel */}
          {showRightPanel && (
            <div
              className={`w-80 h-full overflow-hidden border-l flex flex-col shrink-0 ${SURFACE_BG_CLASS} ${SURFACE_BORDER_CLASS}`}
            >
              <ContextPanel currentPage={currentPage} user={user} />
            </div>
          )}
      </div>

      {/* Dev-only NoScroll Guard */}
      {import.meta.env.DEV && <NoScrollGuard currentPage={currentPage} />}
    </div>
  );
}
