import { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300',
    bgColor: 'bg-emerald-950/20'
  },
  error: {
    icon: AlertTriangle,
    color: 'border-red-700/50 bg-red-950/30 text-red-300',
    bgColor: 'bg-red-950/20'
  },
  alert: {
    icon: AlertTriangle,
    color: 'border-amber-700/50 bg-amber-950/30 text-amber-300',
    bgColor: 'bg-amber-950/20'
  },
  command: {
    icon: Zap,
    color: 'border-orange-700/50 bg-orange-950/30 text-orange-300',
    bgColor: 'bg-orange-950/20'
  },
  info: {
    icon: Info,
    color: 'border-cyan-700/50 bg-cyan-950/30 text-cyan-300',
    bgColor: 'bg-cyan-950/20'
  }
};

export default function OpsNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [nextId, setNextId] = useState(0);

  const addNotification = useCallback((notification) => {
    const id = nextId;
    setNextId(prev => prev + 1);

    const notifWithId = {
      ...notification,
      id,
      type: notification.type || 'info'
    };

    setNotifications(prev => [...prev, notifWithId]);

    if (notification.autoClose) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.autoClose);
    }

    return id;
  }, [nextId]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    addNotification,
    removeNotification,
    NotificationDisplay: () => (
      <div className="fixed top-14 right-4 z-40 space-y-2 max-w-md">
        {notifications.map(notif => {
          const config = typeConfig[notif.type];
          const Icon = config.icon;

          return (
            <div
              key={notif.id}
              className={cn(
                'px-4 py-3 border rounded-none animate-in fade-in slide-in-from-top-2 duration-300',
                config.color
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {notif.title && (
                      <p className="text-[9px] font-bold uppercase">{notif.title}</p>
                    )}
                    {notif.message && (
                      <p className="text-[8px] opacity-90">{notif.message}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeNotification(notif.id)}
                  className="text-current opacity-60 hover:opacity-100 transition-opacity shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Progress bar for auto-close */}
              {notif.autoClose && (
                <div className="mt-2 h-0.5 bg-current/20 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-current/60 animate-shrink"
                    style={{
                      animation: `shrink ${notif.autoClose}ms linear forwards`
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    )
  };
}