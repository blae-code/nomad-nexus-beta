import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LeftNavRail from './LeftNavRail';
import TopStatusBar from './TopStatusBar';
import ContextPanel from './ContextPanel';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const pageMap = {
  '/hub': 'hub',
  '/nomadopsdashboard': 'mission',
  '/events': 'events',
  '/commsconsole': 'comms',
  '/admin': 'admin',
  '/': 'hub',
};

export default function OpsShell({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const currentPage = pageMap[location.pathname.toLowerCase()] || 'hub';

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-[#ea580c]/30 flex flex-col overflow-hidden">
      {/* Top Status Bar */}
      <TopStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Rail */}
        <LeftNavRail currentPage={currentPage} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-black">
          {children}
        </main>

        {/* Right Context Panel */}
        <ContextPanel currentPage={currentPage} user={user} />
      </div>
    </div>
  );
}