import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

/**
 * Bridge/Patch Control
 * Allows Voyager+ or Command roles to temporarily bridge two rooms
 * e.g., OP COMMAND ↔ OP THEATER or COMMAND ↔ SQUAD NET
 */
export default function VoiceBridgeControl({ eventId, user }) {
  const [bridgeFromRoom, setBridgeFromRoom] = useState('');
  const [bridgeToRoom, setBridgeToRoom] = useState('');
  const queryClient = useQueryClient();

  // Check if user can create bridges
  const canCreateBridge = user?.rank === 'Founder' || user?.rank === 'Voyager' || user?.role === 'admin';

  // Fetch active bridges for this event
  const { data: activeBridges = [], refetch: refetchBridges } = useQuery({
    queryKey: ['voice-bridges', eventId],
    queryFn: () => {
      if (!eventId) return [];
      return base44.entities.BridgeSession.filter(
        { event_id: eventId, status: 'ACTIVE' },
        '-started_at'
      );
    },
    refetchInterval: 5000,
    enabled: !!eventId
  });

  // Create bridge mutation
  const createBridgeMutation = useMutation({
    mutationFn: (data) => base44.entities.BridgeSession.create(data),
    onSuccess: () => {
      refetchBridges();
      queryClient.invalidateQueries({ queryKey: ['voice-bridges'] });
      setBridgeFromRoom('');
      setBridgeToRoom('');
    }
  });

  // Close bridge mutation
  const closeBridgeMutation = useMutation({
    mutationFn: (bridgeId) =>
      base44.entities.BridgeSession.update(bridgeId, {
        status: 'CLOSED',
        ended_at: new Date().toISOString()
      }),
    onSuccess: () => {
      refetchBridges();
      queryClient.invalidateQueries({ queryKey: ['voice-bridges'] });
    }
  });

  const handleCreateBridge = async () => {
    if (!bridgeFromRoom || !bridgeToRoom) return;

    await createBridgeMutation.mutateAsync({
      event_id: eventId,
      left_room: bridgeFromRoom,
      right_room: bridgeToRoom,
      bridge_type: 'OP_INTERNAL',
      initiated_by: user.id,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      metadata: {
        initiator_rank: user.rank,
        initiated_at: new Date().toISOString()
      }
    });
  };

  if (!canCreateBridge && activeBridges.length === 0) {
    return null;
  }

  return (
    <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <Link className="w-3.5 h-3.5 text-[#ea580c]" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">PATCH CONTROL</span>
        </div>

        <AnimatePresence>
          {activeBridges.map((bridge) => (
            <motion.div
              key={bridge.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-[#ea580c]/10 border border-[#ea580c]/30 p-2 text-[8px]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse" />
                  <Badge className="text-[6px] bg-[#ea580c] text-white border-0">ACTIVE</Badge>
                  <span className="text-zinc-400 truncate font-mono">
                    {bridge.left_room.split('-').slice(-1)[0]} ↔ {bridge.right_room.split('-').slice(-1)[0]}
                  </span>
                </div>
                {canCreateBridge && (
                  <button
                    onClick={() => closeBridgeMutation.mutate(bridge.id)}
                    className="ml-2 p-1 text-zinc-500 hover:text-red-500 transition-colors"
                    title="Close bridge"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-[7px] text-zinc-500">
                Since {new Date(bridge.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {canCreateBridge && (
          <div className="border-t border-zinc-800 pt-2 mt-2 space-y-1.5">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="From room"
                value={bridgeFromRoom}
                onChange={(e) => setBridgeFromRoom(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
              />
              <span className="text-[8px] text-zinc-600 px-1 py-1">→</span>
              <input
                type="text"
                placeholder="To room"
                value={bridgeToRoom}
                onChange={(e) => setBridgeToRoom(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
              />
            </div>
            <button
              onClick={handleCreateBridge}
              disabled={!bridgeFromRoom || !bridgeToRoom || createBridgeMutation.isPending}
              className={cn(
                'w-full px-2 py-1 text-[8px] font-bold uppercase transition-all border',
                bridgeFromRoom && bridgeToRoom
                  ? 'bg-[#ea580c]/20 border-[#ea580c]/50 text-[#ea580c] hover:bg-[#ea580c]/30'
                  : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed'
              )}
            >
              {createBridgeMutation.isPending ? 'Creating...' : 'Create Patch'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}