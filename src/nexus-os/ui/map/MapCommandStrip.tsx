import React from 'react';
import { transitionStyle } from '../motion';
import { NexusBadge, NexusButton } from '../primitives';
import type { MapLayerState, TacticalLayerId, TacticalMapMode } from '../../schemas/mapSchemas';
import type { TacticalMapViewMode } from './mapTypes';

interface MapCommandStripProps {
  mode: TacticalMapMode;
  viewMode: TacticalMapViewMode;
  layers: MapLayerState[];
  activeLayerCount: number;
  hasAnyOverlay: boolean;
  riskScore: number;
  showStations: boolean;
  showLagrange: boolean;
  showOmMarkers: boolean;
  reducedMotion: boolean;
  scopeIsGlobal: boolean;
  commandSurfaceV2Enabled: boolean;
  rosterItems: Array<{
    id: string;
    label: string;
    stateLabel: string;
    stateTone: 'ok' | 'warning' | 'danger' | 'neutral';
    detail: string;
  }>;
  onToggleLayer: (layerId: TacticalLayerId) => void;
  onChangeMode: (mode: TacticalMapMode) => void;
  onChangeViewMode: (mode: TacticalMapViewMode) => void;
  onToggleStations: () => void;
  onToggleLagrange: () => void;
  onToggleOmMarkers: () => void;
  onOpenMapFocus?: () => void;
}

function layerLabel(id: TacticalLayerId): string {
  if (id === 'controlZones') return 'Control';
  if (id === 'ops') return 'Ops';
  if (id === 'intel') return 'Intel';
  if (id === 'comms') return 'Comms';
  if (id === 'logistics') return 'Logistics';
  return 'Presence';
}

export default function MapCommandStrip({
  mode,
  viewMode,
  layers,
  activeLayerCount,
  hasAnyOverlay,
  riskScore,
  showStations,
  showLagrange,
  showOmMarkers,
  reducedMotion,
  scopeIsGlobal,
  commandSurfaceV2Enabled,
  rosterItems,
  onToggleLayer,
  onChangeMode,
  onChangeViewMode,
  onToggleStations,
  onToggleLagrange,
  onToggleOmMarkers,
  onOpenMapFocus,
}: MapCommandStripProps) {
  return (
    <section className="nexus-map-instrument rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 space-y-3 nexus-terminal-panel nexus-map-toolbar">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100 truncate">Tactical Controls</h3>
          <NexusBadge tone={riskScore >= 70 ? 'danger' : riskScore >= 45 ? 'warning' : 'ok'}>Risk {riskScore}</NexusBadge>
        </div>
        {onOpenMapFocus ? (
          <NexusButton size="sm" intent="subtle" onClick={onOpenMapFocus}>
            Focus
          </NexusButton>
        ) : null}
      </div>

      <div className="nexus-map-control-grid">
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Mode Envelope</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['ESSENTIAL', 'COMMAND', 'FULL'] as TacticalMapMode[]).map((entry) => (
              <NexusButton
                key={entry}
                size="sm"
                intent={mode === entry ? 'primary' : 'subtle'}
                className="nexus-command-capsule"
                data-open={mode === entry ? 'true' : 'false'}
                title={`Switch to ${entry} mode`}
                onClick={() => onChangeMode(entry)}
              >
                {entry}
              </NexusButton>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Map Scope</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['SYSTEM', 'PLANETARY', 'LOCAL'] as TacticalMapViewMode[]).map((entry) => (
              <NexusButton
                key={entry}
                size="sm"
                intent={viewMode === entry ? 'primary' : 'subtle'}
                className="nexus-command-capsule"
                data-open={viewMode === entry ? 'true' : 'false'}
                onClick={() => onChangeViewMode(entry)}
                title={`Switch to ${entry} map scope`}
              >
                {entry}
              </NexusButton>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Layer Stack</div>
        <div className="flex items-center gap-2 flex-wrap">
          <NexusBadge tone={hasAnyOverlay ? 'active' : 'neutral'}>{hasAnyOverlay ? 'LIVE' : 'BASELINE'}</NexusBadge>
          <NexusBadge tone="neutral">Layers {activeLayerCount}/{layers.length}</NexusBadge>
          <NexusBadge tone={scopeIsGlobal ? 'warning' : 'ok'}>{scopeIsGlobal ? 'GLOBAL SCOPE' : 'OP SCOPE'}</NexusBadge>
          {!commandSurfaceV2Enabled ? <NexusBadge tone="neutral">LEGACY COMMS</NexusBadge> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {layers.map((layer) => (
          <NexusButton
            key={layer.id}
            size="sm"
            intent={layer.enabled ? 'primary' : 'subtle'}
            className="nexus-command-capsule"
            data-open={layer.enabled ? 'true' : 'false'}
            onClick={() => onToggleLayer(layer.id)}
            title={`${layerLabel(layer.id)} layer toggle`}
            style={transitionStyle({
              preset: 'toggle',
              reducedMotion,
              properties: 'opacity, background-color, border-color',
            })}
          >
            {layerLabel(layer.id)}
          </NexusButton>
        ))}
        {mode !== 'ESSENTIAL' ? (
          <>
            <div className="h-5 w-px bg-zinc-700/70" />
            <NexusButton size="sm" intent={showStations ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showStations ? 'true' : 'false'} onClick={onToggleStations} title="Toggle stations">
              Stations
            </NexusButton>
            <NexusButton size="sm" intent={showLagrange ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showLagrange ? 'true' : 'false'} onClick={onToggleLagrange} title="Toggle Lagrange points">
              Lagrange
            </NexusButton>
            <NexusButton size="sm" intent={showOmMarkers ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showOmMarkers ? 'true' : 'false'} onClick={onToggleOmMarkers} title="Toggle orbital marker ring">
              OM
            </NexusButton>
          </>
        ) : null}
      </div>

      <section className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Fleet Roster</div>
          <NexusBadge tone="neutral">{rosterItems.length}</NexusBadge>
        </div>
        {rosterItems.map((item) => (
          <div key={item.id} className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-200 truncate">{item.label}</span>
              <NexusBadge tone={item.stateTone}>{item.stateLabel}</NexusBadge>
            </div>
            <div className="text-zinc-500 mt-0.5 truncate">{item.detail}</div>
          </div>
        ))}
        {rosterItems.length === 0 ? (
          <div className="text-[11px] text-zinc-500 rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1">No active presence data in scope.</div>
        ) : null}
      </section>
    </section>
  );
}
