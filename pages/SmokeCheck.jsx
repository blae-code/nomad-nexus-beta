import { useMemo, useState } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import AdminDevTools from '@/components/admin/AdminDevTools';
import DemoPreflight from '@/components/admin/steps/DemoPreflight';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROUTES = [
  { label: 'Hub', path: '/hub' },
  { label: 'Events', path: '/events' },
  { label: 'CommsConsole', path: '/comms-console' },
];

const noopAudit = async () => {};

export default function SmokeCheck() {
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const demoEnabled = false;
  const demoBadge = useMemo(() => (demoEnabled ? 'ENABLED' : 'DISABLED'), [demoEnabled]);

  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center p-6">
        <div className="max-w-lg w-full border border-zinc-800 bg-zinc-950/80 p-6 space-y-3">
          <h1 className="text-xl font-semibold text-zinc-100">Smoke Check</h1>
          <p className="text-sm text-zinc-400">
            This page is only available in development builds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border border-zinc-800 bg-zinc-950/80 p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-zinc-100">Smoke Check</h1>
          <p className="text-sm text-zinc-400">
            Use this panel to validate the core routes and demo-mode behavior without touching paid services.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300">Demo Mode</h2>
              <Badge
                className={cn(
                  'text-[10px] uppercase tracking-widest',
                  demoEnabled ? 'bg-green-900/50 text-green-200 border-green-800' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                )}
              >
                {demoBadge}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              Toggle demo mode to validate flows without Base44 or LiveKit configuration.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="text-[10px] h-7 bg-[#ea580c] hover:bg-[#ea580c]/90"
                onClick={() => setDemoMode(true)}
              >
                Enable Demo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 border-zinc-800"
                onClick={() => setDemoMode(false)}
              >
                Disable Demo
              </Button>
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300">Route Checks</h2>
            <p className="text-xs text-zinc-500">
              Open each route in a new tab and confirm it renders without crashing.
            </p>
            <div className="flex flex-wrap gap-2">
              {ROUTES.map((route) => (
                <Button
                  key={route.path}
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 border-zinc-800"
                  onClick={() => window.open(`${route.path}?demo=1`, '_blank', 'noopener,noreferrer')}
                >
                  Open {route.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300">Admin Dev Tools</h2>
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 border-zinc-800"
                onClick={() => setShowAdminTools((prev) => !prev)}
              >
                {showAdminTools ? 'Hide' : 'Render'}
              </Button>
            </div>
            {showAdminTools ? (
              <ErrorBoundary>
                <AdminDevTools />
              </ErrorBoundary>
            ) : (
              <p className="text-xs text-zinc-500">Click Render to mount AdminDevTools and ensure it does not throw.</p>
            )}
          </div>

          <div className="border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300">Demo Preflight</h2>
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-7 border-zinc-800"
                onClick={() => setShowPreflight((prev) => !prev)}
              >
                {showPreflight ? 'Hide' : 'Render'}
              </Button>
            </div>
            {showPreflight ? (
              <ErrorBoundary>
                <DemoPreflight user={null} onAudit={noopAudit} />
              </ErrorBoundary>
            ) : (
              <p className="text-xs text-zinc-500">Click Render to mount DemoPreflight and verify it does not throw.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

