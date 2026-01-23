import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { VirtualizedList } from '@/components/performance/VirtualizedList';

/**
 * Paginated roster for 100+ members
 */
export function PaginatedRoster({ items = [], renderItem, pageSize = 50, label = "ROSTER" }) {
  const [page, setPage] = useState(0);

  const currentPage = items.slice(page * pageSize, (page + 1) * pageSize);
  const canLoadMore = items.length > (page + 1) * pageSize;

  return (
    <div className="space-y-2">
      <div className="text-[9px] font-bold text-zinc-400 uppercase px-2 pb-1">
        {label} ({currentPage.length} of {items.length})
      </div>

      <VirtualizedList
        items={currentPage}
        itemHeight={32}
        maxHeight={400}
        renderItem={renderItem}
      />

      {canLoadMore && (
        <Button
          onClick={() => setPage(p => p + 1)}
          variant="outline"
          className="w-full text-[9px] h-6"
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          LOAD MORE ({items.length - (page + 1) * pageSize})
        </Button>
      )}
    </div>
  );
}