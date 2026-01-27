import { useState, useEffect } from 'react';
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
import { isDemoMode } from "@/lib/demo-mode";

// DEMO: stub Base44 platform endpoints that are currently 500'ing.
// IMPORTANT: must run at module load (not inside useEffect) to catch early requests.
const __DEMO_STUB_B44__ = typeof window !== "undefined" && isDemoMode();

function __safeDefine(obj, key, value) {
  try {
    Object.defineProperty(obj, key, { value, configurable: true });
  } catch (_) {
    try { obj[key] = value; } catch (_) {}
  }
}

function __mockJsonResponse(xhr, bodyObj) {
  const body = JSON.stringify(bodyObj);

  __safeDefine(xhr, "status", 200);
  __safeDefine(xhr, "statusText", "OK");
  __safeDefine(xhr, "readyState", 4);
  __safeDefine(xhr, "responseURL", xhr.__demo_url || "");
  __safeDefine(xhr, "responseType", "");
  __safeDefine(xhr, "response", body);
  __safeDefine(xhr, "responseText", body);
  xhr.getAllResponseHeaders = () => "content-type: application/json\r\n";

  // Fire callbacks/events
  try { xhr.onreadystatechange && xhr.onreadystatechange(); } catch (_) {}
  try { xhr.onload && xhr.onload(); } catch (_) {}
  try { xhr.onloadend && xhr.onloadend(); } catch (_) {}
}

if (__DEMO_STUB_B44__) {
  // 1) fetch stub (covers relative fetches if any)
  const __origFetch = window.fetch?.bind(window);
  if (__origFetch) {
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input?.url || "";

      if (url.includes("/api/prompt-suggestions")) {
        return new Response(
          JSON.stringify({ suggestions: ["Start group voice test", "Invite a user", "Open Comms Console"] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/apps/") && url.includes("/chat/message")) {
        return new Response(
          JSON.stringify({ message: "Demo mode: chat endpoint stubbed (platform 500)." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return __origFetch(input, init);
    };
  }

  // 2) XHR stub (THIS is what your stack trace shows: xhr @ vendors...js)
  const __origOpen = XMLHttpRequest.prototype.open;
  const __origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__demo_method = method;
    this.__demo_url = String(url || "");
    return __origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const url = this.__demo_url || "";

    if (url.includes("/api/prompt-suggestions")) {
      __mockJsonResponse(this, {
        suggestions: ["Start group voice test", "Invite a user", "Open Comms Console"],
      });
      return;
    }

    if (url.includes("/api/apps/") && url.includes("/chat/message")) {
      __mockJsonResponse(this, {
        message: "Demo mode: chat endpoint stubbed (platform 500).",
      });
      return;
    }

    return __origSend.call(this, body);
  };
}

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
  const isVisualTest = import.meta.env.VITE_VISUAL_TEST === 'true';

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
  useEffect(() => {
    if (isVisualTest) {
      setLoading(false);
      return undefined;
    }
    const timeoutPromise = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  const isAccessGatePath = accessGateAliases.has(location.pathname.toLowerCase());

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
        useEffect(() => {
          const initApp = async () => {
            try {
              initializeAccessToken();

              // Allow access-gate to render without auth checks (it's a public gate page)
              if (isAccessGatePath) {
                setLoading(false);
                return;
              }

              // Check auth first - single call
              const isAuthenticated = await base44.auth.isAuthenticated();
              if (!isAuthenticated) {
                console.log('[LAYOUT] Not authenticated, redirecting to AccessGate');
                setLoading(false);
                navigate(accessGatePath, { replace: true });
                return;
              }

              // Fetch user once
              const u = await base44.auth.me();
              setUser(u);

              // Admin bypass: skip profile checks
              if (u.role === 'admin') {
                console.log('[LAYOUT] Admin detected, skipping profile check');
                setLoading(false);
                return;
              }

              // Check profile for non-admin users
              let profile = null;
              try {
                const profiles = await base44.entities.MemberProfile.filter({ user_id: u.id });
                profile = profiles?.[0] ?? null;
              } catch (profileError) {
                console.warn('[LAYOUT] MemberProfile lookup failed, continuing:', profileError);
                setLoading(false);
                return;
              }

              if (!profile || !profile.onboarding_completed) {
                console.log('[LAYOUT] Onboarding incomplete, redirecting to AccessGate');
                setLoading(false);
                if (!isAccessGatePath) {
                  navigate(accessGatePath, { replace: true });
                }
                return;
              }

              setMemberProfile(profile);
              setLoading(false);
            } catch (error) {
              console.error('[LAYOUT] Init error:', error);
              setLoading(false);
              if (!isAccessGatePath) {
                navigate(accessGatePath, { replace: true });
              }
            }
          };

    return () => clearTimeout(watchdog);
  }, [isVisualTest, location.pathname, navigate]);
          initApp();
        }, [location.pathname, navigate]);

  // DEMO: disable service worker to prevent stale hashed asset 404s
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
      caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  // Redirect root to /hub using react-router
  useEffect(() => {
    if (!isAccessGatePath && (location.pathname === '/' || location.pathname === '')) {
      navigate('/hub', { replace: true });
    }
  }, [location.pathname, navigate, isAccessGatePath]);

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
        {isDemoMode() && (
          <div className="w-full bg-amber-900/60 text-amber-100 text-[10px] font-mono uppercase tracking-widest px-3 py-1 border-b border-amber-700/50">
            Demo Mode • Local data + simulated services
          </div>
        )}
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
        <LayoutDebugMode />
        </div>
        </ErrorBoundary>
        );
        }
        {isFn(SafeLayoutDebugMode) ? <SafeLayoutDebugMode /> : null}
      </div>
    </ErrorBoundary>
  );
}
