import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Nexus-style skeleton loader with shimmer animation
 * Telemetry shimmer, monospace appearance, minimal
 */
export function SkeletonLoader({ 
  height = 'h-8', 
  width = 'w-full',
  count = 1,
  className = '',
  variant = 'line'
}) {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className={cn('space-y-2 p-3 border border-zinc-800 rounded bg-zinc-900/30', className)}>
        <div className="h-4 w-1/3 bg-zinc-800 rounded animate-pulse" />
        <div className="space-y-1">
          <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-2 w-1/2 bg-zinc-900 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: line skeleton
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((_, i) => (
        <div
          key={i}
          className={cn(
            height,
            width,
            'bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 rounded',
            'animate-pulse'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Shimmer effect for scanning/telemetry feel
 */
export function ShimmerLine({ width = 'w-full', height = 'h-2', className = '' }) {
  return (
    <div className={cn(
      width,
      height,
      'bg-gradient-to-r from-transparent via-zinc-700 to-transparent',
      'animate-pulse rounded-full',
      className
    )} />
  );
}