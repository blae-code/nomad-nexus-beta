/**
 * ChannelList — Sidebar for comms dock showing casual and focused channels
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { CommsChannelDefaults } from '@/components/models/comms';

export default function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  unreadCounts,
  user,
}) {
  // Group channels by type
  const casual = channels.filter((ch) => ch.type === CommsChannelDefaults.CASUAL);
  const focused = channels.filter((ch) => ch.type === CommsChannelDefaults.FOCUSED);

  // Filter focused channels by access
  const accessibleFocused = focused.filter((ch) => {
    if (ch.isTemporary) return true; // All can see temporary
    return canAccessFocusedComms(user, { type: CommsChannelDefaults.FOCUSED, isTemporary: false });
  });

  return (
    <div className="w-32 bg-zinc-900/60 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Casual Group */}
      <div className="flex-1 overflow-y-auto">
        {casual.length > 0 && (
          <div>
            <div className="px-2 py-2 text-xs font-semibold text-zinc-500 sticky top-0 bg-zinc-900/80">
              Casual
            </div>
            <div className="space-y-1 px-1">
              {casual.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                    selectedChannelId === ch.id
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-zinc-400 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">#{ch.name}</span>
                    {unreadCounts[ch.id] > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-xs bg-orange-600 text-white">
                        {unreadCounts[ch.id]}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Focused Group */}
        {accessibleFocused.length > 0 && (
          <div>
            <div className="px-2 py-2 text-xs font-semibold text-zinc-500 sticky top-0 bg-zinc-900/80 border-t border-zinc-800 mt-2">
              Focused
            </div>
            <div className="space-y-1 px-1">
              {accessibleFocused.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                    selectedChannelId === ch.id
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-zinc-400 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {!ch.isTemporary && <Lock className="w-2.5 h-2.5 flex-shrink-0" />}
                      <span className="truncate">#{ch.name}</span>
                    </div>
                    {unreadCounts[ch.id] > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-xs bg-purple-600 text-white">
                        {unreadCounts[ch.id]}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}