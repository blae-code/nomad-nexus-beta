import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import { getNexusCssVars } from '../tokens';
import { BRIDGE_CATALOG } from './bridgeCatalog';
import { getBridgeVisualTheme } from './bridgeVisualTheme';

/**
 * BridgeSwitcher
 * Placeholder list-based switcher for v0.1 (non-radial).
 */
export default function BridgeSwitcher({ activeBridgeId, onSwitch }) {
  const vars = getNexusCssVars();
  const active = BRIDGE_CATALOG.find((bridge) => bridge.id === activeBridgeId) || BRIDGE_CATALOG[0];
  const activeTheme = getBridgeVisualTheme(active.id);

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/75 p-3 space-y-3 nexus-panel-glow"
      style={{
        ...vars,
        borderColor: 'var(--nx-border)',
        backgroundImage:
          `linear-gradient(145deg, rgba(${activeTheme.accentRgb}, 0.16), rgba(${activeTheme.accentAltRgb}, 0.1) 38%, rgba(16, 14, 13, 0.92))`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm text-zinc-100 font-semibold uppercase tracking-[0.14em]">Bridge Switcher</h2>
          <p className="text-xs text-zinc-500 truncate">{active.description}</p>
        </div>
        <NexusBadge tone="active">{active.id}</NexusBadge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {BRIDGE_CATALOG.map((bridge) => {
          const theme = getBridgeVisualTheme(bridge.id);
          const isActive = bridge.id === active.id;
          return (
            <NexusButton
              key={bridge.id}
              size="sm"
              intent={isActive ? 'primary' : 'subtle'}
              onClick={() => onSwitch?.(bridge.id)}
              title={bridge.description}
              className="h-14 normal-case tracking-[0.08em] px-2"
              style={{
                borderColor: isActive
                  ? `rgba(${theme.accentRgb}, 0.78)`
                  : `rgba(${theme.accentAltRgb}, 0.36)`,
                backgroundImage: isActive
                  ? `linear-gradient(165deg, rgba(${theme.accentSoftRgb}, 0.34), rgba(${theme.accentRgb}, 0.88) 58%, rgba(${theme.accentAltRgb}, 0.62))`
                  : `linear-gradient(165deg, rgba(${theme.accentRgb}, 0.16), rgba(14, 12, 11, 0.86) 52%, rgba(${theme.accentAltRgb}, 0.2))`,
              }}
            >
              <span className="flex flex-col items-start leading-tight">
                <span>{bridge.id}</span>
                <span className="text-[10px] opacity-80">{bridge.label.replace(' Bridge', '')}</span>
              </span>
            </NexusButton>
          );
        })}
      </div>
    </section>
  );
}
