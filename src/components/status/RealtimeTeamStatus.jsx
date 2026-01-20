import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { Users, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

const STATUS_COLORS = {
  online: 'bg-emerald-500',
  'in-call': 'bg-blue-500',
  transmitting: 'bg-red-500',
  idle: 'bg-amber-500',
  away: 'bg-zinc-600',
  offline: 'bg-zinc-800'
};

export default function RealtimeTeamStatus() {
   const { data: presences } = useQuery({
     queryKey: ['team-status'],
     queryFn: () => base44.entities.UserPresence.list(),
     initialData: [],
     refetchInterval: 2000
   });

   const presenceUserIds = presences.map(p => p.user_id).filter(Boolean);
   const { userById, users } = useUserDirectory(presenceUserIds.length > 0 ? presenceUserIds : null);

   const onlineCount = presences.filter(p => p.status !== 'offline').length;
   const transmittingCount = presences.filter(p => p.is_transmitting).length;

   const getUser = (userId) => userById[userId];

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-3 h-3" />
            TEAM STATUS
          </span>
          <span className="text-[9px] font-mono text-emerald-400">
            {onlineCount}/{users.length}
          </span>
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-2">
        {/* Transmitting Alert */}
        {transmittingCount > 0 && (
          <div className="p-2 bg-red-900/10 border border-red-900/30 rounded flex items-center gap-2">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <div className="text-[9px]">
              <div className="font-bold text-red-400">{transmittingCount} TRANSMITTING</div>
              <div className="text-red-300/70">Active voice traffic</div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {presences.slice(0, 15).map(presence => {
            const user = getUser(presence.user_id);
            if (!user) return null;

            return (
              <div
                key={presence.user_id}
                className="p-1.5 bg-zinc-950/30 border border-zinc-800/50 rounded flex items-center justify-between text-[9px]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    STATUS_COLORS[presence.status] || STATUS_COLORS.offline
                  )} />
                  <div className="min-w-0">
                    <div className="text-zinc-300 truncate font-mono">
                      {user.callsign || user.rsi_handle}
                    </div>
                    <div className="text-zinc-600 text-[8px]">
                      {user.rank}
                    </div>
                  </div>
                </div>
                {presence.current_net && (
                  <Badge variant="outline" className="text-[8px] h-fit ml-1">
                    {presence.current_net.code}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}