import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import CommsDock from '@/components/layout/CommsDock';

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
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Header onToggleDock={() => setDockOpen(!dockOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        
        <CommsDock isOpen={dockOpen} onClose={() => setDockOpen(false)} />
      </div>
    </div>
  );
}

export { cn };