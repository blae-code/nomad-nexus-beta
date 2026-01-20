import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Circle, Mic, Radio, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

const STATUS_ICONS = {
  online: { icon: Circle, color: 'text-emerald-500' },
  idle: { icon: Clock, color: 'text-amber-500' },
  'in-call': { icon: Circle, color: 'text-blue-500' },
  transmitting: { icon: Radio, color: 'text-red-500' },
  away: { icon: Circle, color: 'text-zinc-600' }
};

export default function UserPresencePanel({ netId, eventId }) {
  const [presenceList, setPresenceList] = useState([]);
  const queryClient = useQueryClient();

  const { data: presenceRecords = [] } = useQuery({
    queryKey: ['user-presence', netId],
    queryFn: async () => {
      if (!netId) return [];
      const records = await base44.entities.UserPresence.filter({ net_id: netId }, '-last_activity', 50);
      return records.filter(r => r.status !== 'offline');
    },
    refetchInterval: 2000,
    enabled: !!netId
  });

  const { users, userById } = useUserDirectory();

  // Real-time subscription
  useEffect(() => {
    if (!netId || !base44.entities.UserPresence.subscribe) return;

    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.net_id === netId || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['user-presence', netId] });
      }
    });

    return unsubscribe;
  }, [netId, queryClient]);

  // Sync data
  useEffect(() => {
    setPresenceList(presenceRecords);
  }, [presenceRecords]);

  if (!netId || presenceList.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 text-xs italic">
        <Radio className="w-4 h-4 mx-auto mb-1 opacity-30" />
        No active users on frequency
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {presenceList.map(presence => {
        const user = userById[presence.user_id];
        if (!user) return null;

        const statusConfig = STATUS_ICONS[presence.status] || STATUS_ICONS.online;
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={presence.id}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded border transition-colors',
              presence.is_transmitting
                ? 'bg-red-950/20 border-red-800/50'
                : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
            )}
          >
            {/* Status Indicator */}
            <div className="relative">
              <StatusIcon className={cn('w-3 h-3 shrink-0', statusConfig.color)} />
              {(presence.is_transmitting || presence.status === 'transmitting') && (
                <div className="absolute inset-0 animate-pulse">
                  <StatusIcon className={cn('w-3 h-3', statusConfig.color)} />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200 truncate">
                  {user.callsign || user.rsi_handle || user.full_name}
                </span>
                {user.rank && (
                  <Badge variant="outline" className={cn('text-[9px] h-5 px-1', getRankColorClass(user.rank, 'text'))}>
                    {user.rank}
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {presence.is_transmitting ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <Mic className="w-2.5 h-2.5" />
                    TRANSMITTING
                  </span>
                ) : (
                  <span>{presence.status}</span>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {presence.status === 'idle' && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5">
                IDLE
              </Badge>
            )}
            {presence.is_transmitting && (
              <Badge className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50 px-1.5 py-0 h-5">
                TX
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}