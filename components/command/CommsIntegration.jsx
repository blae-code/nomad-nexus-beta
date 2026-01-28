import { Radio, Users, Signal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function CommsIntegration() {
  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets-command'],
    queryFn: async () => await base44.entities.VoiceNet.filter({ status: 'active' }),
    refetchInterval: 5000
  });

  const { data: presences = [] } = useQuery({
    queryKey: ['presences-command'],
    queryFn: async () => await base44.entities.UserPresence.list(),
    refetchInterval: 3000
  });

  const activeNets = voiceNets.filter(net => 
    presences.some(p => p.net_id === net.id && p.status !== 'offline')
  );

  const onlineCount = presences.filter(p => p.status !== 'offline').length;
  const inCallCount = presences.filter(p => p.status === 'in-call').length;

  return (
    <div className="space-y-2">
      <h3 className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">COMMS STATUS</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border border-zinc-800 bg-zinc-950/50 p-1.5 text-center"
        >
          <Users className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
          <div className="text-[7px] text-zinc-500 uppercase">Online</div>
          <div className="text-sm font-bold text-white">{onlineCount}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border border-zinc-800 bg-zinc-950/50 p-1.5 text-center"
        >
          <Radio className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
          <div className="text-[7px] text-zinc-500 uppercase">In Call</div>
          <div className="text-sm font-bold text-white">{inCallCount}</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border border-zinc-800 bg-zinc-950/50 p-1.5 text-center"
        >
          <Signal className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
          <div className="text-[7px] text-zinc-500 uppercase">Nets</div>
          <div className="text-sm font-bold text-white">{activeNets.length}</div>
        </motion.div>
      </div>

      {/* Active Nets */}
      <div className="border border-zinc-800 bg-zinc-950/50 p-1.5 space-y-1 max-h-32 overflow-y-auto">
        <div className="text-[7px] font-bold uppercase text-zinc-500 mb-1">ACTIVE NETS</div>
        {activeNets.length > 0 ? (
          activeNets.map(net => {
            const netPresences = presences.filter(p => p.net_id === net.id && p.status !== 'offline');
            return (
              <div key={net.id} className="flex items-center justify-between text-[8px] p-1 bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-white font-mono font-bold">{net.code}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-zinc-400">{netPresences.length}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-[7px] text-zinc-600 italic text-center py-2">No active nets</div>
        )}
      </div>
    </div>
  );
}