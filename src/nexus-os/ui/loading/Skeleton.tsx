import React from 'react';
import { useReducedMotion } from '../motion';

interface BaseSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonBase({ className = '', style }: BaseSkeletonProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className={`rounded bg-zinc-800/70 ${reducedMotion ? '' : 'nx-skeleton-shimmer'} ${className}`.trim()}
      style={style}
    >
      <style>{`
        .nx-skeleton-shimmer {
          position: relative;
          overflow: hidden;
        }
        .nx-skeleton-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          animation: nx-skeleton-slide 1.2s ease-in-out infinite;
        }
        @keyframes nx-skeleton-slide {
          to { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonBlock({ className = '', style }: BaseSkeletonProps) {
  return <SkeletonBase className={`h-24 ${className}`.trim()} style={style} />;
}

export function SkeletonText({ className = '', style }: BaseSkeletonProps) {
  return <SkeletonBase className={`h-3 ${className}`.trim()} style={style} />;
}

export function SkeletonTile({ className = '', style }: BaseSkeletonProps) {
  return <SkeletonBase className={`h-16 ${className}`.trim()} style={style} />;
}

