import React from 'react';
import NexusBadge from './NexusBadge';
import NexusButton from './NexusButton';
import { getNexusCssVars } from '../tokens';

const states = {
  OFFLINE: { tone: 'danger', heading: 'Offline' },
  LOCKED: { tone: 'locked', heading: 'Locked' },
  EXPERIMENTAL: { tone: 'experimental', heading: 'Experimental' },
};

/**
 * DegradedStateCard
 * Used to clearly communicate unavailable/guarded panel modes.
 */
export default function DegradedStateCard({
  state = 'OFFLINE',
  reason,
  actionLabel,
  onAction,
  className = '',
}) {
  const meta = states[state] || states.OFFLINE;
  const vars = getNexusCssVars();
  return (
    <div
      className={`rounded-md border p-4 bg-zinc-950/70 border-zinc-700 space-y-3 ${className}`.trim()}
      style={{ ...vars, borderColor: 'var(--nx-border)', backgroundColor: 'var(--nx-panel-bg-raised)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">{meta.heading}</h4>
        <NexusBadge tone={meta.tone}>{state}</NexusBadge>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{reason || 'This module is currently unavailable in the current shell mode.'}</p>
      {actionLabel && onAction ? (
        <div>
          <NexusButton size="sm" intent="subtle" onClick={onAction}>
            {actionLabel}
          </NexusButton>
        </div>
      ) : null}
    </div>
  );
}

