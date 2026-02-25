/**
 * NexusTokenLabel - Token + text label combination
 * 
 * Flexible token + text layout (inline or stacked).
 * Use for: labeled markers, channel names, objective labels.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[10px] (inline), text-[8px] (stacked)
 * - Spacing: gap-1.5 (inline), gap-1 (stacked)
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

/**
 * @param {Object} props
 * @param {Object} props.token - Token config { family, color, size, variant }
 * @param {string} props.label - Text label
 * @param {string} [props.layout='inline'] - Layout mode (inline, stacked)
 * @param {string} [props.className] - Additional classes
 */
export default function NexusTokenLabel({
  token,
  label,
  layout = 'inline',
  className = '',
}) {
  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <NexusTokenIcon {...token} />
        <span className="text-[8px] uppercase tracking-[0.14em] font-semibold">
          {label}
        </span>
      </div>
    );
  }
  
  // Inline (default)
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <NexusTokenIcon {...token} />
      <span className="text-[10px] uppercase tracking-[0.12em] font-semibold">
        {label}
      </span>
    </div>
  );
}