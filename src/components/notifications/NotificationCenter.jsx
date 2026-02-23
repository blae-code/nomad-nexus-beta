import React, { useEffect, useState } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { useAuth } from '@/components/providers/AuthProvider';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle, Settings, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import NotificationFilters from './NotificationFilters';
import QuietHoursManager from './QuietHoursManager';
import NotificationPanel from './NotificationPanel';

/**
 * NotificationCenter — Renders stacked notifications in top-right corner
 * Each notification can have actions (buttons) that trigger callbacks
 */
export default function NotificationCenter() {
  const { notifications, removeNotification, getGroupedNotifications, isInQuietHours } = useNotification();
  const { user } = useAuth();
  const [showControls, setShowControls] = useState(false);
  const grouped = getGroupedNotifications();

  // Persist critical notifications to database
  useEffect(() => {
    const persistNotifications = async () => {
      if (!user?.id) return;
      try {
        const criticalNotifs = notifications.filter((n) => n.priority === 'critical' || n.type === 'alert');
        for (const notif of criticalNotifs) {
          // Check if already persisted
          const existing = await base44.entities.Notification.filter(
            { user_id: user.id, title: notif.title, type: notif.type },
            '-created_date',
            1
          );
          if (!existing?.length) {
            await base44.entities.Notification.create({
              user_id: user.id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              is_read: false,
            });
          }
        }
      } catch (e) {
        console.warn('[Notifications] Failed to persist:', e?.message);
      }
    };
    persistNotifications();
  }, [notifications, user?.id]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-800 text-green-100';
      case 'error':
        return 'bg-red-900/20 border-red-800 text-red-100';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-800 text-yellow-100';
      case 'alert':
        return 'bg-orange-900/20 border-orange-800 text-orange-100';
      default:
        return 'bg-blue-900/20 border-blue-800 text-blue-100';
    }
  };

  // Sort notifications by priority
  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  return (
    <div
      className="fixed top-20 right-4 z-50 space-y-3 max-w-md pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Controls Panel */}
      <div
        className={cn(
          'transition-all duration-200 pointer-events-auto',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {showControls && (
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg backdrop-blur-sm max-h-96 overflow-y-auto">
            <NotificationPanel />
            <div className="border-t border-zinc-700 p-2 space-y-1.5">
              <NotificationFilters />
              <QuietHoursManager />
            </div>
          </div>
        )}
      </div>

      {/* Quiet Hours Indicator */}
      {isInQuietHours && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-800 rounded text-blue-200 text-xs pointer-events-auto">
          <Moon className="w-3 h-3" />
          Quiet Hours Active
        </div>
      )}

      {/* Control Toggle */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="pointer-events-auto text-zinc-600 hover:text-orange-400 transition-colors ml-auto"
        aria-label="Toggle notification controls"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Notifications */}
      {sortedNotifications.map((notif) => (
        <div
          key={notif.id}
          role={notif.type === 'error' || notif.type === 'alert' ? 'alert' : 'status'}
          aria-live={notif.type === 'error' || notif.type === 'alert' ? 'assertive' : 'polite'}
          className={cn(
            'p-4 rounded-lg border pointer-events-auto animate-in slide-in-from-top-2 fade-in',
            getStyles(notif.type),
            notif.deferred && 'opacity-75'
          )}
          >
          <div className="flex gap-3">
            <div className="flex-shrink-0">{getIcon(notif.type)}</div>
            <div className="flex-1 min-w-0">
               {notif.title && (
                 <h3 className="font-semibold text-sm flex items-center gap-2">
                   {notif.title}
                   {notif.deferred && <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded">deferred</span>}
                 </h3>
               )}
               {notif.message && <p className="text-sm mt-1">{notif.message}</p>}

              {notif.actions && notif.actions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {notif.actions.map((action, idx) => (
                    <button
                      key={idx}
                      aria-label={action.label}
                      onClick={() => {
                        action.onClick?.(notif.id);
                        removeNotification(notif.id);
                      }}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded transition-all',
                        action.variant === 'primary'
                          ? 'bg-orange-600 hover:bg-orange-500 text-white'
                          : 'bg-black/30 hover:bg-black/50 text-inherit'
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={() => removeNotification(notif.id)}
              className="flex-shrink-0 text-inherit hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}