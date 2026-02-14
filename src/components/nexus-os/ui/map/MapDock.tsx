import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import type { TacticalMapDockId, TacticalMapMode } from '../../schemas/mapSchemas';
import { tacticalMapDockIdsForMode } from '../../services/tacticalMapInteractionService';

export interface MapDockTab {
  id: TacticalMapDockId;
  label: string;
  count?: number | string;
  content: React.ReactNode;
}

interface MapDockProps {
  mode: TacticalMapMode;
  activeDockId: TacticalMapDockId;
  tabs: MapDockTab[];
  onChangeDock: (dockId: TacticalMapDockId) => void;
}

export function dockIdsForMode(mode: TacticalMapMode): TacticalMapDockId[] {
  return tacticalMapDockIdsForMode(mode);
}

export default function MapDock({ mode, activeDockId, tabs, onChangeDock }: MapDockProps) {
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
