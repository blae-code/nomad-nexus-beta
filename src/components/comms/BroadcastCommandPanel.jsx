import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

/**
 * Broadcast Command Panel
 * Allows Command/Leadership to broadcast short text commands to:
 * - OP live feed
 * - Optional audio cue (UI indicator if simulated)
 */
export default function BroadcastCommandPanel({ eventId, user, activeRooms = [] }) {
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastRoom, setBroadcastRoom] = useState('');
  const [lastBroadcast, setLastBroadcast] = useState(null);
  const queryClient = useQueryClient();

  // Check if user has broadcast permission
  const canBroadcast = user?.rank === 'Founder' || user?.role === 'admin';

  const broadcastMutation = useMutation({
    mutationFn: async (data) => {
      // Send broadcast via TacticalCommand entity to create a live-feed entry
      const cmd = await base44.entities.TacticalCommand.create({
        event_id: eventId,
        message: data.text,
        issued_by: user.id,
        priority: 'HIGH',
        command_type: 'OTHER',
        status: 'ISSUED',
        coordinates: null,
        metadata: {
          broadcast: true,
          room: data.room,
          timestamp: new Date().toISOString()
        }
      });

      // Log to EventLog for visibility
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'COMMAND',
        actor_id: user.id,
        content: `BROADCAST: ${data.text}`,
        metadata: {
          broadcast: true,
          room: data.room,
          command_id: cmd.id
        }
      });

      return cmd;
    },
    onSuccess: (cmd) => {
      setLastBroadcast({
        text: broadcastText,
        room: broadcastRoom,
        timestamp: new Date()
      });
      setBroadcastText('');
      queryClient.invalidateQueries({ queryKey: ['event-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tactical-commands'] });
    }
  });

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || !broadcastRoom) return;
    await broadcastMutation.mutateAsync({
      text: broadcastText.trim(),
      room: broadcastRoom
    });
  };

  if (!canBroadcast) return null;

  return (
    <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">BROADCAST CMD</span>
        </div>

        {lastBroadcast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-500/10 border border-purple-500/30 p-1.5 text-[8px]"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Badge className="text-[6px] bg-purple-500 text-white border-0">SENT</Badge>
              <span className="text-zinc-500">
                {lastBroadcast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-zinc-300 font-mono">{lastBroadcast.text}</div>
          </motion.div>
        )}

        <div className="space-y-1.5">
          <select
            value={broadcastRoom}
            onChange={(e) => setBroadcastRoom(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 focus:outline-none focus:border-purple-500"
          >
            <option value="">Select room...</option>
            {activeRooms.map((room) => (
              <option key={room.roomName} value={room.roomName}>
                {room.label}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Command message (50 chars max)"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value.slice(0, 50))}
              maxLength={50}
              onKeyPress={(e) => e.key === 'Enter' && handleBroadcast()}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleBroadcast}
              disabled={!broadcastText.trim() || !broadcastRoom || broadcastMutation.isPending}
              className={cn(
                'px-2 py-1 transition-all border',
                broadcastText.trim() && broadcastRoom
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed'
              )}
              title="Send broadcast"
            >
              <Send className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}