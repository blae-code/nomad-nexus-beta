import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { VirtualizedList } from '@/components/performance/VirtualizedList';

/**
 * Paginated EventLog with "Load More" pattern
 * Prevents rendering 1000+ log entries at once
 */
export function PaginatedEventLog({ eventId, limit = 30 }) {
  const [page, setPage] = useState(0);
  const pageSize = limit;

  const { data: allLogs = [], isLoading, hasMore } = useQuery({
    queryKey: ['event-logs', eventId, page],
    queryFn: async () => {
      if (!eventId) return [];
      const logs = await base44.entities.EventLog.filter(
        { event_id: eventId },
        '-created_date',
        pageSize * (page + 1)
      );
      return logs || [];
    },
    enabled: !!eventId,
    staleTime: 15000
  });

  const currentPageLogs = allLogs.slice(page * pageSize, (page + 1) * pageSize);
  const canLoadMore = allLogs.length > (page + 1) * pageSize;

  return (
    <div className="space-y-2">
      <VirtualizedList
        items={currentPageLogs}
        itemHeight={48}
        maxHeight={400}
        renderItem={(log) => (
          <div className="p-2 border-b border-zinc-800 text-[9px] hover:bg-zinc-900/50 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-400">{new Date(log.created_date).toLocaleTimeString()}</span>
              <span className="text-[8px] bg-zinc-800 px-1 py-0.5">{log.type}</span>
            </div>
            <div className="text-zinc-200">{log.summary}</div>
          </div>
        )}
      />

      {canLoadMore && (
        <Button
          onClick={() => setPage(p => p + 1)}
          disabled={isLoading}
          variant="outline"
          className="w-full text-[9px] h-6"
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          LOAD MORE
        </Button>
      )}
    </div>
  );
}