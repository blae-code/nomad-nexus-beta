import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Custom SVG markers
const createMarkerIcon = (type, color = '#ea580c') => {
  const iconMap = {
    objective: '🎯',
    hazard: '⚠️',
    rally: '🚩',
    waypoint: '📍',
    checkpoint: '✓',
    extraction: '🚁',
    insertion: '⬇️',
    note: '📌',
    asset: '🛸',
    distress: '🆘'
  };

  const svg = `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24c0-8.8-7.2-16-16-16z" fill="${color}" stroke="#000" stroke-width="1"/>
    <text x="16" y="18" font-size="20" text-anchor="middle" dominant-baseline="central">${iconMap[type] || '📍'}</text>
  </svg>`;

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  });
};

// Click handler component
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng)
  });
  return null;
}

export default function OpsMap({ eventId, readOnly = false }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showNewMarkerForm, setShowNewMarkerForm] = useState(false);
  const [markerType, setMarkerType] = useState('waypoint');
  const [markerLabel, setMarkerLabel] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch map markers
  const { data: markers, refetch: refetchMarkers } = useQuery({
    queryKey: ['map-markers', eventId],
    queryFn: () => base44.entities.MapMarker.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Fetch fleet assets
  const { data: assets = [] } = useQuery({
    queryKey: ['fleet-assets'],
    queryFn: () => base44.entities.FleetAsset.list(),
    refetchInterval: 5000
  });

  // Fetch player status (distress)
  const { data: playerStatuses = [] } = useQuery({
    queryKey: ['player-status'],
    queryFn: () => base44.entities.PlayerStatus.list(),
    refetchInterval: 5000
  });

  // Handle map click to place marker
  const handleMapClick = (latlng) => {
    if (!readOnly) {
      setSelectedLocation(latlng);
      setShowNewMarkerForm(true);
    }
  };

  // Create new marker
  const handleAddMarker = async () => {
    if (selectedLocation && markerLabel.trim()) {
      await base44.entities.MapMarker.create({
        event_id: eventId,
        type: markerType,
        label: markerLabel,
        coordinates: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        }
      });
      setMarkerLabel('');
      setSelectedLocation(null);
      setShowNewMarkerForm(false);
      refetchMarkers();
    }
  };

  // Delete marker
  const handleDeleteMarker = async (markerId) => {
    await base44.entities.MapMarker.delete(markerId);
    refetchMarkers();
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded">
      {/* Map Toolbar */}
      <div className="flex gap-2 p-3 border-b border-zinc-800 bg-zinc-950 flex-wrap items-center">
        <span className="text-xs font-bold text-zinc-500 uppercase">Tactical Display</span>
        {!readOnly && (
          <>
            <Button
              size="sm"
              onClick={() => {
                setShowNewMarkerForm(!showNewMarkerForm);
                setSelectedLocation(null);
              }}
              className="h-7 text-[10px] gap-1"
              variant={showNewMarkerForm ? 'default' : 'outline'}
            >
              <Plus className="w-3 h-3" /> Add Pin
            </Button>
            {selectedLocation && (
              <span className="text-[10px] text-amber-500 font-mono">
                Click map to place pin at {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[35.6762, 139.6503]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          className="dark-leaflet-map"
        >
          {/* Dark Grid Base Layer */}
          <TileLayer
            url="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDIwIDAgTCAwIDAgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjcyNzJhIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMwOTA5MGIiIHN0cm9rZT0iIzE4MTgxYiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4="
            attribution="&copy; Nomad Ops"
            bounds={[[-85, -180], [85, 180]]}
          />

          {/* Fleet Assets */}
          {assets.map((asset) => {
            if (!asset.current_location) return null;
            return (
              <Marker
                key={`asset-${asset.id}`}
                position={[asset.current_location.lat, asset.current_location.lng]}
                icon={createMarkerIcon('asset', '#3b82f6')}
              >
                <Popup className="dark-popup">
                  <div className="text-xs font-bold text-white bg-zinc-900 p-2">
                    <div>{asset.name}</div>
                    <div className="text-[10px] text-zinc-400">{asset.model}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Distress Markers */}
          {playerStatuses
            .filter((ps) => ps.status === 'distress')
            .map((ps) => {
              if (!ps.coordinates) return null;
              return (
                <Marker
                  key={`distress-${ps.id}`}
                  position={[ps.coordinates.lat, ps.coordinates.lng]}
                  icon={createMarkerIcon('distress', '#dc2626')}
                >
                  <Popup className="dark-popup">
                    <div className="text-xs font-bold text-white bg-zinc-900 p-2">
                      <div>⚠️ DISTRESS</div>
                      <div className="text-[10px] text-zinc-400">{ps.user_id}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Operator-Placed Markers */}
          {markers?.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.coordinates.lat, marker.coordinates.lng]}
              icon={createMarkerIcon(marker.type, marker.color)}
            >
              <Popup className="dark-popup">
                <div className="text-xs text-white bg-zinc-900 p-3 space-y-2 min-w-[200px]">
                  <div className="font-bold text-[#ea580c]">{marker.label}</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{marker.type}</div>
                  {marker.description && (
                    <div className="text-[10px] text-zinc-300">{marker.description}</div>
                  )}
                  <div className="text-[9px] font-mono text-zinc-500">
                    {marker.coordinates.lat.toFixed(6)}, {marker.coordinates.lng.toFixed(6)}
                  </div>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMarker(marker.id)}
                      className="h-5 text-[8px] w-full"
                    >
                      <Trash2 className="w-2 h-2 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Click handler */}
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>

      {/* New Marker Form */}
      {showNewMarkerForm && !readOnly && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value)}
              className="col-span-2 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2"
            >
              <option value="waypoint">Waypoint</option>
              <option value="objective">Objective</option>
              <option value="hazard">Hazard</option>
              <option value="rally">Rally Point</option>
              <option value="checkpoint">Checkpoint</option>
              <option value="extraction">Extraction</option>
              <option value="insertion">Insertion</option>
              <option value="note">Note</option>
            </select>
            <input
              type="text"
              placeholder="Label..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              className="col-span-2 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2 placeholder-zinc-600"
            />
            <Button
              size="sm"
              onClick={handleAddMarker}
              disabled={!selectedLocation || !markerLabel.trim()}
              className="h-7 text-[10px] bg-[#ea580c] hover:bg-[#c2410c]"
            >
              Place
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewMarkerForm(false);
                setSelectedLocation(null);
              }}
              className="h-7 text-[10px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Leaflet Dark Style */}
      <style>{`
        .dark-leaflet-map {
          background-color: #09090b;
        }
        .dark-leaflet-map .leaflet-control-attribution {
          background: rgba(9, 9, 11, 0.8);
          color: #a1a1a1;
          font-size: 10px;
        }
        .dark-popup .leaflet-popup-content-wrapper {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 0;
        }
        .dark-popup .leaflet-popup-tip {
          background: #18181b;
        }
      `}</style>
    </div>
  );
}