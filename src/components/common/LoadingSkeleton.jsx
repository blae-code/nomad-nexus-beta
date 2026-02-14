import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3">
          <Skeleton className="h-5 w-3/4 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <Skeleton className="h-4 w-2/3 bg-zinc-800" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-16 bg-zinc-800" />
            <Skeleton className="h-6 w-20 bg-zinc-800" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ListItemSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded border border-zinc-800">
          <Skeleton className="h-10 w-10 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 bg-zinc-800" />
            <Skeleton className="h-3 w-48 bg-zinc-800" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-8 bg-zinc-800" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-10 bg-zinc-800" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EventCardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-2/3 bg-zinc-800" />
              <Skeleton className="h-4 w-1/2 bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-24 bg-zinc-800" />
          </div>
          <Skeleton className="h-16 w-full bg-zinc-800" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 bg-zinc-800" />
            <Skeleton className="h-6 w-24 bg-zinc-800" />
            <Skeleton className="h-6 w-16 bg-zinc-800" />
          </div>
        </div>
      ))}
    </>
  );
}

export function VoiceNetSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 bg-zinc-800" />
            <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
          </div>
          <Skeleton className="h-3 w-full bg-zinc-800" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
            <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
            <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </>
  );
}