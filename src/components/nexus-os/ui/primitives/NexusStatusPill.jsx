/**
 * NexusStatusPill - Compact status indicator with dot + label
 * 
 * Pill-style status badge with colored dot and uppercase label.
 * Use for: panel headers, card badges, compact status displays.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[8px] font-mono uppercase tracking-wider font-semibold
 * - Spacing: px-1.5 py-0.5 gap-1
 * - Borders: zinc-700/40 (standard), semantic colors for states
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';

const TONE_CLASSES = {
  neutral: 'border-zinc-700 bg-zinc-900/80 text-zinc-300',
  active: 'border-orange-500/45 bg-orange-500/14 text-zinc-100',
  ok: 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200',
  warning: 'border-amber-600/60 bg-amber-950/45 text-amber-200',
  danger: 'border-red-600/60 bg-red-950/45 text-red-200',
  locked: 'border-zinc-600 bg-zinc-900/95 text-zinc-400',
};

const DOT_COLORS = {
  neutral: 'bg-zinc-400',
  active: 'bg-orange-400',
  ok: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-500',
  locked: 'bg-zinc-600',
};

/**
 * @param {Object} props
 * @param {string} props.tone - Visual tone (neutral, active, ok, warning, danger, locked)
 * @param {string} props.label - Status label text
 * @param {string} [props.size='sm'] - Size variant (sm, md)
 * @param {string} [props.className] - Additional classes
 */
export default function NexusStatusPill({
  tone = 'neutral',
  label,
  size = 'sm',
  className = '',
}) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  const dotColor = DOT_COLORS[tone] || DOT_COLORS.neutral;
  const sizeClass = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5';
  
  return (
    <div
      className={`flex items-center gap-1 ${sizeClass} rounded border ${toneClass} ${className}`}
      role="status"
      aria-label={label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="text-[8px] font-mono uppercase tracking-wider font-semibold">
        {label}
      </span>
    </div>
  );
}