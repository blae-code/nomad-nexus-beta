/**
 * CommsJoinDialog: Unified UI for joining voice/text/data nets
 * 
 * Handles:
 * - Event/operation context awareness
 * - Net selection by type/availability
 * - Permissions validation
 * - SIM/LIVE mode transparency
 */

import { useState, useEffect } from 'react';
import { useCommsJoin } from './useCommsJoin';
import { useCommsMode } from './useCommsMode';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Radio, MessageSquare, Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommsJoinDialog({ eventId, onSuccess, onClose, autoJoin = false }) {
  const { joinComms, leaveComms, state, isLoading, isSimMode } = useCommsJoin();
  const { mode } = useCommsMode();
  const [nets, setNets] = useState([]);
  const [selectedNetId, setSelectedNetId] = useState(null);
  const [isLoadingNets, setIsLoadingNets] = useState(true);
  const [user, setUser] = useState(null);

  // Fetch available nets for event
  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (eventId) {
          const availableNets = await base44.entities.VoiceNet.filter(
            { event_id: eventId, status: 'active' },
            'priority',
            20
          );
          setNets(availableNets || []);
          
          // Default to command net or first net
          const commandNet = availableNets?.find(n => n.type === 'command');
          setSelectedNetId(commandNet?.id || availableNets?.[0]?.id);

          // Auto-join if specified
          if (autoJoin && availableNets?.[0]) {
            joinComms({
              eventId,
              netId: availableNets[0].id,
              metadata: { callsign: currentUser.callsign, rank: currentUser.rank }
            });
          }
        }
      } catch (error) {
        console.error('[COMMS JOIN] Failed to load nets:', error);
      } finally {
        setIsLoadingNets(false);
      }
    };

    load();
  }, [eventId, autoJoin, joinComms]);

  const handleJoin = async () => {
    try {
      await joinComms({
        eventId,
        netId: selectedNetId,
        metadata: { callsign: user?.callsign, rank: user?.rank }
      });
      onSuccess?.();
    } catch (error) {
      console.error('[COMMS JOIN] Join failed:', error);
    }
  };

  // Get icon for net type
  const getNetIcon = (type) => {
    switch (type) {
      case 'voice':
        return <Radio className="w-4 h-4" />;
      case 'text':
        return <MessageSquare className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  const selectedNet = nets.find(n => n.id === selectedNetId);

  return (
    <div className="space-y-4 p-4 bg-zinc-950 border border-zinc-800 rounded-none">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white">JOIN COMMS</h3>
        {isSimMode && (
          <Badge variant="outline" className="bg-yellow-950/30 text-yellow-300 border-yellow-700/50 text-xs">
            SIM MODE
          </Badge>
        )}
      </div>

      {/* Error state */}
      {state.lastError && (
        <div className="flex items-start gap-2 p-2 bg-red-950/30 border border-red-700/50 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{state.lastError}</span>
        </div>
      )}

      {/* Net selection */}
      {isLoadingNets ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        </div>
      ) : nets.length === 0 ? (
        <p className="text-xs text-zinc-400">No comms nets available</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-mono uppercase">Select Net</p>
          <div className="grid gap-2">
            {nets.map((net) => (
              <button
                key={net.id}
                onClick={() => setSelectedNetId(net.id)}
                className={cn(
                  'flex items-start gap-3 p-2.5 border text-left text-xs transition-all',
                  selectedNetId === net.id
                    ? 'bg-[#ea580c]/20 border-[#ea580c]/60 text-[#ea580c]'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                )}
              >
                <div className="mt-0.5">
                  {getNetIcon(net.type || 'voice')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{net.code}</div>
                  <div className="text-[11px] text-zinc-500 line-clamp-1">{net.label}</div>
                  {net.type && (
                    <Badge variant="outline" className="mt-1 text-[9px] h-5">
                      {net.type}
                    </Badge>
                  )}
                </div>
                {net.priority && (
                  <div className="text-[10px] font-mono text-zinc-600">P{net.priority}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected net info */}
      {selectedNet && (
        <div className="p-2 bg-zinc-900/50 border border-zinc-800 space-y-1">
          <p className="text-xs font-mono text-zinc-500">TYPE: {selectedNet.type?.toUpperCase() || 'VOICE'}</p>
          {selectedNet.discipline && (
            <p className="text-xs font-mono text-zinc-500">DISCIPLINE: {selectedNet.discipline?.toUpperCase()}</p>
          )}
          {selectedNet.min_rank_to_rx && (
            <p className="text-xs font-mono text-zinc-500">MIN RANK: {selectedNet.min_rank_to_rx}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleJoin}
          disabled={!selectedNetId || isLoading || state.isConnecting}
          className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs h-8"
        >
          {state.isConnecting || isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              JOINING...
            </>
          ) : (
            'JOIN COMMS'
          )}
        </Button>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="text-xs h-8"
          >
            CANCEL
          </Button>
        )}
      </div>

      {/* Connection status */}
      {state.isConnected && (
        <div className="p-2 bg-emerald-950/30 border border-emerald-700/50 text-emerald-300 text-xs font-mono">
          ✓ CONNECTED TO {selectedNet?.code}
        </div>
      )}
    </div>
  );
}