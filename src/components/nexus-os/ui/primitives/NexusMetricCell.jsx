/**
 * NexusMetricCell - Labeled metric display for footers/grids
 * 
 * Vertical stack: label (top) + value (bottom).
 * Use for: footer metrics, dashboard cells, stat displays.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: label text-[8px], value text-[10px] font-mono font-bold
 * - Spacing: px-2 py-2 flex-col items-center
 * - Optional token support for visual enhancement
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

const TONE_COLORS = {
  neutral: 'text-orange-400',
  ok: 'text-green-400',
  warning: 'text-amber-400',
  danger: 'text-red-500',
};

/**
 * @param {Object} props
 * @param {string} props.label - Metric label
 * @param {string|number} props.value - Metric value
 * @param {string} [props.tone='neutral'] - Value color tone
 * @param {Object} [props.token] - Optional token config { family, color, size }
 * @param {string} [props.className] - Additional classes
 */
export default function NexusMetricCell({
  label,
  value,
  tone = 'neutral',
  token = null,
  className = '',
}) {
  const valueColor = TONE_COLORS[tone] || TONE_COLORS.neutral;
  
  return (
    <div
      className={`px-2 py-2 flex flex-col items-center ${className}`}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      {token && (
        <NexusTokenIcon
          family={token.family}
          color={token.color}
          size={token.size || 'sm'}
          className="mb-0.5"
        />
      )}
      <span className="text-[8px] text-zinc-300 uppercase tracking-wider font-semibold">
        {label}
      </span>
      <span className={`text-[10px] font-mono font-bold mt-0.5 ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}