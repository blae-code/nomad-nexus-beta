import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessChannel } from "@/components/permissions";

export default function ReadyRoomList({ selectedChannelId, onSelect, user }) {
  const { data: channels, isLoading } = useQuery({
    queryKey: ['ready-room-channels'],
    queryFn: async () => {
      try {
        return await base44.entities.Channel.filter({});
      } catch (error) {
        console.error('[READYROOM] Channel fetch error:', error);
        return [];
      }
    },
    initialData: []
  });

  const readyRooms = React.useMemo(() => {
     if (!channels?.length) return [];
     return channels.filter(c => 
        c && (c.category === 'casual' || c.category === 'public') && 
        c.type === 'text'
     ).sort((a,b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [channels]);

  if (isLoading) {
    return <div className="p-4 text-xs font-mono text-zinc-500 animate-pulse">LOADING CHANNELS...</div>;
  }

  return (
    <div className="flex flex-col gap-1 p-2">
       {readyRooms.map(channel => {
          const isAccessible = canAccessChannel(user, channel);
          const isSelected = selectedChannelId === channel.id;

          if (!isAccessible) return null;

          return (
             <button
                key={channel.id}
                onClick={() => onSelect(channel)}
                className={cn(
                   "flex items-center gap-3 px-3 py-2 rounded-sm text-left transition-all duration-200 border",
                   isSelected 
                      ? "bg-zinc-900 border-[#ea580c] text-zinc-100 shadow-[inset_2px_0_0_0_#ea580c]" 
                      : "bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                )}
             >
                <Hash className={cn("w-4 h-4", isSelected ? "text-[#ea580c]" : "text-zinc-600")} />
                <div className="flex-1 min-w-0">
                   <div className={cn("text-xs font-bold uppercase tracking-wide truncate", isSelected && "text-[#ea580c]")}>
                      {channel.name}
                   </div>
                   {channel.description && (
                      <div className="text-[9px] text-zinc-600 truncate font-mono">
                         {channel.description}
                      </div>
                   )}
                </div>
             </button>
          );
       })}
       
       {readyRooms.length === 0 && (
          <div className="p-4 text-center text-xs text-zinc-600 font-mono">
             NO CHANNELS AVAILABLE
          </div>
       )}
    </div>
  );
}