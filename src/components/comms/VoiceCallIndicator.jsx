import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceCallIndicator({ net, compact = false }) {
  const { data: roomStatus } = useQuery({
    queryKey: ['livekit-room-status', net.livekit_room_name],
    queryFn: async () => {
      if (!net.livekit_room_name) return null;
      const res = await base44.functions.invoke('getLiveKitRoomStatus', { 
        roomName: net.livekit_room_name 
      });
      return res.data;
    },
    enabled: !!net.livekit_room_name,
    refetchInterval: 5000
  });

  const participantCount = roomStatus?.num_participants || 0;
  const isActive = participantCount > 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-mono",
        isActive ? "text-emerald-500" : "text-zinc-700"
      )}>
        <Radio className={cn("w-2.5 h-2.5", isActive && "animate-pulse")} />
        {participantCount > 0 && <span>{participantCount}</span>}
      </div>
    );
  }

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-950/30 border border-emerald-900/50 rounded">
      <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
      <div className="flex items-center gap-1 text-xs">
        <Users className="w-3 h-3 text-emerald-500" />
        <span className="font-bold text-emerald-400">{participantCount}</span>
        <span className="text-zinc-500">active</span>
      </div>
    </div>
  );
}