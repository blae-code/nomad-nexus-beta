import React from 'react';
import {
  AppWindow,
  Activity,
  Wifi,
  WifiOff,
  PauseCircle,
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';
import type { NexusAppLifecycleEntry } from './appLifecycle';
import type { NexusTrayNotification } from './trayNotifications';

interface NexusTaskbarProps {
  activeAppId: string | null;
  appEntries: Record<string, NexusAppLifecycleEntry>;
  appCatalog: Array<{ id: string; label: string; hotkey?: string }>;
  onActivateApp: (appId: string) => void;
}

function toneForState(state: NexusAppLifecycleEntry['state']) {
  if (state === 'foreground') return 'ok';
  if (state === 'background') return 'active';
  if (state === 'suspended') return 'warning';
  if (state === 'error') return 'danger';
  return 'neutral';
}

function toneForNotificationLevel(level: NexusTrayNotification['level']) {
  if (level === 'critical') return 'danger';
  if (level === 'warning') return 'warning';
  if (level === 'success') return 'ok';
  return 'active';
}

function dotForState(state: NexusAppLifecycleEntry['state'] | 'closed'): string {
  if (state === 'foreground') return 'bg-emerald-400';
  if (state === 'background') return 'bg-sky-400';
  if (state === 'suspended') return 'bg-amber-400';
  if (state === 'error') return 'bg-red-400';
  return 'bg-zinc-600';
}

function ageLabel(timestamp: string): string {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
  return `${Math.floor(ageSeconds / 3600)}h`;
}

function compactLabel(value: string, max = 10): string {
  const clean = String(value || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export default function NexusTaskbar({
  activeAppId,
  appEntries,
  appCatalog,
  onActivateApp,
}: NexusTaskbarProps) {
  const [appPage, setAppPage] = React.useState(0);
  const appsPerPage = 6;

  const appPageCount = Math.max(1, Math.ceil(appCatalog.length / appsPerPage));
  const shownApps = React.useMemo(
    () => appCatalog.slice(appPage * appsPerPage, appPage * appsPerPage + appsPerPage),
    [appCatalog, appPage, appsPerPage]
  );

  React.useEffect(() => {
    setAppPage((prev) => Math.min(prev, appPageCount - 1));
  }, [appPageCount]);

  return (
    <section className="relative nx-taskbar-strip">
      <div className="nx-taskbar-launcher">
        {appPageCount > 1 ? (
          <button
            type="button"
            className="nx-taskbar-nav-btn"
            onClick={() => setAppPage((prev) => Math.max(0, prev - 1))}
            disabled={appPage === 0}
            aria-label="Previous app set"
            title="Previous app set"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : null}
        <div className="nx-taskbar-app-grid">
          {shownApps.map((app) => {
            const state = appEntries[app.id]?.state || 'closed';
            const active = activeAppId === app.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onActivateApp(app.id)}
                className={`nx-taskbar-app ${active ? 'is-active' : ''}`}
                title={app.hotkey ? `${app.label} (${app.hotkey})` : app.label}
              >
                <span className={`h-2 w-2 rounded-full ${dotForState(state)}`} />
                <span className="truncate">{compactLabel(app.label, 9)}</span>
              </button>
            );
          })}
        </div>
        {appPageCount > 1 ? (
          <>
            <NexusBadge tone="neutral" className="hidden md:inline-flex">
              {appPage + 1}/{appPageCount}
            </NexusBadge>
            <button
              type="button"
              className="nx-taskbar-nav-btn"
              onClick={() => setAppPage((prev) => Math.min(appPageCount - 1, prev + 1))}
              disabled={appPage >= appPageCount - 1}
              aria-label="Next app set"
              title="Next app set"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}