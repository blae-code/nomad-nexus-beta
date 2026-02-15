import React, { useState } from 'react';
import { NexusBadge } from '../primitives';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

const LEGEND_SECTIONS = [
  {
    id: 'presence',
    label: 'Unit Presence',
    items: [
      { symbol: { type: 'circle', fill: 'rgba(118, 201, 140, 0.86)', stroke: 'rgba(118, 201, 140, 0.9)' }, label: 'Declared Position', description: 'Direct player report' },
      { symbol: { type: 'circle', fill: 'rgba(201, 161, 94, 0.85)', stroke: 'rgba(201, 161, 94, 0.85)' }, label: 'Inferred Position', description: 'AI-estimated location' },
      { symbol: { type: 'circle', fill: 'rgba(135, 128, 122, 0.72)', stroke: 'rgba(189, 104, 87, 0.85)' }, label: 'Stale Position', description: 'Outdated estimate' },
    ],
  },
  {
    id: 'zones',
    label: 'Control Zones',
    items: [
      { symbol: { type: 'zone', fill: 'rgba(86,150,196,0.12)', stroke: 'rgba(98,174,220,0.56)' }, label: 'Friendly Control', description: 'Org-controlled area' },
      { symbol: { type: 'zone', fill: 'url(#hatch)', stroke: 'rgba(201,145,102,0.7)' }, label: 'Contested Zone', description: 'Multiple factions present' },
      { symbol: { type: 'zone', fill: 'rgba(86,150,196,0.12)', stroke: 'rgba(98,174,220,0.56)', opacity: 0.3 }, label: 'Weak Control', description: 'Low confidence/decaying' },
    ],
  },
  {
    id: 'intel',
    label: 'Intel Markers',
    items: [
      { symbol: { type: 'diamond', fill: 'rgba(84, 146, 196, 0.24)', stroke: 'rgba(118, 201, 140, 0.9)' }, label: 'Intel Pin', description: 'High-value POI' },
      { symbol: { type: 'triangle', fill: 'rgba(98, 162, 138, 0.22)', stroke: 'rgba(201, 161, 94, 0.86)' }, label: 'Tactical Marker', description: 'Operational waypoint' },
      { symbol: { type: 'square', fill: 'rgba(122, 142, 164, 0.22)', stroke: 'rgba(189, 104, 87, 0.82)' }, label: 'Intel Note', description: 'Text annotation' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    items: [
      { symbol: { type: 'circle', fill: 'rgba(94,172,118,0.88)', stroke: 'rgba(94,172,118,0.88)' }, label: 'Comms Net (OK)', description: 'Operational voice net' },
      { symbol: { type: 'circle', fill: 'rgba(201,161,94,0.9)', stroke: 'rgba(201,161,94,0.9)' }, label: 'Comms Net (Degraded)', description: 'Quality issues' },
      { symbol: { type: 'circle', fill: 'rgba(214,83,64,0.94)', stroke: 'rgba(214,83,64,0.94)' }, label: 'Comms Net (Contested)', description: 'Interference detected' },
      { symbol: { type: 'triangle-callout', fill: 'rgba(214, 83, 64, 0.92)' }, label: 'Critical Callout', description: 'Priority transmission' },
      { symbol: { type: 'triangle-callout', fill: 'rgba(201, 161, 94, 0.9)' }, label: 'High Priority', description: 'Elevated importance' },
      { symbol: { type: 'triangle-callout', fill: 'rgba(118, 172, 214, 0.84)' }, label: 'Standard Callout', description: 'Normal traffic' },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    items: [
      { symbol: { type: 'arrow', stroke: 'rgba(118, 201, 140, 0.88)' }, label: 'Extract Route', description: 'Safe egress path' },
      { symbol: { type: 'arrow', stroke: 'rgba(201, 161, 94, 0.86)', dashed: true }, label: 'Hold Lane', description: 'Maintain position' },
      { symbol: { type: 'arrow', stroke: 'rgba(214, 83, 64, 0.9)' }, label: 'Avoid Lane', description: 'Danger zone' },
      { symbol: { type: 'arrow', stroke: 'rgba(94, 158, 178, 0.82)', dashed: true }, label: 'Route Hypothesis', description: 'Predicted movement' },
    ],
  },
  {
    id: 'nodes',
    label: 'Map Nodes',
    items: [
      { symbol: { type: 'circle', fill: 'rgba(214, 168, 94, 0.26)', stroke: 'rgba(235, 224, 146, 0.86)', size: 'large' }, label: 'Star System', description: 'Stellar primary' },
      { symbol: { type: 'circle', fill: 'rgba(70, 132, 108, 0.27)', stroke: 'rgba(142, 206, 172, 0.74)' }, label: 'Planet', description: 'Major celestial body' },
      { symbol: { type: 'circle', fill: 'rgba(74, 92, 104, 0.24)', stroke: 'rgba(154, 170, 186, 0.62)' }, label: 'Moon', description: 'Natural satellite' },
      { symbol: { type: 'circle', fill: 'rgba(50, 112, 92, 0.32)', stroke: 'rgba(124, 220, 168, 0.84)' }, label: 'Station', description: 'Orbital installation' },
      { symbol: { type: 'circle', fill: 'rgba(120, 102, 58, 0.2)', stroke: 'rgba(210, 196, 118, 0.72)' }, label: 'Lagrange Point', description: 'Gravitational equilibrium' },
      { symbol: { type: 'circle', fill: 'rgba(64, 90, 80, 0.12)', stroke: 'rgba(132, 186, 156, 0.54)', size: 'small' }, label: 'Orbital Marker', description: 'Minor POI' },
    ],
  },
];

function LegendSymbol({ symbol }) {
  if (symbol.type === 'circle') {
    const size = symbol.size === 'large' ? 12 : symbol.size === 'small' ? 6 : 8;
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r={size}
          fill={symbol.fill}
          stroke={symbol.stroke}
          strokeWidth="1.5"
          opacity={symbol.opacity || 1}
        />
      </svg>
    );
  }

  if (symbol.type === 'diamond') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon
          points="12,4 20,12 12,20 4,12"
          fill={symbol.fill}
          stroke={symbol.stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (symbol.type === 'triangle') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon
          points="12,4 20,20 4,20"
          fill={symbol.fill}
          stroke={symbol.stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (symbol.type === 'triangle-callout') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon
          points="12,8 17,16 7,16"
          fill="rgba(17,13,11,0.9)"
          stroke={symbol.fill}
          strokeWidth="1.5"
        />
        <circle cx="12" cy="14" r="2" fill={symbol.fill} />
      </svg>
    );
  }

  if (symbol.type === 'square') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          fill={symbol.fill}
          stroke={symbol.stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (symbol.type === 'arrow') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <line
          x1="4"
          y1="12"
          x2="18"
          y2="12"
          stroke={symbol.stroke}
          strokeWidth="2"
          strokeDasharray={symbol.dashed ? '3 2' : undefined}
        />
        <circle cx="18" cy="12" r="3" fill={symbol.stroke} />
      </svg>
    );
  }

  if (symbol.type === 'zone') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={symbol.fill === 'url(#hatch)' ? 'rgba(201,152,96,0.15)' : symbol.fill}
          stroke={symbol.stroke}
          strokeWidth="1.5"
          opacity={symbol.opacity || 1}
        />
        {symbol.fill === 'url(#hatch)' && (
          <>
            <line x1="6" y1="6" x2="18" y2="18" stroke="rgba(201,152,96,0.4)" strokeWidth="1" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="rgba(201,152,96,0.4)" strokeWidth="1" />
          </>
        )}
      </svg>
    );
  }

  return null;
}

export function MapLegend({ compact = false }) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (compact) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 max-h-[400px] overflow-y-auto">
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3 text-zinc-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Map Legend</h4>
        </div>
        {LEGEND_SECTIONS.slice(0, 3).map((section) => (
          <div key={section.id} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{section.label}</div>
            {section.items.slice(0, 2).map((item, idx) => (
              <div key={`${section.id}-${idx}`} className="flex items-center gap-2">
                <LegendSymbol symbol={item.symbol} />
                <span className="text-[11px] text-zinc-300">{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-zinc-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Map Legend</h4>
      </div>

      {LEGEND_SECTIONS.map((section) => {
        const isCollapsed = collapsedSections[section.id];

        return (
          <section key={section.id} className="rounded border border-zinc-800 bg-zinc-900/45 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{section.label}</span>
              </div>
              <NexusBadge tone="neutral">{section.items.length}</NexusBadge>
            </button>

            {!isCollapsed && (
              <div className="px-2.5 pb-2 space-y-1.5">
                {section.items.map((item, idx) => (
                  <div key={`${section.id}-${idx}`} className="flex items-start gap-2 rounded bg-zinc-950/55 px-2 py-1.5">
                    <div className="flex-shrink-0 mt-0.5">
                      <LegendSymbol symbol={item.symbol} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-zinc-200">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="rounded border border-zinc-700/50 bg-zinc-900/30 px-2.5 py-2 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Confidence Bands</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">HIGH</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-green-700 to-green-500" />
            <span className="text-zinc-300">≥80%</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">MED</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-yellow-700 to-yellow-500" />
            <span className="text-zinc-300">50-79%</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">LOW</span>
            <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-red-700 to-red-500" />
            <span className="text-zinc-300">&lt;50%</span>
          </div>
        </div>
      </div>

      <div className="rounded border border-zinc-700/50 bg-zinc-900/30 px-2.5 py-2 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Interaction</div>
        <div className="text-[11px] text-zinc-400 space-y-1">
          <div>• Click node/marker for radial menu</div>
          <div>• Right-click for context actions</div>
          <div>• Drag map to pan, scroll to zoom</div>
          <div>• Double-click to reset view</div>
        </div>
      </div>
    </div>
  );
}