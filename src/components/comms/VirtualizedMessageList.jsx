import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const MessageRow = ({ index, style, data }) => {
  const msg = data[index];
  if (!msg) return null;

  const timestamp = msg.created_date 
    ? new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div style={style} className="text-[10px] font-mono text-zinc-400 pl-2 border-l border-zinc-800 py-1">
      <span className="text-emerald-700 opacity-70 mr-2">{timestamp}</span>
      <span className="text-zinc-300">{msg.content.replace(/\[COMMS LOG\]|Tx on|: \*\*SIMULATED TRANSMISSION\*\*/g, '').trim()}</span>
    </div>
  );
};

export default function VirtualizedMessageList({ channelId, pageSize = 30 }) {
  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef(null);

  // Fetch paginated messages
  const { data: paginatedMessages, isLoading } = useQuery({
    queryKey: ['virtualized-messages', channelId, offset],
    queryFn: async () => {
      if (!channelId) return [];
      return base44.entities.Message.filter(
        { channel_id: channelId },
        '-created_date',
        pageSize,
        offset
      );
    },
    enabled: !!channelId,
    staleTime: 10000,
    gcTime: 30000
  });

  // Append new batch when fetched
  useEffect(() => {
    if (paginatedMessages && paginatedMessages.length > 0) {
      if (offset === 0) {
        setAllMessages(paginatedMessages);
      } else {
        setAllMessages(prev => [...prev, ...paginatedMessages]);
      }
      
      if (paginatedMessages.length < pageSize) {
        setHasMore(false);
      }
      
      setIsLoadingMore(false);
    }
  }, [paginatedMessages, offset, pageSize]);

  // Handle scroll to load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setOffset(prev => prev + pageSize);
    }
  }, [isLoadingMore, hasMore, pageSize]);

  if (isLoading && allMessages.length === 0) {
    return <div className="text-center py-4 text-zinc-500 text-xs">Loading messages...</div>;
  }

  if (allMessages.length === 0) {
    return <div className="text-center py-4 text-zinc-500 text-xs italic">No messages yet.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Virtualized List */}
      <List
        ref={listRef}
        height={400}
        itemCount={allMessages.length}
        itemSize={24}
        width="100%"
        itemData={allMessages}
      >
        {MessageRow}
      </List>

      {/* Load More Button */}
      {hasMore && (
        <div className="p-2 border-t border-zinc-800 bg-zinc-950/50">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full px-3 py-1 text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 rounded border border-zinc-800 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isLoadingMore && <Loader2 className="w-2 h-2 animate-spin" />}
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}