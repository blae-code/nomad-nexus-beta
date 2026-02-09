import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getNexusCssVars } from '../tokens';

const toneClasses = {
  neutral: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  active: 'border-orange-500/60 bg-orange-900/30 text-orange-200',
  ok: 'border-emerald-600/60 bg-emerald-950/40 text-emerald-200',
  warning: 'border-amber-600/60 bg-amber-950/40 text-amber-200',
  danger: 'border-red-600/60 bg-red-950/40 text-red-200',
  locked: 'border-zinc-600 bg-zinc-900/90 text-zinc-400',
  experimental: 'border-orange-700/60 bg-zinc-900 text-orange-300',
};

export default function NexusBadge({ tone = 'neutral', className = '', children, style, ...props }) {
  const vars = getNexusCssVars();
  const toneClass = toneClasses[tone] || toneClasses.neutral;
  return (
    <Badge
      variant="outline"
      className={`uppercase tracking-[0.12em] text-[10px] font-semibold ${toneClass} ${className}`.trim()}
      style={{ ...vars, ...style }}
      {...props}
    >
      {children}
    </Badge>
  );
}

