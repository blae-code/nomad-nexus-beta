import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const NET_COLORS = {
  command: 'border-red-700/40 bg-red-950/20 text-red-300',
  squad: 'border-blue-700/40 bg-blue-950/20 text-blue-300',
  support: 'border-yellow-700/40 bg-yellow-950/20 text-yellow-300',
  general: 'border-zinc-700/40 bg-zinc-900/20 text-zinc-300'
};

export default function CommsWidget({ operation, user }) {
  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets', operation.id],
    queryFn: () => {
      if (!operation.id) return [];
      return base44.entities.VoiceNet.filter(
        { event_id: operation.id },
        'priority',
        20
      );
    },
    staleTime: 10000,
    enabled: !!operation.id
  });

  const { data: netStatuses = [] } = useQuery({
    queryKey: ['net-statuses', operation.id],
    queryFn: () => {
      if (!operation.id) return [];
      return base44.entities.VoiceNetStatus.list('-last_activity', 20);
    },
    staleTime: 5000,
    enabled: !!operation.id
  });

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300">Comms</h3>

      {/* Comms Mode Status */}
      <div className="px-2 py-1 border border-zinc-700/50 bg-zinc-900/30 text-[8px]">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="font-mono">SIM</span>
        </div>
      </div>

      {/* Voice Nets List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {voiceNets.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No voice nets active</p>
        ) : (
          voiceNets.map(net => {
            const status = netStatuses.find(s => s.net_id === net.id);
            return (
              <div
                key={net.id}
                className={cn(
                  'px-2 py-1.5 border rounded-none cursor-pointer hover:opacity-80 transition-opacity',
                  NET_COLORS[net.type] || NET_COLORS.general
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase truncate">{net.label}</p>
                    <p className="text-[7px] opacity-75">{net.code}</p>
                  </div>
                  {status?.active_transmitters && (
                    <div className="flex items-center gap-0.5 text-[7px] shrink-0 px-1 py-0.5 bg-current/20">
                      <Users className="w-2 h-2" />
                      {status.active_transmitters.length}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}