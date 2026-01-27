import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function FleetPingSystem({ eventId }) {
  const [pings, setPings] = useState([]);
  const [isPinging, setIsPinging] = useState(false);
  const queryClient = useQueryClient();

  const { data: squads } = useQuery({
    queryKey: ['squads-for-ping', eventId],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  const { data: playerStatuses = [] } = useQuery({
    queryKey: ['fleet-ping-responses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list(),
    refetchInterval: 2000
  });

  const broadcastPing = async () => {
    try {
      setIsPinging(true);
      const pingId = `ping-${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Log ping event
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'COMMS',
        severity: 'LOW',
        summary: 'FLEET-WIDE SITREP REQUEST',
        details: {
          ping_id: pingId,
          timestamp,
          squads_pinged: squads.map(s => s.id)
        }
      });

      setPings(prev => [{
        id: pingId,
        timestamp,
        responses: [],
        status: 'active'
      }, ...prev]);

      toast.success('SITREP request broadcasted to all squads');

      // Auto-close ping after 30 seconds
      setTimeout(() => {
        setPings(prev => prev.map(p => 
          p.id === pingId ? { ...p, status: 'closed' } : p
        ));
      }, 30000);

    } catch (error) {
      toast.error('Failed to broadcast SITREP request');
    } finally {
      setIsPinging(false);
    }
  };

  const getResponseRate = (ping) => {
    if (!ping.responses.length) return 0;
    return Math.round((ping.responses.length / squads.length) * 100);
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-500" />
          Fleet Ping System
        </OpsPanelTitle>
      </OpsPanelHeader>
      <OpsPanelContent className="space-y-3">
        <Button
          onClick={broadcastPing}
          disabled={isPinging}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs font-mono"
        >
          {isPinging ? 'BROADCASTING SITREP REQUEST...' : 'BROADCAST SITREP REQUEST'}
        </Button>

        {pings.length > 0 && (
          <div className="space-y-2 border-t border-zinc-800 pt-2">
            {pings.slice(0, 3).map(ping => (
              <div key={ping.id} className="bg-zinc-900/50 border border-zinc-800 p-2 rounded space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 font-mono">
                    {new Date(ping.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </span>
                  <Badge 
                    variant="outline"
                    className={`text-[9px] px-1.5 ${
                      ping.status === 'active' 
                        ? 'bg-blue-500/20 border-blue-700 text-blue-300' 
                        : 'bg-zinc-700/20 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {ping.status === 'active' ? 'ACTIVE' : 'CLOSED'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${getResponseRate(ping)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-400 font-mono w-12 text-right">
                    {getResponseRate(ping)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {pings.length === 0 && (
          <div className="text-center py-4 text-[10px] text-zinc-500">
            NO ACTIVE SITREPS
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}