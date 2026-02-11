import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import { getNexusCssVars } from '../tokens';
import { BRIDGE_CATALOG } from './bridgeCatalog';

/**
 * BridgeSwitcher
 * Placeholder list-based switcher for v0.1 (non-radial).
 */
export default function BridgeSwitcher({ activeBridgeId, onSwitch }) {
  const vars = getNexusCssVars();
  const active = BRIDGE_CATALOG.find((bridge) => bridge.id === activeBridgeId) || BRIDGE_CATALOG[0];

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/75 p-3 space-y-3 nexus-panel-glow"
      style={{ ...vars, borderColor: 'var(--nx-border)', backgroundColor: 'var(--nx-panel-bg)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm text-zinc-100 font-semibold uppercase tracking-[0.14em]">Bridge Switcher</h2>
          <p className="text-xs text-zinc-500 truncate">{active.description}</p>
        </div>
        <NexusBadge tone="active">{active.id}</NexusBadge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {BRIDGE_CATALOG.map((bridge) => (
          <NexusButton
            key={bridge.id}
            size="sm"
            intent={bridge.id === active.id ? 'primary' : 'subtle'}
            onClick={() => onSwitch?.(bridge.id)}
            title={bridge.description}
          >
            {bridge.id}
          </NexusButton>
        ))}
      </div>
    </section>
  );
}
