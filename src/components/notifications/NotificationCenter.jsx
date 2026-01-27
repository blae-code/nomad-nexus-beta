import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        50
      );
    },
    enabled: !!user?.id,
    refetchInterval: 3000
  });

  // Real-time subscription for new notifications
  React.useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data.user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      }
    });

    return unsubscribe;
  }, [user?.id, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (notifId) =>
      base44.entities.Notification.update(notifId, {
        is_read: true,
        read_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notifId) => base44.entities.Notification.delete(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifs) {
        await base44.entities.Notification.update(notif.id, {
          is_read: true,
          read_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type) => {
    const icons = {
      mention: '🗣️',
      direct_message: '💬',
      channel_activity: '📢',
      moderation: '⚠️',
      system: '⚙️'
    };
    return icons[type] || '📬';
  };

  const getNotificationColor = (type) => {
    const colors = {
      mention: 'border-blue-900 bg-blue-950',
      direct_message: 'border-emerald-900 bg-emerald-950',
      channel_activity: 'border-amber-900 bg-amber-950',
      moderation: 'border-red-900 bg-red-950',
      system: 'border-zinc-800 bg-zinc-900'
    };
    return colors[type] || 'border-zinc-800 bg-zinc-900';
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-zinc-800 rounded transition-colors group"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ea580c] rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-zinc-500">{unreadCount} unread</span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-[10px] h-6 px-2 text-zinc-400 hover:text-white"
              >
                Mark All Read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'p-3 rounded border cursor-pointer transition-all',
                    notif.is_read
                      ? 'border-zinc-800 bg-zinc-950/50'
                      : `${getNotificationColor(notif.type)} hover:border-[#ea580c]`
                  )}
                >
                  <div className="flex gap-2">
                    <span className="text-lg shrink-0">
                      {getNotificationIcon(notif.type)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className="font-bold text-white text-sm truncate">
                          {notif.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[9px] capitalize shrink-0 border-zinc-700"
                        >
                          {notif.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-xs text-zinc-300 line-clamp-2 mb-1">
                        {notif.message}
                      </p>

                      <span className="text-[10px] text-zinc-600">
                        {format(new Date(notif.created_date), 'MMM d, HH:mm')}
                      </span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notif.id);
                          }}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-600 hover:text-white"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notif.id);
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-600 hover:text-white"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}