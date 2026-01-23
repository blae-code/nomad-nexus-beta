import React from 'react';
import { Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommsDockChannelList({ channels, user, onSelectChannel }) {
  return (
    <div className="space-y-1 p-1">
      {channels.map(channel => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel)}
          className="w-full text-left px-2 py-1.5 rounded-none border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold uppercase text-zinc-300 truncate group-hover:text-[#ea580c]">
                {channel.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn(
                  'text-[7px] px-1 py-0 uppercase',
                  channel.type === 'BROADCAST' ? 'bg-red-950/40 text-red-300' :
                  channel.type === 'OPS_FEED' ? 'bg-blue-950/40 text-blue-300' :
                  'bg-zinc-800/40 text-zinc-400'
                )}>
                  {channel.type}
                </span>
                {channel.scope !== 'ORG' && (
                  <Lock className="w-2 h-2 text-zinc-600" />
                )}
              </div>
            </div>
            {channel.unread_count > 0 && (
              <span className="text-[7px] px-1.5 py-0.5 bg-red-950/60 border border-red-700/40 text-red-300 font-bold shrink-0">
                {channel.unread_count}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}