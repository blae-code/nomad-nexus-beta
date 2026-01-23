import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortChannels, getChannelIcon } from './channelTaxonomy';

export default function CommsDockChannelList({ channels, user, onSelectChannel }) {
  const sorted = sortChannels(channels, user);

  return (
    <div className="space-y-1 p-1">
      {sorted.map(channel => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel)}
          className="w-full text-left px-2 py-1.5 rounded-none border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px]">{getChannelIcon(channel.type)}</span>
                <p className="text-[8px] font-bold uppercase text-zinc-300 truncate group-hover:text-[#ea580c]">
                  {channel.name}
                </p>
                {channel.is_canonical && (
                  <span className="text-[6px] bg-cyan-950/40 text-cyan-400 px-0.5 py-0 shrink-0">●</span>
                )}
              </div>
              {channel.is_locked && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Lock className="w-2 h-2 text-orange-500" />
                  <span className="text-[7px] text-orange-400">LOCKED</span>
                </div>
              )}
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