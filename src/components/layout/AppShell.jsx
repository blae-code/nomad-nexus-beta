import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import NavRail from '@/components/nav/NavRail';
import ContextPanel from '@/components/layout/ContextPanel';
import ActivityBar from '@/components/layout/ActivityBar';
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
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      {/* Header: Grid-aligned, spans all columns */}
      <Header isRailExpanded={isRailExpanded} showRightPanel={showRightPanel} />

      {/* Body: 3-column grid layout */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `var(--rail-w-${isRailExpanded ? 'expanded' : 'collapsed'}) 1fr ${
            showRightPanel ? '280px' : '0'
          }`,
          gap: '0',
        }}
      >
        {/* Col A: NavRail */}
        <NavRail
          currentPage={currentPage}
          user={user}
          isExpanded={isRailExpanded}
          onToggleExpand={() => setIsRailExpanded(!isRailExpanded)}
        />

        {/* Col B: Main Content */}
        <div className="flex flex-col overflow-hidden">
          <ActivityBar />
          <div className="flex-1 overflow-hidden page-shell">{children}</div>
        </div>

        {/* Col C: Right Context Panel */}
        {showRightPanel && <ContextPanel currentPage={currentPage} user={user} />}
      </div>
    </div>
  );
}