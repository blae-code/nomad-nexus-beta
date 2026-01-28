import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mic, Clock } from 'lucide-react';

export default function NetActivityMonitor({ netId }) {
  const { data: netStatus } = useQuery({
    queryKey: ['net-status', netId],
    queryFn: async () => {
      const results = await base44.entities.VoiceNetStatus.filter({ net_id: netId });
      return results[0] || null;
    },
    refetchInterval: 2000
  });

  const { data: presences = [] } = useQuery({
    queryKey: ['presences'],
    queryFn: () => base44.entities.UserPresence.list(),
    refetchInterval: 1500
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-activity'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 5000
  });

  const activeTransmitters = netStatus?.active_transmitters || [];
  const transmitterDetails = activeTransmitters
    .map(uid => {
      const user = users.find(u => u.id === uid);
      const presence = presences.find(p => p.user_id === uid);
      return {
        id: uid,
        name: user?.full_name || 'UNKNOWN',
        is_transmitting: presence?.is_transmitting
      };
    })
    .filter(t => t.is_transmitting);

  return (
    <div className="space-y-2">
      {/* Active Transmitters */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 px-2 py-1 bg-zinc-900/50 border-b border-zinc-800">
          <Mic className="w-3 h-3 text-red-400" />
          <span className="text-[9px] font-bold text-red-400 uppercase">
            ACTIVE TX ({transmitterDetails.length})
          </span>
        </div>
        <div className="space-y-1">
          {transmitterDetails.length > 0 ? (
            transmitterDetails.map(tx => (
              <div
                key={tx.id}
                className="px-2 py-1 bg-red-900/20 border-l-2 border-red-500 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] text-red-300 font-mono truncate flex-1">{tx.name}</span>
              </div>
            ))
          ) : (
            <div className="px-2 py-1 text-[9px] text-zinc-600 italic">No active transmissions</div>
          )}
        </div>
      </div>

      {/* Last Activity */}
      {netStatus?.last_activity && (
        <div className="px-2 py-1 bg-zinc-900/50 border-t border-zinc-800 flex items-center gap-2 text-[8px] text-zinc-500">
          <Clock className="w-2.5 h-2.5" />
          <span>
            {new Date(netStatus.last_activity).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>
      )}
    </div>
  );
}