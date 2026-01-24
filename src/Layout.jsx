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
import { theme } from "@/components/theme";

// ============================================================
// Component Resolver: Handle ESM module objects gracefully
// ============================================================
const resolveComponent = (x) => {
  if (!x) return null;
  // ESM module object: { default: Component }
  if (typeof x === "object" && x.default && typeof x.default === "function") {
    console.log("[Layout] Resolved ESM module to default export");
    return x.default;
  }
  // Wrapped component: { Component: fn }
  if (typeof x === "object" && x.Component && typeof x.Component === "function") {
    console.log("[Layout] Resolved wrapped component");
    return x.Component;
  }
  // Already a function
  if (typeof x === "function") {
    return x;
  }
  console.warn("[Layout] Unresolvable component:", x);
  return null;
};

const isFn = (x) => typeof x === "function";
const SafePageWrapper = ({ component: Comp, fallbackMessage }) => {
  const ResolvedComp = resolveComponent(Comp);
  
  if (!isFn(ResolvedComp)) {
    return (
      <div style={{ padding: "24px", background: "#1a1a1a", color: "#fff", borderRadius: "8px", margin: "24px" }}>
        <h2 style={{ marginTop: 0, color: "#ff6b6b" }}>⚠️ Page Load Error</h2>
        <p>{fallbackMessage}</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#0a0a0a", padding: "12px", borderRadius: "4px", fontSize: "12px", color: "#888" }}>
          {`Component type: ${typeof Comp}\n`}
          {Comp && typeof Comp === "object" ? `Keys: ${Object.keys(Comp).join(", ")}\n` : ""}
          {`Resolved to: ${typeof ResolvedComp}`}
        </pre>
      </div>
    );
  }
  
  return <ResolvedComp />;
};

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
          const isAuthenticated = await base44.auth.isAuthenticated();
          if (!isAuthenticated) {
            // Not authenticated - redirect to AccessGate, never call redirectToLogin
            console.log('[LAYOUT] User not authenticated, redirecting to AccessGate');
            setLoading(false);
            navigate(accessGatePath, { replace: true });
            return;
          }
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
    console.log("[Layout] Displaying loading state");
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

  console.log("[Layout] Rendering main layout, currentPage:", currentPage);
  
  const SafeAppShellV3 = resolveComponent(AppShellV3);
  const SafeCommsDockShell = resolveComponent(CommsDockShell);
  const SafeRadialFeedbackMenu = resolveComponent(RadialFeedbackMenu);
  const SafeLayoutDebugMode = resolveComponent(LayoutDebugMode);
  
  if (!isFn(SafeAppShellV3)) {
    console.error("[Layout] AppShellV3 failed to resolve");
    return (
      <SafePageWrapper 
        component={AppShellV3} 
        fallbackMessage="AppShellV3 component failed to load" 
      />
    );
  }

  return (
    <ErrorBoundary>
      {/* TODO: Move meta/link/style tags to index.html or head manager after demo */}
      <div className="h-screen bg-background text-foreground font-sans selection:bg-accent/30 flex flex-col overflow-hidden">
        {/* AppShellV3: No left rail, palette-driven nav */}
        <div className="flex-1 flex flex-col overflow-hidden pb-12">
          {currentPage === 'access-gate' ? (
            // Access gate: full-screen, no chrome
            <div className="h-full w-full">
              {children}
            </div>
          ) : (
            <SafeAppShellV3 currentPage={currentPage} user={user}>
              <div className="pt-14 pb-2">
                {children}
              </div>
            </SafeAppShellV3>
          )}
        </div>

        {/* Comms Dock - hide on access gate */}
        {user && currentPage !== 'access-gate' && isFn(SafeCommsDockShell) ? <SafeCommsDockShell user={user} /> : null}

        {/* User Feedback System */}
        {isFn(SafeRadialFeedbackMenu) ? <SafeRadialFeedbackMenu /> : null}

        {/* Layout Debug Mode (Ctrl+Shift+G to toggle) */}
        {isFn(SafeLayoutDebugMode) ? <SafeLayoutDebugMode /> : null}
      </div>
    </ErrorBoundary>
  );
  }