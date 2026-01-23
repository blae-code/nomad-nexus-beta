/**
 * Voice Bridge Control
 * Shows active patches/bridges between rooms
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeftRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceBridgeControl({ eventId, user }) {
  const queryClient = useQueryClient();

  // Fetch active bridges
  const { data: bridges = [] } = useQuery({
    queryKey: ['voice-bridges', eventId],
    queryFn: () => {
      if (!eventId) return [];
      return base44.entities.BridgeSession.filter(
        { event_id: eventId, status: 'ACTIVE' },
        '-created_date'
      );
    },
    enabled: !!eventId,
    refetchInterval: 5000
  });

  // Close bridge mutation
  const closeBridgeMutation = useMutation({
    mutationFn: (bridgeId) =>
      base44.entities.BridgeSession.update(bridgeId, { status: 'CLOSED', ended_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-bridges', eventId] });
    }
  });

  if (bridges.length === 0) return null;

  const canCloseBridge = user?.role === 'admin' || user?.rank === 'Founder';

  return (
    <div className="space-y-1 text-[8px]">
      <div className="px-2 py-1 font-bold uppercase text-zinc-500 flex items-center gap-1">
        <ArrowLeftRight className="w-3 h-3 text-orange-500" />
        Active Patches
      </div>

      {bridges.map(bridge => {
        const [left, right] = [bridge.left_room.toUpperCase(), bridge.right_room.toUpperCase()];
        return (
          <div
            key={bridge.id}
            className="px-2 py-1.5 border border-orange-700/40 bg-orange-950/20 rounded-none flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="font-bold text-orange-300 truncate">{left}</span>
              <ArrowLeftRight className="w-2 h-2 text-orange-500 shrink-0" />
              <span className="font-bold text-orange-300 truncate">{right}</span>
            </div>
            {canCloseBridge && (
              <button
                onClick={() => closeBridgeMutation.mutate(bridge.id)}
                disabled={closeBridgeMutation.isPending}
                className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                title="Close bridge"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}