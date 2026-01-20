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

const STAR_SYSTEMS = {
  stanton: {
    name: 'Stanton System',
    center: [0, 0],
    zoom: 2,
    description: 'UEE Core System',
    celestialBodies: [
      {
        id: 'stanton',
        name: 'Stanton (Primary Star)',
        position: [0, 0],
        type: 'star',
        radius: 696000,
        displayRadius: 800000,
        color: '#ffaa00',
        description: 'Class G2V Main Sequence Star'
      },
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
  },
  pyro: {
    name: 'Pyro System',
    center: [0, 0],
    zoom: 2,
    description: 'Lawless System - High Risk',
    celestialBodies: [
      {
        id: 'pyro-star',
        name: 'Pyro (Primary Star)',
        position: [0, 0],
        type: 'star',
        radius: 720000,
        displayRadius: 850000,
        color: '#ff3333',
        description: 'Class M1 Red Dwarf - Unstable'
      },
      {
        id: 'pyro-i',
        name: 'Pyro I',
        position: [0, 120000000],
        type: 'planet',
        radius: 4200000,
        displayRadius: 6000000,
        color: '#ff6600',
        description: 'Asteroid Belt / Debris Field'
      },
      {
        id: 'pyro-ii',
        name: 'Pyro II',
        position: [100000000, 80000000],
        type: 'planet',
        radius: 5800000,
        displayRadius: 7500000,
        color: '#ccaa00',
        description: 'Terrestrial Planet - Mining Operations',
        moons: [
          { name: 'Wala', position: [110000000, 85000000], type: 'moon', color: '#999966' }
        ]
      },
      {
        id: 'pyro-iii',
        name: 'Pyro III',
        position: [-90000000, 70000000],
        type: 'planet',
        radius: 6100000,
        displayRadius: 8000000,
        color: '#884444',
        description: 'Terrestrial Planet - Pirate Haven',
        moons: [
          { name: 'Hara', position: [-95000000, 75000000], type: 'moon', color: '#665555' },
          { name: 'Ita', position: [-85000000, 65000000], type: 'moon', color: '#775555' }
        ]
      }
    ]
  },
  nyx: {
    name: 'Nyx System',
    center: [0, 0],
    zoom: 2,
    description: 'Mysterious System - Limited Access',
    celestialBodies: [
      {
        id: 'nyx-star',
        name: 'Nyx (Primary Star)',
        position: [0, 0],
        type: 'star',
        radius: 650000,
        displayRadius: 780000,
        color: '#6600ff',
        description: 'Class B9 Blue-White Star'
      },
      {
        id: 'nyx-i',
        name: 'Nyx I',
        position: [0, 100000000],
        type: 'planet',
        radius: 4900000,
        displayRadius: 6500000,
        color: '#4444ff',
        description: 'Terrestrial Planet - Ice World',
        moons: [
          { name: 'Tyche', position: [0, 110000000], type: 'moon', color: '#ccccdd' }
        ]
      },
      {
        id: 'nyx-ii',
        name: 'Nyx II',
        position: [110000000, -60000000],
        type: 'planet',
        radius: 6200000,
        displayRadius: 8200000,
        color: '#aa00ff',
        description: 'Gas Giant - Unstable Atmosphere'
      },
      {
        id: 'nyx-iii',
        name: 'Nyx III',
        position: [-120000000, 40000000],
        type: 'planet',
        radius: 5500000,
        displayRadius: 7200000,
        color: '#00ff99',
        description: 'Terrestrial Planet - Exotic Minerals',
        moons: [
          { name: 'Ares', position: [-128000000, 45000000], type: 'moon', color: '#44dd88' }
        ]
      }
    ]
  }
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
  const [selectedSystem, setSelectedSystem] = useState('stanton');
  const [selectedBody, setSelectedBody] = useState(null);
  const currentSystem = STAR_SYSTEMS[selectedSystem];

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
      <div className="flex gap-2 p-3 border-b border-zinc-800 bg-zinc-950 items-center justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <Navigation className="w-4 h-4 text-[#ea580c]" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            {currentSystem.name}
          </span>
          <div className="flex gap-1 border-l border-zinc-700 pl-3">
            {Object.entries(STAR_SYSTEMS).map(([key, system]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedSystem(key);
                  setSelectedBody(null);
                }}
                className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${
                  selectedSystem === key
                    ? 'bg-[#ea580c] text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                }`}
              >
                {system.name.split(' ')[0]}
              </button>
            ))}
          </div>
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
          {currentSystem.celestialBodies.map((body) => (
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
        <div>{currentSystem.name} • {currentSystem.description} • Scale adjusted for tactical display • Use zoom controls to navigate</div>
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