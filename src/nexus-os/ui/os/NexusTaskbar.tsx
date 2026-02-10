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

  const shownNotifications = notifications.slice(0, 8);

  return (
    <section className="relative rounded-lg border border-zinc-800 bg-zinc-950/85 px-2 py-2 flex items-center gap-2 overflow-visible">
      <NexusButton size="sm" intent="subtle" onClick={onOpenCommandDeck} className="shrink-0">
        <AppWindow className="w-3.5 h-3.5 mr-1" />
        Nexus
      </NexusButton>

      <div className="min-w-0 flex-1 flex items-center gap-1 overflow-auto">
        {appCatalog.map((app) => {
          const entry = appEntries[app.id];
          const active = activeAppId === app.id;
          return (
            <div key={app.id} className="flex items-center gap-1 shrink-0">
              <NexusButton
                size="sm"
                intent={active ? 'primary' : 'subtle'}
                onClick={() => onActivateApp(app.id)}
                className="h-8 px-2"
                title={app.hotkey ? `${app.label} (${app.hotkey})` : app.label}
              >
                {app.label}
              </NexusButton>
              <NexusBadge tone={toneForState(entry?.state || 'closed')} className="h-6 px-1.5">
                {(entry?.state || 'closed').slice(0, 3)}
              </NexusBadge>
              {entry?.state === 'foreground' ? (
                <button
                  type="button"
                  className="h-6 w-6 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 grid place-items-center"
                  title={`Suspend ${app.label}`}
                  onClick={() => onSuspendApp(app.id)}
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTrayOpen((prev) => !prev)}
          className="relative h-7 px-2 rounded border border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:border-zinc-500 inline-flex items-center gap-1"
          title="Notification tray"
        >
          {unreadNotifications > 0 ? <BellRing className="w-3.5 h-3.5 text-orange-300" /> : <Bell className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{unreadNotifications > 0 ? unreadNotifications : notifications.length}</span>
        </button>
        <NexusBadge tone="active">{bridgeId}</NexusBadge>
        <NexusBadge tone={eventPulseCount > 0 ? 'warning' : 'neutral'}>
          <Activity className="w-3 h-3 mr-1" />
          {eventPulseCount}
        </NexusBadge>
        <NexusBadge tone={online ? 'ok' : 'danger'}>
          {online ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {online ? 'NET' : 'OFF'}
        </NexusBadge>
      </div>

      {trayOpen ? (
        <div className="absolute right-2 bottom-full mb-2 w-[min(420px,92vw)] rounded-lg border border-zinc-700 bg-zinc-950/96 shadow-2xl p-2 z-[1200]">
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Taskbar Tray</div>
            <div className="flex items-center gap-1">
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
                    {notice.source || 'system'} {notice.read ? '· read' : '· unread'}
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
