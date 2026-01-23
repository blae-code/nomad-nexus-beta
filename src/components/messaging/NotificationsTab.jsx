import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Bell, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

export default function NotificationsTab({ user }) {
  const queryClient = useQueryClient();
  const [refreshTime, setRefreshTime] = useState(0);
  const { getDisplayName } = useUserDirectory();

  const { data: notifications = [] } = useQuery({
    queryKey: ['message-notifications', user?.id],
    queryFn: async () => {
      const messages = await base44.entities.Message.list();
      const unread = messages.filter(
        m => !m.read_by?.includes(user.id) && m.user_id !== user.id
      );
      return unread.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30);
    },
    enabled: !!user?.id,
    refetchInterval: 3000
  });

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = base44.entities.Message.subscribe(() => {
      queryClient.invalidateQueries(['message-notifications', user.id]);
    });
    return unsubscribe;
  }, [user?.id, queryClient]);

  // Update timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <Bell className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600 font-mono">No new messages</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="group p-2 rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-[#ea580c]/30 transition-all cursor-pointer text-xs"
              >
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-[#ea580c] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-200 truncate font-bold text-[10px]">
                      {getDisplayName(notif.created_by) || 'Unknown'}
                    </div>
                    <div className="text-zinc-500 mt-0.5 line-clamp-2 text-[9px]">
                      {notif.content}
                    </div>
                  </div>
                  <span className="text-[8px] text-zinc-600 flex-shrink-0" key={`time-${notif.id}-${refreshTime}`}>
                    {getTimeAgo(notif.created_date)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}