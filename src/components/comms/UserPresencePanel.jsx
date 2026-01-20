import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle, Mic, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserPresencePanel({ netId, eventId }) {
  const { data: presenceRecords = [], isLoading } = useQuery({
    queryKey: ['user-presence', netId],
    queryFn: async () => {
      if (!netId) return [];
      const records = await base44.entities.UserPresence.filter({ net_id: netId }, '-last_activity', 50);
      return records.filter(r => r.status !== 'offline');
    },
    refetchInterval: 3000,
    enabled: !!netId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-presence'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  if (!netId || presenceRecords.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 text-xs">
        <Radio className="w-4 h-4 mx-auto mb-1 opacity-30" />
        No active users
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {presenceRecords.map(presence => {
        const user = users.find(u => u.id === presence.user_id);
        if (!user) return null;

        return (
          <div
            key={presence.id}
            className="flex items-center gap-2 p-2 rounded bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
          >
            <Circle className={cn(
              'w-2 h-2 shrink-0',
              presence.is_transmitting ? 'fill-red-500 text-red-500 animate-pulse' : 'fill-emerald-500 text-emerald-500'
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {user.callsign || user.rsi_handle || user.email}
              </div>
              <div className="text-[10px] text-zinc-500">
                {presence.is_transmitting && (
                  <span className="flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5" /> TX
                  </span>
                )}
              </div>
            </div>
            {presence.status === 'idle' && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">IDLE</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}