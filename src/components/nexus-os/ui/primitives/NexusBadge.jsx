/**
 * NexusBadge - Standardized badge component
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[10px] font-semibold uppercase tracking-[0.14em]
 * - Borders: Semantic colors with 45-60% opacity
 * - Backgrounds: Semantic colors with low opacity
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getNexusCssVars } from '../tokens';

const toneClasses = {
  neutral: 'border-zinc-700 bg-zinc-900/80 text-zinc-300',
  active: 'border-orange-500/45 bg-orange-500/14 text-zinc-100',
  ok: 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200',
  warning: 'border-amber-600/60 bg-amber-950/45 text-amber-200',
  danger: 'border-red-600/60 bg-red-950/45 text-red-200',
  locked: 'border-zinc-600 bg-zinc-900/95 text-zinc-400',
  experimental: 'border-purple-500/45 bg-purple-500/14 text-purple-100',
};

const toneStyles = {
  active: null,
  experimental: null,
};

export default function NexusBadge({ tone = 'neutral', className = '', children, style, ...props }) {
  const vars = getNexusCssVars();
  const hasTone = Object.prototype.hasOwnProperty.call(toneClasses, tone);
  if (!hasTone && (import.meta || {}).env?.DEV) {
    console.warn(`[NexusBadge] Unsupported tone "${tone}". Falling back to neutral.`);
  }
  const toneClass = hasTone ? toneClasses[tone] : toneClasses.neutral;
  const toneStyle = toneStyles[tone] || null;
  return (
    <Badge
      variant="outline"
      className={`uppercase tracking-[0.14em] text-[10px] font-semibold rounded-md border ${toneClass} ${className}`.trim()}
      style={{ ...vars, ...(toneStyle || {}), ...style }}
      {...props}
    >
      {children}
    </Badge>
  );
}