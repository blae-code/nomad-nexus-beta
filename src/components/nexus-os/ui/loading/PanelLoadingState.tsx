import React from 'react';
import { SkeletonBlock, SkeletonText, SkeletonTile } from './Skeleton';

interface PanelLoadingStateProps {
  label?: string;
}

export default function PanelLoadingState({ label = 'Loading panel data...' }: PanelLoadingStateProps) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="space-y-2">
        <SkeletonText className="w-4/5" />
        <SkeletonText className="w-3/5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <SkeletonTile />
        <SkeletonTile />
      </div>
      <SkeletonBlock className="h-40" />
    </div>
  );
}

