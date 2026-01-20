import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '@/globals.css';
import AppShellV3 from "@/components/layout/AppShellV3";
import LayoutDebugMode from "@/components/layout/LayoutDebugMode";
import { base44 } from "@/api/base44Client";
import { initializeAccessToken } from "@/components/hooks/useAccessToken";

const pageMap = {
  '/hub': 'hub',
  '/nomadopsdashboard': 'mission',
  '/events': 'events',
  '/commsconsole': 'comms',
  '/intelligence': 'intelligence',
  '/adminconsole': 'admin',
  '/admin': 'admin',
  '/': 'hub',
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    initializeAccessToken();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const currentPage = pageMap[location.pathname.toLowerCase()] || 'hub';

  return (
    <div className="h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-[#ea580c]/30 flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --font-sans: 'Rajdhani', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --radius: 0px !important;
          --rail-w-collapsed: 72px;
          --rail-w-expanded: 240px;
          --gutter: 16px;
          --divider-color: #27272a;
        }

        body {
          font-family: var(--font-sans);
          background-color: #09090b;
          color: #e4e4e7;
        }
        
        /* Force sharp corners on everything */
        * {
          border-radius: 0px !important;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #18181b;
        }
        ::-webkit-scrollbar-thumb {
          background: #3f3f46;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #ea580c;
        }

        /* Global button hover effect */
        button, .button-hover-effect {
          transition: all 0.1s ease-out;
        }
        button:hover, .button-hover-effect:hover {
          border-color: #ea580c !important;
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.2);
        }
        
        /* Technical borders */
        .tech-border {
          border: 1px solid #27272a;
          position: relative;
        }
        .tech-border:after {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          width: 6px;
          height: 6px;
          border-top: 1px solid #ea580c;
          border-left: 1px solid #ea580c;
          opacity: 0.5;
        }
      `}</style>



      {/* AppShellV3: No left rail, palette-driven nav */}
      <AppShellV3 currentPage={currentPage} user={user}>
              <div className="pt-14">
                {children}
              </div>
            </AppShellV3>

      {/* Layout Debug Mode (Ctrl+Shift+G to toggle) */}
      <LayoutDebugMode />
    </div>
  );
}