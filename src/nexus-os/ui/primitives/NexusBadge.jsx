import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getNexusCssVars } from '../tokens';

const toneClasses = {
  neutral: 'border-zinc-700 bg-zinc-900/80 text-zinc-300',
  active: 'text-zinc-100',
  ok: 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200',
  warning: 'border-amber-600/60 bg-amber-950/45 text-amber-200',
  danger: 'border-red-600/60 bg-red-950/45 text-red-200',
  locked: 'border-zinc-600 bg-zinc-900/95 text-zinc-400',
  experimental: 'bg-zinc-900/95 text-zinc-100',
};

const toneStyles = {
  active: {
    borderColor: 'rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.45)',
    backgroundColor: 'rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.14)',
  },
  experimental: {
    borderColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.38)',
    backgroundColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.12)',
  },
};

export default function NexusBadge({ tone = 'neutral', className = '', children, style, ...props }) {
  const vars = getNexusCssVars();
  const toneClass = toneClasses[tone] || toneClasses.neutral;
  const toneStyle = toneStyles[tone] || null;
  return (
    <Badge
      variant="outline"
      className={`uppercase tracking-[0.14em] text-[10px] font-semibold rounded-md ${toneClass} ${className}`.trim()}
      style={{ ...vars, ...(toneStyle || {}), ...style }}
      {...props}
    >
      {children}
    </Badge>
  );
}
