import React, { useEffect } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * NotificationCenter — Renders stacked notifications in top-right corner
 * Each notification can have actions (buttons) that trigger callbacks
 */
export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotification();

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

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={cn(
            'p-4 rounded-lg border pointer-events-auto animate-in slide-in-from-top-2 fade-in',
            getStyles(notif.type)
          )}
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">{getIcon(notif.type)}</div>
            <div className="flex-1 min-w-0">
              {notif.title && <h3 className="font-semibold text-sm">{notif.title}</h3>}
              {notif.message && <p className="text-sm mt-1">{notif.message}</p>}

              {notif.actions && notif.actions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {notif.actions.map((action, idx) => (
                    <button
                      key={idx}
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