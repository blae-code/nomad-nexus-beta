import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Trash2, Clock, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationHistory() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await base44.entities.Notification.filter(
          { user_id: user.id },
          '-created_date',
          pageSize * 2
        );
        setNotifications(data || []);
      } catch (e) {
        console.error('[Notifications] Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user?.id]);

  const getIcon = (type) => {
    switch (type) {
      case 'mention':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'direct_message':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'moderation':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'system':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-zinc-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Notification.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error('[Notifications] Failed to delete:', e);
    }
  };

  const pagedNotifications = notifications.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Notification History</div>

      {loading ? (
        <div className="text-xs text-zinc-500 py-4 text-center">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">No notifications yet</div>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pagedNotifications.map((notif) => (
              <div
                key={notif.id}
                className="px-3 py-2 rounded border border-zinc-700/50 bg-zinc-900/40 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      {notif.title && <div className="font-semibold text-zinc-200 truncate">{notif.title}</div>}
                      {notif.message && <div className="text-zinc-400 mt-0.5 line-clamp-2">{notif.message}</div>}
                      <div className="flex items-center gap-1 text-zinc-600 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notif.created_date)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors p-1"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {Math.ceil(notifications.length / pageSize) > 1 && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600"
              >
                Prev
              </button>
              <span>
                {page + 1}/{Math.ceil(notifications.length / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(notifications.length / pageSize) - 1, p + 1))}
                disabled={page >= Math.ceil(notifications.length / pageSize) - 1}
                className="px-2 py-1 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}