import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MapLayerControls({ onLayerToggle, incidents = [], playerStatuses = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [layers, setLayers] = useState({
    locations: true,
    jumpPoints: true,
    hazardZones: true,
    incidentHeatmap: true,
    fleetStatus: true,
    commsCoverage: false,
    spaceLanes: true
  });

  const handleToggle = (layerId) => {
    const newState = { ...layers, [layerId]: !layers[layerId] };
    setLayers(newState);
    onLayerToggle(layerId, newState[layerId]);
  };

  const layerConfig = [
    {
      id: 'locations',
      label: 'Celestial Bodies',
      icon: '📍',
      description: 'Systems, planets, stations, landing zones',
      color: '#fbbf24'
    },
    {
      id: 'jumpPoints',
      label: 'Jump Points',
      icon: '✨',
      description: 'Inter-system passages',
      color: '#10b981'
    },
    {
      id: 'hazardZones',
      label: 'Hazard Zones',
      icon: '⚠️',
      description: 'Asteroids, pirates, radiation, lawless zones',
      color: '#dc2626'
    },
    {
      id: 'incidentHeatmap',
      label: 'Incident Density',
      icon: '🔥',
      description: `Active incidents clustered (${incidents.length})`,
      color: '#a21caf',
      badge: incidents.length
    },
    {
      id: 'fleetStatus',
      label: 'Fleet Positions',
      icon: '👥',
      description: `Personnel status clusters (${playerStatuses.length})`,
      color: '#10b981',
      badge: playerStatuses.length
    },
    {
      id: 'commsCoverage',
      label: 'Signal Coverage',
      icon: '📡',
      description: 'Network signal strength zones',
      color: '#06b6d4'
    },
    {
      id: 'spaceLanes',
      label: 'Trade Routes',
      icon: '🛤️',
      description: 'Primary space lanes and corridors',
      color: '#8b5cf6'
    }
  ];

  return (
    <div className="fixed right-4 top-24 z-40">
      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden w-64">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-between border-b border-zinc-800 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase">Tactical Layers</span>
            <Badge variant="outline" className="text-[9px]">{Object.values(layers).filter(Boolean).length}</Badge>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Layer list */}
        {expanded && (
          <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
            {layerConfig.map(layer => (
              <button
                key={layer.id}
                onClick={() => handleToggle(layer.id)}
                className={cn(
                  'w-full text-left p-2 rounded border transition-all',
                  layers[layer.id]
                    ? 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                    : 'bg-zinc-950 border-zinc-800 opacity-50 hover:opacity-75'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-base">{layer.icon}</span>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-white flex items-center gap-1">
                        {layer.label}
                        {layer.badge && (
                          <Badge className="text-[8px] ml-auto" style={{ backgroundColor: layer.color }}>
                            {layer.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">{layer.description}</div>
                    </div>
                  </div>
                  <div className="mt-1">
                    {layers[layer.id] ? (
                      <Eye className="w-3.5 h-3.5" style={{ color: layer.color }} />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick stats when collapsed */}
        {!expanded && (
          <div className="p-2 text-[9px] text-zinc-400 space-y-1 border-t border-zinc-800">
            <div>🔥 Incidents: {incidents.length}</div>
            <div>👥 Personnel: {playerStatuses.length}</div>
          </div>
        )}
      </Card>
    </div>
  );
}