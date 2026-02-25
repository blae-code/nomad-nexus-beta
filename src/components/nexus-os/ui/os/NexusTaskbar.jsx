import React from 'react';
import { AppWindow, Bell, BellRing, CheckCheck, ChevronLeft, ChevronRight, PauseCircle, Sparkles, Trash2 } from 'lucide-react';
import { NexusBadge, NexusButton, NexusTokenIcon } from '../primitives';
// JSX-only, no TypeScript types

function toneForNotificationLevel(level) {
  if (level === 'critical') return 'danger';
  if (level === 'warning') return 'warning';
  if (level === 'success') return 'ok';
  return 'active';
}

function dotForState(state) {
  if (state === 'foreground') return { family: 'square', color: 'orange' };
  if (state === 'background') return { family: 'square', color: 'cyan' };
  if (state === 'suspended') return { family: 'square', color: 'yellow' };
  if (state === 'error') return { family: 'square', color: 'red' };
  return { family: 'square', color: 'grey' };
}

function ageLabel(timestamp) {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
  return `${Math.floor(ageSeconds / 3600)}h`;
}

function compactLabel(value, max = 10) {
  const clean = String(value || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}...`;
}

export default function NexusTaskbar({
  activeAppId,
  appEntries,
  appCatalog,
  notifications,
  unreadNotifications,
  onActivateApp,
  onSuspendApp,
  onOpenCommandDeck,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
}) {
  const [trayOpen, setTrayOpen] = React.useState(false);
  const [trayFilter, setTrayFilter] = React.useState('UNREAD');
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
    [appCatalog, appPage]
  );

  const noticePageCount = Math.max(1, Math.ceil(filteredNotifications.length / noticesPerPage));
  const shownNotifications = React.useMemo(
    () => filteredNotifications.slice(noticePage * noticesPerPage, noticePage * noticesPerPage + noticesPerPage),
    [filteredNotifications, noticePage]
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
    <section className="relative nx-taskbar-strip bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/60">
      {/* Dock Header */}
      <div className="nx-taskbar-block nx-taskbar-meta px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-700/40 bg-zinc-900/40">
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-300">Dock</span>
          </div>
          <NexusBadge tone="neutral" className="text-[9px]">
            {appCatalog.length} modules
          </NexusBadge>
          {appPageCount > 1 ? (
            <NexusBadge tone="neutral" className="text-[9px] hidden md:inline-flex">
              {appPage + 1}/{appPageCount}
            </NexusBadge>
          ) : null}
        </div>
      </div>

      {/* App Launcher */}
      <div className="nx-taskbar-launcher px-2 py-1.5 flex items-center gap-1.5">
        {appPageCount > 1 ? (
          <button
            type="button"
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setAppPage((prev) => Math.max(0, prev - 1))}
            disabled={appPage === 0}
            aria-label="Previous app set"
            title="Previous app set"
          >
            <ChevronLeft className="w-3 h-3 text-zinc-400" />
          </button>
        ) : null}

        <div className="flex-1 flex items-center gap-1 min-w-0">
          {shownApps.map((app) => {
            const state = appEntries[app.id]?.state || 'closed';
            const active = activeAppId === app.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onActivateApp(app.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                  active
                    ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                    : 'border-zinc-700/40 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/60 hover:border-orange-500/40'
                }`}
                title={app.hotkey ? `${app.label} (${app.hotkey})` : app.label}
              >
                <NexusTokenIcon {...dotForState(state)} size="sm" />
                <span className="truncate">{compactLabel(app.label, 10)}</span>
              </button>
            );
          })}
        </div>

        {appPageCount > 1 ? (
          <button
            type="button"
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setAppPage((prev) => Math.min(appPageCount - 1, prev + 1))}
            disabled={appPage >= appPageCount - 1}
            aria-label="Next app set"
            title="Next app set"
          >
            <ChevronRight className="w-3 h-3 text-zinc-400" />
          </button>
        ) : null}
      </div>

      {/* Actions & Controls */}
      <div className="nx-taskbar-block nx-taskbar-actions px-3 py-2 border-l border-zinc-800/60 flex items-center gap-2">
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
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all text-[10px] font-semibold uppercase tracking-wide ${
            trayOpen
              ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
              : 'border-zinc-700/40 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/60 hover:border-orange-500/40'
          }`}
          title="Alerts center"
        >
          {unreadNotifications > 0 ? (
            <BellRing className="w-3.5 h-3.5 animate-pulse text-orange-400" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span className="hidden md:inline">Alerts</span>
          {unreadNotifications > 0 && unreadNotifications <= 9 ? (
            <NexusTokenIcon family={`number-${unreadNotifications}`} color="red" size="sm" />
          ) : (
            <strong className="text-[11px]">{unreadNotifications > 0 ? unreadNotifications : notifications.length}</strong>
          )}
        </button>

        <NexusButton size="sm" intent="primary" onClick={onOpenCommandDeck} className="shrink-0">
          <AppWindow className="w-3.5 h-3.5 mr-1" />
          Deck
        </NexusButton>
      </div>

      {trayOpen ? (
        <div className="nx-taskbar-tray fixed bottom-full left-0 right-0 mb-1 mx-auto w-[min(calc(100vw-2rem),640px)] max-h-96 overflow-y-auto rounded-t-lg border border-b-0 border-zinc-700/60 bg-zinc-950/98 backdrop-blur-lg shadow-2xl">
          <div className="sticky top-0 px-3 py-2.5 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              Alerts Center
              <span className="text-zinc-600 ml-2">
                {filteredNotifications.length}/{notifications.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
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
            <div className="p-4 text-center">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide">No alerts</div>
            </div>
          ) : (
            <div className="px-2 py-1 space-y-0.5">
              {shownNotifications.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => onMarkNotificationRead(notice.id)}
                  className={`w-full text-left rounded border px-2.5 py-2 transition-all text-[11px] hover:bg-zinc-900/60 ${
                    notice.read ? 'border-zinc-800/40 bg-zinc-900/20' : 'border-orange-500/30 bg-orange-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-zinc-100 truncate flex-1">{notice.title}</span>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <NexusBadge tone={toneForNotificationLevel(notice.level)} className="text-[9px]">
                        {notice.level.slice(0, 3).toUpperCase()}
                      </NexusBadge>
                      <span className="text-[10px] text-zinc-500">{ageLabel(notice.createdAt)}</span>
                    </div>
                  </div>
                  {notice.detail && <div className="text-[10px] text-zinc-400 truncate">{notice.detail}</div>}
                  <div className="mt-1 text-[9px] text-zinc-600">
                    {notice.source || 'system'} · {notice.read ? 'read' : 'unread'}
                  </div>
                </button>
              ))}

              {noticePageCount > 1 ? (
                <div className="pt-1.5 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="flex items-center justify-center w-5 h-5 rounded border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 disabled:opacity-40 transition-all"
                    onClick={() => setNoticePage((prev) => Math.max(0, prev - 1))}
                    disabled={noticePage === 0}
                    aria-label="Previous alert page"
                  >
                    <ChevronLeft className="w-3 h-3 text-zinc-400" />
                  </button>
                  <NexusBadge tone="neutral" className="text-[9px]">
                    {noticePage + 1}/{noticePageCount}
                  </NexusBadge>
                  <button
                    type="button"
                    className="flex items-center justify-center w-5 h-5 rounded border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 disabled:opacity-40 transition-all"
                    onClick={() => setNoticePage((prev) => Math.min(noticePageCount - 1, prev + 1))}
                    disabled={noticePage >= noticePageCount - 1}
                    aria-label="Next alert page"
                  >
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
