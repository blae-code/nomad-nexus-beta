import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeNotifications } from '@/components/hooks/useRealtimeNotifications';

export default function NotificationsWidget({ widgetId, config, onRemove, isDragging }) {
  const { notifications } = useRealtimeNotifications();

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Alerts</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(!notifications || notifications.length === 0) ? (
          <div className="text-center text-zinc-600 text-xs py-4">No alerts</div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className="bg-zinc-800/50 rounded p-2 border-l-2 border-orange-500/50"
            >
              <div className="text-xs font-bold text-zinc-200">{notification.title}</div>
              {notification.message && (
                <div className="text-xs text-zinc-500 mt-1">{notification.message}</div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}