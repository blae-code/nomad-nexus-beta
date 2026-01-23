import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronUp, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagingFooter({ user }) {
  const [isMinimized, setIsMinimized] = useState(false);

  const { data: channels = [] } = useQuery({
    queryKey: ['text-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allChannels = await base44.entities.Channel.list();
      return allChannels || [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  if (!user) return null;

  return (
    <div className="bg-zinc-950 border-t border-zinc-800 flex flex-col shrink-0 overflow-hidden w-full">
      {/* Header Bar */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-950 border-b border-zinc-800/50">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="flex items-center gap-1.5 hover:text-[#ea580c] transition-colors flex-1 group"
        >
          <ChevronUp className={cn("w-3 h-3 text-zinc-500 group-hover:text-[#ea580c] transition-transform", isMinimized && "rotate-180")} />
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 tracking-wider">MESSAGING</span>
        </button>


      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Channels List */}
             <div className="bg-zinc-900/30 border-b border-zinc-800/30 p-2 flex-1 overflow-y-auto">
               <div className="space-y-1">
                 {channels.length === 0 ? (
                   <p className="text-[10px] text-zinc-500 italic">No channels available</p>
                 ) : (
                   channels.map(channel => (
                     <a
                       key={channel.id}
                       href={`/channels/${channel.id}`}
                       className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 rounded transition-all"
                     >
                       <Hash className="w-2.5 h-2.5" />
                       <span className="truncate">{channel.name}</span>
                     </a>
                   ))
                 )}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}