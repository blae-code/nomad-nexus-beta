import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Star Citizen Universe Map - Stanton System
 * Displays celestial bodies with relative positioning for tactical reference
 */

const STANTON_SYSTEM = {
  name: 'Stanton System',
  center: [0, 0],
  zoom: 2,
  celestialBodies: [
    // Primary Star
    {
      id: 'stanton',
      name: 'Stanton (Primary Star)',
      position: [0, 0],
      type: 'star',
      radius: 696000,
      displayRadius: 800000, // Scaled for visibility
      color: '#ffaa00',
      description: 'Class G2V Main Sequence Star',
      children: []
    },

    // Planetary System - Crusader (Gas Giant)
    {
      id: 'crusader',
      name: 'Crusader',
      position: [0, 150000000],
      type: 'planet',
      radius: 82000000,
      displayRadius: 35000000,
      color: '#4488ff',
      description: 'Gas Giant - Primary Trade Hub',
      moons: [
        { name: 'Usea', position: [0, 165000000], type: 'moon', color: '#888888' },
        { name: 'Caliban', position: [15000000, 155000000], type: 'moon', color: '#666666' },
        { name: 'Daymar', position: [-20000000, 150000000], type: 'moon', color: '#aa8844' },
        { name: 'Yela', position: [10000000, 145000000], type: 'moon', color: '#cccccc' }
      ]
    },

    // Planetary System - Stanton (Terrestrial)
    {
      id: 'stanton-planet',
      name: 'Stanton (Planet)',
      position: [0, 60000000],
      type: 'planet',
      radius: 6400000,
      displayRadius: 8000000,
      color: '#228844',
      description: 'Terrestrial Planet',
      moons: []
    },

    // Planetary System - Hurston (Terrestrial)
    {
      id: 'hurston',
      name: 'Hurston',
      position: [80000000, 0],
      type: 'planet',
      radius: 6480000,
      displayRadius: 8000000,
      color: '#664488',
      description: 'Terrestrial Planet - UEE Space'
    },

    // Planetary System - ArcCorp (Terrestrial)
    {
      id: 'arccorp',
      name: 'ArcCorp',
      position: [-80000000, 0],
      type: 'planet',
      radius: 6300000,
      displayRadius: 8000000,
      color: '#444488',
      description: 'Terrestrial Planet - Corporate Hub'
    },

    // Planetary System - Microtech (Terrestrial)
    {
      id: 'microtech',
      name: 'Microtech',
      position: [0, -60000000],
      type: 'planet',
      radius: 5400000,
      displayRadius: 7000000,
      color: '#00dddd',
      description: 'Terrestrial Planet - Tech Center'
    },

    // Planetary System - Davien (Binary Companion)
    {
      id: 'davien',
      name: 'Davien (Binary Star)',
      position: [200000000, 200000000],
      type: 'star',
      radius: 500000,
      displayRadius: 600000,
      color: '#ff6600',
      description: 'Class K2 Binary Companion'
    }
  ]
};

const ZoomControls = () => {
  const map = useMap();

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-40">
      <Button
        size="icon"
        onClick={() => map.zoomIn()}
        className="h-8 w-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        onClick={() => map.zoomOut()}
        className="h-8 w-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        onClick={() => map.setView([0, 0], 2)}
        className="h-8 w-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
      >
        <Navigation className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default function StarCitizenMap({ interactive = true }) {
  const [selectedBody, setSelectedBody] = useState(null);

  const createBodyIcon = (type, color) => {
    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="#000" stroke-width="1"/>
      ${type === 'star' ? '<circle cx="12" cy="12" r="6" fill="#ffff00" opacity="0.5"/>' : ''}
    </svg>`;

    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded">
      {/* Header */}
      <div className="flex gap-2 p-3 border-b border-zinc-800 bg-zinc-950 items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#ea580c]" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Stanton System Tactical Map
          </span>
        </div>
        {selectedBody && (
          <div className="text-[10px] text-zinc-400 font-mono">
            {selectedBody.name} • {selectedBody.description}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="stanton-map"
          dragging={interactive}
          touchZoom={interactive}
        >
          {/* Space Background */}
          <TileLayer
            url="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAzMDMwMyIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuNiIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMzAiIHI9IjAuNSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC40Ii8+PGNpcmNsZSBjeD0iNzAiIGN5PSI2MCIgcj0iMC4zIiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4="
            attribution="Star Citizen Universe"
            bounds={[[-500000000, -500000000], [500000000, 500000000]]}
          />

          {/* Render celestial bodies */}
          {STANTON_SYSTEM.celestialBodies.map((body) => (
            <React.Fragment key={body.id}>
              {/* Planet/Star circle */}
              <Circle
                center={body.position}
                radius={body.displayRadius}
                pathOptions={{
                  color: body.color,
                  weight: 1,
                  opacity: 0.3,
                  fillOpacity: 0.05,
                  dashArray: '2, 4'
                }}
              />

              {/* Body marker */}
              <Marker
                position={body.position}
                icon={createBodyIcon(body.type, body.color)}
                eventHandlers={{
                  click: () => setSelectedBody(body)
                }}
              >
                <Popup className="stanton-popup">
                  <div className="text-xs text-white bg-zinc-900 p-3 min-w-[250px] space-y-2">
                    <div className="font-bold text-[#ea580c] uppercase tracking-wider">
                      {body.name}
                    </div>
                    <div className="text-[10px] text-zinc-300">
                      {body.description}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-400 space-y-1">
                      <div>Type: {body.type}</div>
                      <div>Lat: {body.position[0].toFixed(0)}</div>
                      <div>Long: {body.position[1].toFixed(0)}</div>
                    </div>
                    {body.moons && body.moons.length > 0 && (
                      <div className="border-t border-zinc-700 pt-2">
                        <div className="text-[10px] font-bold text-zinc-300 mb-1">
                          Satellites:
                        </div>
                        {body.moons.map((moon) => (
                          <div key={moon.name} className="text-[9px] text-zinc-400">
                            • {moon.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Moons */}
              {body.moons?.map((moon) => (
                <Marker
                  key={`${body.id}-${moon.name}`}
                  position={moon.position}
                  icon={createBodyIcon('moon', moon.color)}
                >
                  <Popup className="stanton-popup">
                    <div className="text-xs text-white bg-zinc-900 p-2 min-w-[150px]">
                      <div className="font-bold text-[#ea580c]">{moon.name}</div>
                      <div className="text-[9px] text-zinc-400">Moon of {body.name}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          ))}

          {/* Zoom Controls */}
          <ZoomControls />
        </MapContainer>
      </div>

      {/* Info Footer */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-3 py-2 text-[9px] text-zinc-500 font-mono">
        <div>Stanton System • Scale adjusted for tactical display • Use zoom controls to navigate</div>
      </div>

      <style>{`
        .stanton-map {
          background-color: #030303;
        }
        .stanton-map .leaflet-control-attribution {
          background: rgba(3, 3, 3, 0.8);
          color: #888;
          font-size: 9px;
        }
        .stanton-popup .leaflet-popup-content-wrapper {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 0;
        }
        .stanton-popup .leaflet-popup-tip {
          background: #18181b;
        }
      `}</style>
    </div>
  );
}