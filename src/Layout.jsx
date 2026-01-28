import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import SidePanel from '@/components/layout/SidePanel';
import CommsDock from '@/components/layout/CommsDock';
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
  const [dockOpen, setDockOpen] = useState(false);

  if (!children) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header — top navigation */}
      <Header onToggleDock={() => setDockOpen(!dockOpen)} />
      
      {/* Main layout grid: sidebar + content + dock */}
      <div className="flex flex-1 overflow-hidden">
        {/* SidePanel — left navigation with gating */}
        <SidePanel currentPageName={currentPageName} />

        {/* Main content area — route outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <PermissionGuard>
            {children}
          </PermissionGuard>
        </main>
        
        {/* CommsDock — right panel, collapsible */}
        <CommsDock isOpen={dockOpen} onClose={() => setDockOpen(false)} />
      </div>
    </div>
  );
}

export { cn };