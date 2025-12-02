import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Activity, Users, AlertTriangle } from 'lucide-react';
import CommsEventSelector from '@/components/comms/CommsEventSelector'; // Reuse
import ActiveNetPanel from '@/components/comms/ActiveNetPanel'; // Reuse if possible, or make a simpler version
import StatusChip from '@/components/status/StatusChip';

export default function OperatorDashboard({ user }) {
  // Fetch Active Nets
  const { data: activeNets } = useQuery({
    queryKey: ['operator-active-nets'],
    queryFn: () => base44.entities.VoiceNet.list({ filter: { status: 'active' } }),
    refetchInterval: 5000,
    initialData: []
  });

  // Fetch All Users Status
  const { data: playerStatuses } = useQuery({
    queryKey: ['operator-player-status'],
    queryFn: () => base44.entities.PlayerStatus.list(),
    refetchInterval: 3000,
    initialData: []
  });

  // Simple summary counts
  const statusCounts = playerStatuses.reduce((acc, curr) => {
     acc[curr.status] = (acc[curr.status] || 0) + 1;
     return acc;
  }, {});

  return (
    <div className="h-full w-full grid grid-cols-12 gap-4 p-4 bg-black">
      
      {/* Left Column: Comms Overview */}
      <div className="col-span-12 md:col-span-8 flex flex-col gap-4">
         
         {/* Active Frequencies */}
         <div className="bg-zinc-900/50 border border-zinc-800 p-4 flex-1 min-h-[300px]">
            <div className="flex items-center gap-2 mb-4 text-emerald-500">
               <Radio className="w-5 h-5" />
               <h3 className="text-sm font-bold uppercase tracking-wider">Active Frequencies</h3>
            </div>
            
            {activeNets.length === 0 ? (
               <div className="h-40 flex items-center justify-center text-zinc-600 text-xs font-mono border border-dashed border-zinc-800">
                  NO ACTIVE NETS // SILENCE
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeNets.map(net => (
                     <div key={net.id} className="bg-zinc-950 border border-zinc-800 p-3 flex justify-between items-center">
                        <div>
                           <div className="text-emerald-400 font-bold font-mono">{net.code}</div>
                           <div className="text-[10px] text-zinc-500 uppercase">{net.label}</div>
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">
                           SIGNAL: 100%
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* Operator Log / Alerts */}
         <div className="bg-zinc-900/50 border border-zinc-800 p-4 h-64">
            <div className="flex items-center gap-2 mb-4 text-amber-500">
               <AlertTriangle className="w-5 h-5" />
               <h3 className="text-sm font-bold uppercase tracking-wider">System Alerts</h3>
            </div>
            <div className="text-xs font-mono space-y-2 text-zinc-400 h-full overflow-y-auto">
               <div className="flex gap-2">
                  <span className="text-zinc-600">14:20:01</span>
                  <span className="text-emerald-500">[SYS]</span>
                  <span>Uplink established with UEE Network</span>
               </div>
               <div className="flex gap-2">
                  <span className="text-zinc-600">14:18:22</span>
                  <span className="text-amber-500">[WARN]</span>
                  <span>Signal degradation in Sector 4</span>
               </div>
               <div className="flex gap-2">
                  <span className="text-zinc-600">14:15:00</span>
                  <span className="text-blue-500">[INFO]</span>
                  <span>Event 'Operation Nightfall' initialized</span>
               </div>
            </div>
         </div>

      </div>

      {/* Right Column: Personnel Status */}
      <div className="col-span-12 md:col-span-4 bg-zinc-900/50 border border-zinc-800 flex flex-col">
         <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-blue-500">
               <Users className="w-5 h-5" />
               <h3 className="text-sm font-bold uppercase tracking-wider">Personnel Status</h3>
            </div>
            
            {/* Summary Chips */}
            <div className="flex gap-2 mt-4 flex-wrap">
               <div className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
                  TOTAL: <span className="text-white">{playerStatuses.length}</span>
               </div>
               <div className="px-2 py-1 bg-emerald-900/20 border border-emerald-900/50 text-[10px] text-emerald-500">
                  READY: <span className="text-white">{statusCounts['READY'] || 0}</span>
               </div>
               <div className="px-2 py-1 bg-red-900/20 border border-red-900/50 text-[10px] text-red-500">
                  DOWN: <span className="text-white">{statusCounts['DOWN'] || 0}</span>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {playerStatuses.length === 0 ? (
               <div className="text-center text-zinc-600 text-xs py-10">NO TELEMETRY DATA</div>
            ) : (
               playerStatuses.map(status => (
                  <div key={status.id} className="flex items-center justify-between p-2 bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700">
                     <div className="text-xs text-zinc-300 font-bold">
                        {status.user_id.slice(0, 8)}... {/* In real app, join with User entity */}
                     </div>
                     <StatusChip status={status.status} size="xs" />
                  </div>
               ))
            )}
         </div>
      </div>

    </div>
  );
}