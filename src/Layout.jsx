import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '@/globals.css';
import AppShellV3 from "@/components/layout/AppShellV3";
import LayoutDebugMode from "@/components/layout/LayoutDebugMode";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { initializeAccessToken } from "@/components/hooks/useAccessToken";
import CommsDockShell from "@/components/comms/CommsDockShell";
import RadialFeedbackMenu from "@/components/feedback/RadialFeedbackMenu";
import { createPageUrl } from "@/utils";
import { theme } from "@/styles/theme";

// Helper: normalize module objects to actual components
const asComponent = (x) => (x && typeof x === 'object' && 'default' in x ? x.default : x);

const accessGatePath = createPageUrl('AccessGate');
const accessGateAliases = new Set(
  [accessGatePath, '/accessgate', '/AccessGate', '/login'].map((path) => path.toLowerCase()),
);

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
        '/accessgate': 'access-gate', // Support both hyphenated and non-hyphenated
        '/login': 'access-gate', // Route /login to access-gate
      };

const iconAccent = theme.colors.accent.replace('#', '%23');
const iconBackground = theme.colors.background.replace('#', '%23');

export default function Layout({ children, currentPageName }) {
  console.log('[LAYOUT] Component mounting...');
  const [user, setUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
  useEffect(() => {
    const timeoutPromise = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );

    const initApp = async () => {
      try {
        initializeAccessToken();

        const isAccessGatePath = accessGateAliases.has(location.pathname.toLowerCase());
        
        // Allow access-gate to render without auth checks (it's a public gate page)
        if (isAccessGatePath) {
          setLoading(false);
          return;
        }

        // Fetch user with 8s timeout
        let u;
        try {
          u = await Promise.race([
            base44.auth.me(),
            timeoutPromise(8000)
          ]);
          setUser(u);
        } catch (authError) {
          console.error('[LAYOUT] Auth failed or timed out:', authError);
          setLoading(false);
          navigate(accessGatePath, { replace: true });
          return;
        }

        // Admin bypass: system admins skip profile/onboarding checks
        if (u.role === 'admin') {
          console.log('[LAYOUT] Admin bypass - skipping profile check');
          setLoading(false);
          return;
        }

        // Check for member profile with 8s timeout - only for non-admin users
        try {
          const profiles = await Promise.race([
            base44.entities.MemberProfile.filter({ user_id: u.id }),
            timeoutPromise(8000)
          ]);
          const profile = profiles?.[0];

          if (!profile || !profile.onboarding_completed) {
            // Set loading to false first to prevent flicker
            setLoading(false);
            // Navigate using react-router to prevent full page reload
            navigate(accessGatePath, { replace: true });
            return;
          }
          setMemberProfile(profile);
        } catch (err) {
          console.error('[LAYOUT] Profile check failed or timed out:', err);
          // Fail-open: allow through to prevent lockout
          setMemberProfile(null);
        }
      } catch (error) {
        console.error('[LAYOUT] Init error:', error);
        setLoading(false);
        navigate(accessGatePath, { replace: true });
      } finally {
        setLoading(false);
      }
    };

    // Watchdog: force recovery after 12s if still loading
    const watchdog = setTimeout(() => {
      console.error('[LAYOUT] Init watchdog triggered - forcing recovery');
      setLoading(false);
      if (!accessGateAliases.has(location.pathname.toLowerCase())) {
        navigate(accessGatePath, { replace: true });
      }
    }, 12000);

    initApp();

    return () => clearTimeout(watchdog);
  }, [location.pathname, navigate]);

  // Register service worker for PWA support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(() => console.log('Service Worker registered'))
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  }, []);

  // Redirect root to /hub using react-router
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/hub', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Ensure root path always maps to hub
  const currentPage = location.pathname === '/' || location.pathname === '' ? 'hub' : pageMap[location.pathname.toLowerCase()] || 'hub';

  // Show loading state while initializing (AFTER all hooks)
  if (loading && !accessGateAliases.has(location.pathname.toLowerCase())) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,hsl(var(--accent)/0.03)_50%,transparent_75%,transparent_100%)] bg-[length:40px_40px] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-3xl" />

        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Initializing Nexus...</p>
          <p className="text-[10px] font-mono text-zinc-700 mt-4">AUTHENTICATING SESSION</p>
        </div>
      </div>
    );
  }

  // Normalize children component (could be module object)
  const ChildComponent = asComponent(children);

  return (
    <ErrorBoundary>
    <div className="h-screen bg-background text-foreground font-sans selection:bg-accent/30 flex flex-col overflow-hidden">
      {/* PWA Meta Tags */}
      <meta name="theme-color" content={theme.colors.accent} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Nexus" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
      <link rel="manifest" href="/manifest.json" />
      <link
        rel="icon"
        type="image/svg+xml"
        href={`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='${iconAccent}' rx='48'/><circle cx='96' cy='60' r='12' fill='${iconBackground}'/><circle cx='96' cy='96' r='12' fill='${iconBackground}'/><circle cx='96' cy='132' r='12' fill='${iconBackground}'/></svg>`}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --font-sans: 'Rajdhani', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --radius: 0px !important;
          --rail-w-collapsed: 72px;
          --rail-w-expanded: 240px;
          --gutter: 16px;
          --divider-color: hsl(var(--border));
        }

        body {
          font-family: var(--font-sans);
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
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
          background: hsl(var(--card));
        }
        ::-webkit-scrollbar-thumb {
          background: hsl(var(--surface-strong));
        }
        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--accent));
        }

        /* Global button hover effect */
        button, .button-hover-effect {
          transition: all 0.1s ease-out;
        }
        button:hover, .button-hover-effect:hover {
          border-color: hsl(var(--accent)) !important;
          box-shadow: 0 0 8px hsl(var(--accent) / 0.2);
        }
        
        /* Technical borders */
        .tech-border {
          border: 1px solid hsl(var(--border));
          position: relative;
        }
        .tech-border:after {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          width: 6px;
          height: 6px;
          border-top: 1px solid hsl(var(--accent));
          border-left: 1px solid hsl(var(--accent));
          opacity: 0.5;
        }
      `}</style>



      {/* AppShellV3: No left rail, palette-driven nav */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentPage === 'access-gate' ? (
          // Access gate: full-screen, no chrome
          <div className="h-full w-full">
            <ChildComponent />
          </div>
        ) : (
          <AppShellV3 currentPage={currentPage} user={user}>
            <div className="pt-14 pb-2">
              <ChildComponent />
            </div>
          </AppShellV3>
        )}
        {/* Comms Dock - hide on access gate */}
          {user && currentPage !== 'access-gate' && <CommsDockShell user={user} />}
        </div>

        {/* User Feedback System */}
        <RadialFeedbackMenu />

        {/* Layout Debug Mode (Ctrl+Shift+G to toggle) */}
        <LayoutDebugMode />
        </div>
        </ErrorBoundary>
        );
        }