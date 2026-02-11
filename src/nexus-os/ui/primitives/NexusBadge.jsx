import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getNexusCssVars } from '../tokens';

const toneClasses = {
  neutral: 'border-zinc-700 bg-zinc-900/80 text-zinc-300',
  active: 'border-orange-500/60 bg-orange-900/35 text-orange-200 shadow-[0_0_12px_rgba(181,88,45,0.22)]',
  ok: 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200',
  warning: 'border-amber-600/60 bg-amber-950/45 text-amber-200',
  danger: 'border-red-600/60 bg-red-950/45 text-red-200 shadow-[0_0_12px_rgba(165,67,56,0.2)]',
  locked: 'border-zinc-600 bg-zinc-900/95 text-zinc-400',
  experimental: 'border-orange-700/60 bg-zinc-900/95 text-orange-300',
};

export default function NexusBadge({ tone = 'neutral', className = '', children, style, ...props }) {
  const vars = getNexusCssVars();
  const toneClass = toneClasses[tone] || toneClasses.neutral;
  return (
    <Badge
      variant="outline"
      className={`uppercase tracking-[0.14em] text-[10px] font-semibold rounded-md ${toneClass} ${className}`.trim()}
      style={{ ...vars, ...style }}
      {...props}
    >
      {children}
    </Badge>
  );
}
