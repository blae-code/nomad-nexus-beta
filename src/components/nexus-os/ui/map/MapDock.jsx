/**
 * MapDock - Tabbed dock panel for map utilities
 * 
 * DESIGN COMPLIANCE:
 * - Typography: headerPrimary (h4), telemetryPrimary (counts)
 * - Spacing: p-2.5 (panel), gap-1.5 (tabs)
 * - Borders: border-zinc-800 (standard)
 * - Primitives: NexusBadge, NexusButton
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */
import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import { tacticalMapDockIdsForMode } from '../../services/tacticalMapInteractionService';

export function dockIdsForMode(mode) {
  return tacticalMapDockIdsForMode(mode);
}

export default function MapDock({ mode, activeDockId, tabs, onChangeDock }) {
  const allowedIds = new Set(dockIdsForMode(mode));
  const visibleTabs = tabs.filter((tab) => allowedIds.has(tab.id));
  const activeTab = visibleTabs.find((tab) => tab.id === activeDockId) || visibleTabs[0] || null;

  return (
    <div className="space-y-3 nexus-map-sidebar">
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Dock</h4>
          <NexusBadge tone="neutral">{mode}</NexusBadge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleTabs.map((tab) => (
            <NexusButton
              key={tab.id}
              size="sm"
              intent={activeTab?.id === tab.id ? 'primary' : 'subtle'}
              className="text-[10px] nexus-command-capsule"
              data-open={activeTab?.id === tab.id ? 'true' : 'false'}
              onClick={() => onChangeDock(tab.id)}
              title={`${tab.label} dock tab`}
            >
              {tab.label}
              {tab.count !== undefined ? <span className="ml-1 text-zinc-400">{tab.count}</span> : null}
            </NexusButton>
          ))}
        </div>
      </section>
      {activeTab?.content || null}
    </div>
  );
}