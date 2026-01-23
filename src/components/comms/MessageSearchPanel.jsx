import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, X, MessageCircle, Hash, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

export default function MessageSearchPanel({ channelId, dmChannelId, onSelectMessage, onClose, currentUser }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, messages, mentions, files
  const queryClient = useQueryClient();

  // Fetch messages from selected channel
  const { data: messages = [] } = useQuery({
    queryKey: ['channel-search', channelId || dmChannelId],
    queryFn: async () => {
      if (!channelId && !dmChannelId) return [];
      
      const searchChannelId = channelId || dmChannelId;
      return await base44.entities.Message.filter(
        { channel_id: searchChannelId },
        '-created_date',
        200
      );
    },
    enabled: !!channelId || !!dmChannelId
  });

  const { userById } = useUserDirectory();

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    if (!query.trim()) return messages;

    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => {
      const contentMatch = msg.content?.toLowerCase().includes(lowerQuery);
      const senderMatch = userById[msg.user_id]?.full_name?.toLowerCase().includes(lowerQuery);
      
      if (filterType === 'messages') {
        return contentMatch || senderMatch;
      } else if (filterType === 'mentions') {
        return msg.content?.includes(`@${currentUser?.full_name}`) || msg.content?.includes('@everyone');
      } else if (filterType === 'files') {
        return msg.attachments && msg.attachments.length > 0;
      }
      
      return contentMatch || senderMatch;
    });
  }, [query, messages, filterType, currentUser?.full_name, userById]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800">
      {/* Header */}
      <div className="shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <Search className="w-4 h-4" />
          Search Messages
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="shrink-0 p-3 border-b border-zinc-800 space-y-2">
        <Input
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="bg-zinc-900 border-zinc-800 text-xs"
        />
        <div className="flex gap-1">
          {['all', 'messages', 'mentions', 'files'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-2 py-1 text-[10px] font-bold rounded uppercase transition-all',
                filterType === type
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">
                {query ? 'No results found' : 'Start typing to search'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const author = userById[msg.user_id] || { full_name: 'Unknown' };
              const date = new Date(msg.created_date);
              
              return (
                <button
                  key={msg.id}
                  onClick={() => {
                    onSelectMessage?.(msg);
                    onClose();
                  }}
                  className="w-full text-left p-2 border border-zinc-800 hover:border-[#ea580c]/50 hover:bg-zinc-900/50 rounded transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-bold text-xs text-zinc-200">
                      {author.full_name}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                      <Calendar className="w-2.5 h-2.5" />
                      {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {msg.content}
                  </p>
                  
                  {msg.attachments?.length > 0 && (
                    <div className="mt-1 text-[9px] text-[#ea580c] flex items-center gap-1">
                      📎 {msg.attachments.length} file{msg.attachments.length > 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      <div className="shrink-0 p-2 border-t border-zinc-800 text-[9px] text-zinc-600 text-center">
        {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} • Ctrl+K to close
      </div>
    </div>
  );
}