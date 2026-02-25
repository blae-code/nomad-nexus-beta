/**
 * NexusSignalPill - Signal/metric indicator with icon + value
 * 
 * Compact pill showing icon + numeric value + optional unit.
 * Use for: signal strength, latency, participant counts, metrics.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[8px] font-mono tracking-wider font-semibold
 * - Spacing: px-1.5 py-0.5 gap-0.5
 * - Icon size: w-2.5 h-2.5 (10px)
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
};

/**
 * @param {Object} props
 * @param {string} props.tone - Visual tone (neutral, active, ok, warning, danger)
 * @param {string|number} props.value - Numeric value to display
 * @param {React.Component} [props.icon] - Lucide icon component
 * @param {string} [props.unit] - Unit suffix (ms, %, etc.)
 * @param {string} [props.className] - Additional classes
 */
export default function NexusSignalPill({
  tone = 'neutral',
  value,
  icon: Icon,
  unit = '',
  className = '',
}) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  
  return (
    <div
      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${toneClass} ${className}`}
      role="status"
      aria-label={`${value}${unit}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      <span className="text-[8px] font-mono tracking-wider font-semibold">
        {value}{unit}
      </span>
    </div>
  );
}