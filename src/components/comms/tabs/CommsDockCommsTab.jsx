import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommsDockChannelView from '../CommsDockChannelView';
import CommsDockChannelList from '../CommsDockChannelList';

export default function CommsDockCommsTab({ user }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['comms-channels', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.CommsChannel.filter(
        { membership: user.id },
        '-updated_date',
        20
      );
    },
    staleTime: 10000,
    enabled: !!user?.id
  });

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedChannel) {
    return <CommsDockChannelView channel={selectedChannel} user={user} onBack={() => setSelectedChannel(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-700 rounded-none">
          <Search className="w-2.5 h-2.5 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="flex-1 bg-transparent text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 text-[8px] text-zinc-600">Loading channels...</div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-2 text-[8px] text-zinc-600 italic">No channels</div>
        ) : (
          <CommsDockChannelList
            channels={filteredChannels}
            user={user}
            onSelectChannel={setSelectedChannel}
          />
        )}
      </div>

      {/* Create Channel Button */}
      <div className="px-2 py-1.5 border-t border-zinc-800 shrink-0">
        <button className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors">
          <Plus className="w-2.5 h-2.5" />
          NEW CHANNEL
        </button>
      </div>
    </div>
  );
}