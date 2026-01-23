import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  READY: 'bg-emerald-950/40 text-emerald-300 border-emerald-700/30',
  IN_QUANTUM: 'bg-blue-950/40 text-blue-300 border-blue-700/30',
  ENGAGED: 'bg-red-950/40 text-red-300 border-red-700/30',
  DOWN: 'bg-red-950/60 text-red-200 border-red-700/60',
  RTB: 'bg-yellow-950/40 text-yellow-300 border-yellow-700/30',
  OFFLINE: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/30',
  DISTRESS: 'bg-red-950/80 text-red-100 border-red-700/80 animate-pulse'
};

export default function RosterWidget({ operation, user, onDragStart }) {
  const { data: playerStatuses = [] } = useQuery({
    queryKey: ['player-statuses', operation.id],
    queryFn: () => {
      if (!operation.id) return [];
      return base44.entities.PlayerStatus.filter(
        { event_id: operation.id },
        '-last_updated',
        50
      );
    },
    staleTime: 5000,
    enabled: !!operation.id
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-in-op'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 30000
  });

  const assigned = playerStatuses.filter(ps => ps.status !== 'OFFLINE');
  const unassigned = playerStatuses.filter(ps => ps.status === 'OFFLINE');

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300">Roster</h3>

      {/* Readiness Summary */}
      <div className="grid grid-cols-2 gap-1 text-[8px]">
        <div className="px-1.5 py-1 bg-emerald-950/30 border border-emerald-700/30 text-emerald-300">
          <div className="font-bold">{assigned.filter(p => p.status === 'READY').length}</div>
          <div className="text-[7px]">READY</div>
        </div>
        <div className="px-1.5 py-1 bg-red-950/30 border border-red-700/30 text-red-300">
          <div className="font-bold">{assigned.filter(p => p.status === 'DOWN').length}</div>
          <div className="text-[7px]">DOWN</div>
        </div>
      </div>

      {/* Personnel List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {assigned.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No personnel assigned</p>
        ) : (
          assigned.map(ps => {
            const userObj = users.find(u => u.id === ps.user_id);
            return (
              <div
                key={ps.id}
                draggable
                onDragStart={(e) => onDragStart?.(e, { type: 'personnel', data: ps })}
                className={cn(
                  'px-2 py-1.5 border rounded-none text-[8px] cursor-grab active:cursor-grabbing',
                  STATUS_COLORS[ps.status] || STATUS_COLORS.OFFLINE
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold truncate">
                    {userObj?.full_name || 'Unknown'}
                  </span>
                  {ps.status === 'DISTRESS' && (
                    <AlertCircle className="w-2.5 h-2.5 shrink-0 animate-pulse" />
                  )}
                </div>
                <div className="text-[7px] opacity-75 truncate">{ps.role}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}