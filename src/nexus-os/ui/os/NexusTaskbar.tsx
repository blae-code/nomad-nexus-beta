import React from 'react';
import { AppWindow, Activity, Wifi, WifiOff, PauseCircle, Bell, BellRing, CheckCheck, Trash2 } from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';
import type { NexusAppLifecycleEntry } from './appLifecycle';
import type { NexusTrayNotification } from './trayNotifications';

interface NexusTaskbarProps {
  bridgeId: string;
  activeAppId: string | null;
  appEntries: Record<string, NexusAppLifecycleEntry>;
  appCatalog: Array<{ id: string; label: string; hotkey?: string }>;
  online: boolean;
  eventPulseCount: number;
  notifications: NexusTrayNotification[];
  unreadNotifications: number;
  onActivateApp: (appId: string) => void;
  onSuspendApp: (appId: string) => void;
  onOpenCommandDeck: () => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
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

function labelForState(state: NexusAppLifecycleEntry['state'] | 'closed'): string {
  if (state === 'foreground') return 'Active';
  if (state === 'background') return 'Background';
  if (state === 'suspended') return 'Suspended';
  if (state === 'error') return 'Error';
  return 'Closed';
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

export default function NexusTaskbar({
  bridgeId,
  activeAppId,
  appEntries,
  appCatalog,
  online,
  eventPulseCount,
  notifications,
  unreadNotifications,
  onActivateApp,
  onSuspendApp,
  onOpenCommandDeck,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
}: NexusTaskbarProps) {
  const [trayOpen, setTrayOpen] = React.useState(false);
  const [trayFilter, setTrayFilter] = React.useState<'ALL' | 'UNREAD'>('UNREAD');

  const shownNotifications = React.useMemo(
    () =>
      (trayFilter === 'UNREAD'
        ? notifications.filter((entry) => !entry.read)
        : notifications
      ).slice(0, 8),
    [notifications, trayFilter]
  );
  const activeAppState = activeAppId ? appEntries[activeAppId]?.state || 'closed' : 'closed';
  const activeAppLabel = activeAppId ? appCatalog.find((entry) => entry.id === activeAppId)?.label || activeAppId : 'None';

  return (
    <section
      className="relative rounded-xl border border-zinc-700 px-2.5 py-1.5 flex items-center gap-2 overflow-visible nexus-panel-glow"
      style={{
        borderColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.28)',
        backgroundColor: 'rgba(10, 16, 23, 0.92)',
      }}
    >
      <div className="shrink-0 flex items-center gap-2">
        <NexusButton size="sm" intent="primary" onClick={onOpenCommandDeck} className="shrink-0">
          <AppWindow className="w-3.5 h-3.5 mr-1" />
          Command Deck
        </NexusButton>
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wide">
          <span>Active:</span>
          <NexusBadge tone={toneForState(activeAppState)}>{activeAppLabel} {labelForState(activeAppState)}</NexusBadge>
        </div>
      </div>

      <div className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Applications</div>
        <div className="mt-1 flex items-center gap-1 overflow-auto pr-1">
          {appCatalog.map((app) => {
            const state = appEntries[app.id]?.state || 'closed';
            const active = activeAppId === app.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onActivateApp(app.id)}
                className={`h-8 shrink-0 rounded border px-2 inline-flex items-center gap-1.5 text-xs transition-colors ${
                  active
                    ? 'border-sky-500/55 bg-sky-950/25 text-sky-100'
                    : 'border-zinc-700 bg-zinc-900/55 text-zinc-300 hover:border-zinc-500'
                }`}
                title={app.hotkey ? `${app.label} (${app.hotkey})` : app.label}
              >
                <span className={`h-2 w-2 rounded-full ${dotForState(state)}`} />
                <span>{app.label}</span>
                {active ? <span className="text-[10px] text-sky-300">ACTIVE</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1.5">
        <NexusButton
          size="sm"
          intent="subtle"
          disabled={!activeAppId || activeAppState !== 'foreground'}
          onClick={() => {
            if (!activeAppId) return;
            onSuspendApp(activeAppId);
          }}
          title={activeAppId ? `Suspend ${activeAppLabel}` : 'No active foreground app'}
        >
          <PauseCircle className="w-3.5 h-3.5 mr-1" />
          Suspend
        </NexusButton>
        <button
          type="button"
          onClick={() => setTrayOpen((prev) => !prev)}
          className="relative h-8 px-2 rounded border border-zinc-700 bg-zinc-900/55 text-zinc-200 hover:border-zinc-500 inline-flex items-center gap-1"
          title="Notification tray"
        >
          {unreadNotifications > 0 ? <BellRing className="w-3.5 h-3.5 text-sky-300" /> : <Bell className="w-3.5 h-3.5" />}
          <span className="text-[11px]">Alerts {unreadNotifications > 0 ? unreadNotifications : notifications.length}</span>
        </button>
        <NexusBadge tone="active">Bridge {bridgeId}</NexusBadge>
        <NexusBadge tone={eventPulseCount > 0 ? 'warning' : 'neutral'} className="hidden lg:inline-flex">
          <Activity className="w-3 h-3 mr-1" />
          Pulse {eventPulseCount}
        </NexusBadge>
        <NexusBadge tone={online ? 'ok' : 'danger'} className="hidden lg:inline-flex">
          {online ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {online ? 'Online' : 'Offline'}
        </NexusBadge>
      </div>

      {trayOpen ? (
        <div
          className="absolute right-2 bottom-full mb-2 w-[min(420px,92vw)] rounded-xl border border-zinc-700 shadow-xl p-2 z-[1200] nexus-panel-glow"
          style={{
            borderColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.28)',
            backgroundColor: 'rgba(10, 15, 23, 0.97)',
          }}
        >
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Alerts Center</div>
            <div className="flex items-center gap-1.5">
              <NexusButton
                size="sm"
                intent={trayFilter === 'UNREAD' ? 'primary' : 'subtle'}
                onClick={() => setTrayFilter('UNREAD')}
                title="Show unread alerts"
              >
                Unread
              </NexusButton>
              <NexusButton
                size="sm"
                intent={trayFilter === 'ALL' ? 'primary' : 'subtle'}
                onClick={() => setTrayFilter('ALL')}
                title="Show all alerts"
              >
                All
              </NexusButton>
              <NexusButton size="sm" intent="subtle" onClick={onMarkAllNotificationsRead} title="Mark all notifications as read">
                <CheckCheck className="w-3.5 h-3.5" />
              </NexusButton>
              <NexusButton size="sm" intent="subtle" onClick={onClearNotifications} title="Clear notifications">
                <Trash2 className="w-3.5 h-3.5" />
              </NexusButton>
            </div>
          </div>

          {shownNotifications.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
              No notifications yet.
            </div>
          ) : (
            <div className="max-h-56 overflow-auto space-y-1 pr-1">
              {shownNotifications.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => onMarkNotificationRead(notice.id)}
                  className="w-full text-left rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1.5 hover:border-zinc-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-200 truncate">{notice.title}</span>
                    <div className="shrink-0 flex items-center gap-1">
                      <NexusBadge tone={toneForNotificationLevel(notice.level)}>{notice.level.slice(0, 3).toUpperCase()}</NexusBadge>
                      <span className="text-[10px] text-zinc-500">{ageLabel(notice.createdAt)}</span>
                    </div>
                  </div>
                  {notice.detail ? <div className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{notice.detail}</div> : null}
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {notice.source || 'system'} · {notice.read ? 'read' : 'unread'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
