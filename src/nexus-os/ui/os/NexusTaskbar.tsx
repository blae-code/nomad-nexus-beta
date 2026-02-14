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
  const [appPage, setAppPage] = React.useState(0);
  const [noticePage, setNoticePage] = React.useState(0);
  const appsPerPage = 6;
  const noticesPerPage = 5;

  const filteredNotifications = React.useMemo(
    () => (trayFilter === 'UNREAD' ? notifications.filter((entry) => !entry.read) : notifications),
    [notifications, trayFilter]
  );
  const appPageCount = Math.max(1, Math.ceil(appCatalog.length / appsPerPage));
  const shownApps = React.useMemo(
    () => appCatalog.slice(appPage * appsPerPage, appPage * appsPerPage + appsPerPage),
    [appCatalog, appPage, appsPerPage]
  );
  const noticePageCount = Math.max(1, Math.ceil(filteredNotifications.length / noticesPerPage));
  const shownNotifications = React.useMemo(
    () => filteredNotifications.slice(noticePage * noticesPerPage, noticePage * noticesPerPage + noticesPerPage),
    [filteredNotifications, noticePage, noticesPerPage]
  );

  React.useEffect(() => {
    setAppPage((prev) => Math.min(prev, appPageCount - 1));
  }, [appPageCount]);
  React.useEffect(() => {
    setNoticePage(0);
  }, [trayFilter]);
  React.useEffect(() => {
    setNoticePage((prev) => Math.min(prev, noticePageCount - 1));
  }, [noticePageCount]);

  const activeAppState = activeAppId ? appEntries[activeAppId]?.state || 'closed' : 'closed';
  const activeAppLabel = activeAppId
    ? appCatalog.find((entry) => entry.id === activeAppId)?.label || activeAppId
    : 'None';

  return (
    <section className="relative nx-taskbar-strip">
      <div className="nx-taskbar-block nx-taskbar-status">
        <div className="nx-taskbar-link">
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{online ? 'Linked' : 'Degraded'}</span>
        </div>
        <NexusBadge tone="active" className="hidden md:inline-flex">
          Bridge {bridgeId}
        </NexusBadge>
        <NexusBadge tone={toneForState(activeAppState)} className="hidden lg:inline-flex">
          Focus {compactLabel(activeAppLabel, 12)}
        </NexusBadge>
        <NexusBadge tone={eventPulseCount > 0 ? 'warning' : 'neutral'} className="hidden xl:inline-flex">
          <Activity className="w-3 h-3 mr-1" />
          Pulse {eventPulseCount}
        </NexusBadge>
      </div>

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

      <div className="nx-taskbar-block nx-taskbar-actions">
        {activeAppId && activeAppState === 'foreground' ? (
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() => onSuspendApp(activeAppId)}
            title={`Suspend ${activeAppLabel}`}
            className="hidden lg:inline-flex"
          >
            <PauseCircle className="w-3.5 h-3.5 mr-1" />
            Hold
          </NexusButton>
        ) : null}
        <button
          type="button"
          onClick={() => setTrayOpen((prev) => !prev)}
          className={`nx-taskbar-alert-btn ${trayOpen ? 'is-open' : ''}`}
          title="Notification tray"
        >
          {unreadNotifications > 0 ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">Alerts</span>
          <strong>{unreadNotifications > 0 ? unreadNotifications : notifications.length}</strong>
        </button>
        <NexusButton size="sm" intent="primary" onClick={onOpenCommandDeck} className="shrink-0">
          <AppWindow className="w-3.5 h-3.5 mr-1" />
          Deck
        </NexusButton>
      </div>

      {trayOpen ? (
        <div className="nx-taskbar-tray">
          <div className="nx-taskbar-tray-header">
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

          {filteredNotifications.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-1">
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
                      <NexusBadge tone={toneForNotificationLevel(notice.level)}>
                        {notice.level.slice(0, 3).toUpperCase()}
                      </NexusBadge>
                      <span className="text-[10px] text-zinc-500">{ageLabel(notice.createdAt)}</span>
                    </div>
                  </div>
                  {notice.detail ? <div className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{notice.detail}</div> : null}
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {notice.source || 'system'} · {notice.read ? 'read' : 'unread'}
                  </div>
                </button>
              ))}
              <div className="pt-1 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  className="nx-taskbar-nav-btn"
                  onClick={() => setNoticePage((prev) => Math.max(0, prev - 1))}
                  disabled={noticePage === 0}
                  aria-label="Previous alert page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <NexusBadge tone="neutral">
                  {noticePage + 1}/{noticePageCount}
                </NexusBadge>
                <button
                  type="button"
                  className="nx-taskbar-nav-btn"
                  onClick={() => setNoticePage((prev) => Math.min(noticePageCount - 1, prev + 1))}
                  disabled={noticePage >= noticePageCount - 1}
                  aria-label="Next alert page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
