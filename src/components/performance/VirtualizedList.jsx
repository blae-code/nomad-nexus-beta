import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * Virtualized list for rendering 100+ items without UI lockup.
 * Only renders visible rows in viewport.
 */
export function VirtualizedList({
  items = [],
  itemHeight = 48,
  maxHeight = 400,
  renderItem,
  className = '',
  overscan = 5
}) {
  if (!items.length) {
    return <div className="text-center text-zinc-500 text-xs py-4">No items</div>;
  }

  if (items.length < 50) {
    // For small lists, render normally
    return (
      <div className={className}>
        {items.map((item, idx) => (
          <div key={item.id || idx}>{renderItem(item, idx)}</div>
        ))}
      </div>
    );
  }

  // For large lists, use virtualization
  return (
    <div className={className} style={{ height: maxHeight }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height || maxHeight}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
            overscanCount={overscan}
          >
            {({ index, style }) => (
              <div style={style} key={items[index]?.id || index}>
                {renderItem(items[index], index)}
              </div>
            )}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}