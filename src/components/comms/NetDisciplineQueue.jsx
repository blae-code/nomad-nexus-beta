import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NetDisciplineQueue({ netId }) {
  const [txQueue, setTxQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);

  const { data: net } = useQuery({
    queryKey: ['voice-net', netId],
    queryFn: () => base44.entities.VoiceNet.get(netId),
    enabled: !!netId
  });

  const { data: presences = [] } = useQuery({
    queryKey: ['net-presence', netId],
    queryFn: async () => {
      const all = await base44.entities.UserPresence.list();
      return all.filter(p => p.current_net?.id === netId);
    },
    refetchInterval: 2000,
    enabled: !!netId
  });

  // Simulate TX queue based on presence
  useEffect(() => {
    const transmitting = presences.filter(p => p.is_transmitting);
    if (transmitting.length > 0) {
      setCurrentSpeaker(transmitting[0]);
    }
    
    const queued = presences.filter(p => !p.is_transmitting && p.status === 'transmitting');
    setTxQueue(queued.slice(0, 3));
  }, [presences]);

  if (!net?.stage_mode) {
    return null;
  }

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-red-500" />
          TX Discipline Queue
        </OpsPanelTitle>
      </OpsPanelHeader>
      <OpsPanelContent className="space-y-2">
        {/* Current Speaker */}
        {currentSpeaker && (
          <div className="bg-red-500/10 border border-red-700 rounded p-2 space-y-1">
            <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
              ON NET NOW
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-white flex-1">
                {currentSpeaker.user_id}
              </span>
              <Badge className="h-5 bg-red-500/20 border-red-700 text-red-300 text-[9px]">
                TX
              </Badge>
            </div>
          </div>
        )}

        {/* Queue */}
        {txQueue.length > 0 && (
          <div className="space-y-1 border-t border-zinc-800 pt-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              WAITING TO TRANSMIT ({txQueue.length})
            </div>
            {txQueue.map((user, idx) => (
              <div
                key={user.user_id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono',
                  idx === 0 
                    ? 'bg-amber-500/10 border border-amber-700 text-amber-300' 
                    : 'bg-zinc-900/50 text-zinc-400'
                )}
              >
                <span className="font-bold">{idx + 1}.</span>
                <span className="flex-1">{user.user_id}</span>
                {idx === 0 && (
                  <Badge className="h-5 bg-amber-500/20 border-amber-700 text-amber-300 text-[9px]">
                    NEXT
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {!currentSpeaker && txQueue.length === 0 && (
          <div className="text-center py-4 text-[10px] text-zinc-500">
            NET CLEAR
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}