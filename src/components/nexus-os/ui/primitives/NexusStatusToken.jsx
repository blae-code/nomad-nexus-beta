/**
 * NexusStatusToken - Status indicator with token + optional label
 * 
 * Combines circle token with semantic color + text label.
 * Use for: online/offline, ready/busy, operational states.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[8px] uppercase tracking-[0.14em]
 * - Layout: gap-1.5 for token + label
 * - Token sizing: sm (default) for inline use
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

const STATUS_TOKEN_MAP = {
  ready: { family: 'circle', color: 'green' },
  active: { family: 'circle', color: 'orange' },
  warning: { family: 'circle', color: 'yellow' },
  danger: { family: 'circle', color: 'red' },
  offline: { family: 'circle', color: 'grey' },
  neutral: { family: 'circle', color: 'grey' },
  muted: { family: 'circle', color: 'grey' },
  transmitting: { family: 'circle', color: 'orange' },
};

/**
 * @param {Object} props
 * @param {string} props.status - Status key (ready, active, warning, danger, offline, etc.)
 * @param {string} [props.label] - Text label (auto-uppercase)
 * @param {string} [props.size='sm'] - Token size
 * @param {boolean} [props.showLabel=true] - Whether to show label
 * @param {string} [props.className] - Additional classes
 */
export default function NexusStatusToken({
  status,
  label,
  size = 'sm',
  showLabel = true,
  className = '',
}) {
  const tokenConfig = STATUS_TOKEN_MAP[status] || STATUS_TOKEN_MAP.neutral;
  const displayLabel = label || status;
  
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      <NexusTokenIcon
        family={tokenConfig.family}
        color={tokenConfig.color}
        size={size}
        tooltip={displayLabel}
      />
      {showLabel && (
        <span className="text-[8px] uppercase tracking-[0.14em] font-semibold">
          {displayLabel}
        </span>
      )}
    </div>
  );
}