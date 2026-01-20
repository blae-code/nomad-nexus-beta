import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import NavRail from '@/components/nav/NavRail';
import ContextPanel from '@/components/layout/ContextPanel';
import Header from '@/components/layout/Header';

/**
 * AppShell: Canonical 3-column grid layout
 * Col A: NavRail (fixed width, collapsible)
 * Col B: Main content (flexible)
 * Col C: RightContext (optional)
 */

export default function AppShell({ 
  children, 
  currentPage, 
  user,
  showRightPanel = true 
}) {
  const [isRailExpanded, setIsRailExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('navRail-expanded') === 'true';
    }
    return false;
  });

  // Persist rail state to localStorage
  useEffect(() => {
    localStorage.setItem('navRail-expanded', isRailExpanded);
  }, [isRailExpanded]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Header: Grid-aligned, spans all columns */}
      <Header isRailExpanded={isRailExpanded} showRightPanel={showRightPanel} />

      {/* Body: 3-column grid layout */}
      <div
        className="flex-1 h-full overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `var(--rail-w-${isRailExpanded ? 'expanded' : 'collapsed'}) 1fr ${
            showRightPanel ? '280px' : '0'
          }`,
          gap: '0',
        }}
      >
        {/* Col A: NavRail (fixed height, no scroll) */}
        <div className="h-full overflow-hidden">
          <NavRail
            currentPage={currentPage}
            user={user}
            isExpanded={isRailExpanded}
            onToggleExpand={() => setIsRailExpanded(!isRailExpanded)}
          />
        </div>

        {/* Col B: Main Content (fixed height, no scroll) */}
        <div className="h-full overflow-hidden flex flex-col">{children}</div>

        {/* Col C: Right Context Panel (fixed height, no scroll) */}
        {showRightPanel && (
          <div className="h-full overflow-hidden">
            <ContextPanel currentPage={currentPage} user={user} />
          </div>
        )}
      </div>

      {/* Dev-only NoScroll Guard */}
      {process.env.NODE_ENV === 'development' && <NoScrollGuard currentPage={currentPage} />}
    </div>
  );
}