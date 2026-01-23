import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortChannels, getChannelIcon } from './channelTaxonomy';
import { canUser } from './commsPermissionEngine';

export default function CommsDockChannelList({ channels, user, onSelectChannel, compact = false }) {
  // Filter readable channels, then sort
  const readableChannels = channels.filter(ch => {
    const result = canUser(user, ch, 'read');
    return result.allowed;
  });
  const sorted = sortChannels(readableChannels, user);

  return (
    <div className={cn("space-y-1", !compact && "p-1")}>
      {sorted.map(channel => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel)}
          className={cn(
            "w-full text-left border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group",
            compact ? "px-1.5 py-1" : "px-2 py-1.5 rounded-none"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <span className="text-[9px] shrink-0">{getChannelIcon(channel.type)}</span>
              <p className={cn("font-bold uppercase text-zinc-300 truncate group-hover:text-[#ea580c]", compact ? "text-[7px]" : "text-[8px]")}>
                {channel.name}
              </p>
            </div>
            {channel.unread_count > 0 && (
              <span className={cn("px-1 py-0 font-bold shrink-0 bg-red-950/60 border border-red-700/40 text-red-300", compact ? "text-[6px]" : "text-[7px]")}>
                {channel.unread_count}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}