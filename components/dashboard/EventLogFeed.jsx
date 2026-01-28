import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LogEntry = ({ log }) => {
  const timestamp = log.timestamp 
    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  const severityColor = {
    LOW: 'text-blue-500',
    MEDIUM: 'text-yellow-500',
    HIGH: 'text-orange-500'
  }[log.severity] || 'text-zinc-400';

  return (
    <div className="text-[10px] font-mono text-zinc-400 pl-2 border-l border-zinc-800 py-1 hover:bg-zinc-900/20 transition-colors">
      <span className={`${severityColor} opacity-70 mr-2 font-bold`}>{timestamp}</span>
      <span className="text-zinc-300">{log.summary}</span>
    </div>
  );
};

export default function EventLogFeed({ eventId, pageSize = 20 }) {
  const [offset, setOffset] = useState(0);
  const [allLogs, setAllLogs] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const { data: paginatedLogs, isLoading } = useQuery({
    queryKey: ['event-logs-paginated', eventId, offset],
    queryFn: async () => {
      if (!eventId) return [];
      return base44.entities.EventLog.filter(
        { event_id: eventId },
        '-timestamp',
        pageSize,
        offset
      );
    },
    enabled: !!eventId,
    staleTime: 10000,
    gcTime: 30000
  });

  React.useEffect(() => {
    if (paginatedLogs && paginatedLogs.length > 0) {
      if (offset === 0) {
        setAllLogs(paginatedLogs);
      } else {
        setAllLogs(prev => [...prev, ...paginatedLogs]);
      }
      
      if (paginatedLogs.length < pageSize) {
        setHasMore(false);
      }
    }
  }, [paginatedLogs, offset, pageSize]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset(prev => prev + pageSize);
    }
  }, [isLoading, hasMore, pageSize]);

  if (isLoading && allLogs.length === 0) {
    return <div className="text-center py-4 text-zinc-500 text-xs">Loading logs...</div>;
  }

  if (allLogs.length === 0) {
    return <div className="text-center py-4 text-zinc-500 text-xs italic">No activity yet.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logs (scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-0 p-2">
        {allLogs.map((log, idx) => (
          <LogEntry key={`${log.id}-${idx}`} log={log} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="p-2 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="w-full h-6 text-[9px] gap-1"
          >
            {isLoading && <Loader2 className="w-2 h-2 animate-spin" />}
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}