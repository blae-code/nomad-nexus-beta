import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus } from 'lucide-react';
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
        50
      );
    },
    staleTime: 10000,
    enabled: !!user?.id
  });

  const groupedChannels = useMemo(() => {
    const filtered = channels.filter(ch =>
      ch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups = {
      ORG: [],
      ROLE: [],
      SQUAD: [],
      OP: []
    };

    filtered.forEach(ch => {
      if (groups[ch.scope]) {
        groups[ch.scope].push(ch);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [channels, searchQuery]);

  if (selectedChannel) {
    return <CommsDockChannelView channel={selectedChannel} user={user} onBack={() => setSelectedChannel(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-700">
          <Search className="w-2.5 h-2.5 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Channel List (Grouped) */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 text-[8px] text-zinc-600">Loading...</div>
        ) : groupedChannels.length === 0 ? (
          <div className="p-2 text-[8px] text-zinc-600 italic">No channels</div>
        ) : (
          <div className="space-y-2 p-1">
            {groupedChannels.map(([scope, scopeChannels]) => (
              <div key={scope}>
                <div className="px-2 py-1 text-[7px] font-bold uppercase text-zinc-500 tracking-wider">
                  {scope}
                </div>
                <CommsDockChannelList
                  channels={scopeChannels}
                  user={user}
                  onSelectChannel={setSelectedChannel}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Channel Button */}
      <div className="px-2 py-1.5 border-t border-zinc-800 shrink-0">
        <button className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors">
          <Plus className="w-2.5 h-2.5" />
          NEW
        </button>
      </div>
    </div>
  );
}