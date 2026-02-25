import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

const STATUS_TOKEN_MAP = {
  ready: { family: 'circle', color: 'green', label: 'READY' },
  active: { family: 'circle', color: 'orange', label: 'ACTIVE' },
  onnet: { family: 'circle', color: 'green', label: 'ON-NET' },
  tx: { family: 'circle', color: 'orange', label: 'TX' },
  muted: { family: 'circle', color: 'grey', label: 'MUTED' },
  offline: { family: 'circle', color: 'grey', label: 'OFFLINE' },
  warning: { family: 'circle', color: 'yellow', label: 'WARNING' },
  danger: { family: 'circle', color: 'red', label: 'DANGER' },
};

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

/**
 * NexusStatusToken - semantic status token with optional label.
 */
export default function NexusStatusToken({
  status = 'offline',
  label = '',
  size = 'sm',
  showLabel = true,
  className = '',
  ariaLabel,
}) {
  const key = normalizeStatus(status);
  const mapped = STATUS_TOKEN_MAP[key] || STATUS_TOKEN_MAP.offline;
  const renderedLabel = label || mapped.label;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`.trim()} aria-label={ariaLabel || renderedLabel}>
      <NexusTokenIcon family={mapped.family} color={mapped.color} size={size} alt={`${renderedLabel} status`} />
      {showLabel ? (
        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] leading-none text-zinc-200">{renderedLabel}</span>
      ) : null}
    </span>
  );
}

