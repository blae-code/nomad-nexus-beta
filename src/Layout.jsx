import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '@/globals.css';
import AppShellV3 from "@/components/layout/AppShellV3";
import LayoutDebugMode from "@/components/layout/LayoutDebugMode";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { initializeAccessToken } from "@/components/hooks/useAccessToken";
import CommsDockShell from "@/components/comms/CommsDockShell";
      import RadialFeedbackMenu from "@/components/feedback/RadialFeedbackMenu";

const pageMap = {
        '/': 'hub',
        '/hub': 'hub',
        '/academy': 'academy',
        '/nomadopsdashboard': 'mission',
        '/events': 'events',
        '/commsconsole': 'comms',
        '/intelligence': 'intelligence',
        '/admin': 'admin',
        '/adminconsole': 'admin', // deprecated, redirect to /admin
        '/universemap': 'universemap',
        '/fleetmanager': 'fleetmanager',
        '/rescue': 'rescue',
        '/channels': 'channels',
        '/profile': 'profile',
        '/settings': 'settings',
        '/access-gate': 'access-gate',
      };

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initApp = async () => {
      try {
        initializeAccessToken();
        const u = await base44.auth.me();
        setUser(u);

        // Skip profile check if already on access gate
        if (location.pathname === '/access-gate') {
          setMemberProfile(null);
          return;
        }

        // Check for member profile
        const profiles = await base44.entities.MemberProfile.filter({ user_id: u.id });
        const profile = profiles?.[0];

        if (!profile || !profile.onboarding_completed) {
          // Redirect to access gate
          window.location.href = '/access-gate';
          return;
        }
        setMemberProfile(profile);
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
    
    // Redirect root to Hub page if not already there
    if (location.pathname === '/' || location.pathname === '') {
      window.history.replaceState({}, '', '/hub');
    }
  }, [location.pathname]);

  // Register service worker for PWA support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(() => console.log('Service Worker registered'))
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  }, []);

  // Ensure root path always maps to hub
  const currentPage = location.pathname === '/' || location.pathname === '' ? 'hub' : pageMap[location.pathname.toLowerCase()] || 'hub';

  return (
    <ErrorBoundary>
    <div className="h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-[#ea580c]/30 flex flex-col overflow-hidden">
      {/* PWA Meta Tags */}
      <meta name="theme-color" content="#ea580c" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Nexus" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%23ea580c' rx='48'/><circle cx='96' cy='60' r='12' fill='%23090a0b'/><circle cx='96' cy='96' r='12' fill='%23090a0b'/><circle cx='96' cy='132' r='12' fill='%23090a0b'/></svg>" />
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppShellV3 currentPage={currentPage} user={user}>
          <div className="pt-14 pb-2">
            {children}
          </div>
        </AppShellV3>
        {/* Comms Dock */}
          {user && <CommsDockShell user={user} />}
        </div>

        {/* User Feedback System */}
        <RadialFeedbackMenu />

        {/* Layout Debug Mode (Ctrl+Shift+G to toggle) */}
        <LayoutDebugMode />
        </div>
        </ErrorBoundary>
        );
        }