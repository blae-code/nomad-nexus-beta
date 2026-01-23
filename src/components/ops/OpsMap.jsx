import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MapDrawingTools from './MapDrawingTools';
import MapDrawingLayer from './MapDrawingLayer';
import { createTacticalMarkerIcon, TACTICAL_ICON_CATEGORIES } from '@/components/utils/tacticalsIcons';

// Legacy marker fallback
const createMarkerIcon = (type, color = '#ea580c') => {
  const tacticalIcon = createTacticalMarkerIcon(type);
  if (tacticalIcon) return tacticalIcon;

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
  const [markerType, setMarkerType] = useState('objective_primary');
  const [markerLabel, setMarkerLabel] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [drawMode, setDrawMode] = useState(null);
  const [drawnShapes, setDrawnShapes] = useState([]);
  const [drawnPaths, setDrawnPaths] = useState([]);
  const [showIconPalette, setShowIconPalette] = useState(false);

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

  // Create new marker with persistence + broadcast
  const handleAddMarker = async () => {
    if (selectedLocation && markerLabel.trim()) {
      try {
        // Persist via backend function for atomic operation + logging
        const res = await base44.functions.invoke('persistEventMarkers', {
          event_id: eventId,
          marker_data: {
            type: markerType,
            label: markerLabel,
            coordinates: {
              lat: selectedLocation.lat,
              lng: selectedLocation.lng
            },
            color: '#ea580c'
          }
        });

        if (res.data.success) {
          // Broadcast command ping to event
          await base44.functions.invoke('sendTacticalCommand', {
            eventId,
            targetId: eventId,
            targetType: 'event',
            message: `Tactical marker placed: ${markerLabel} at ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
          });

          setMarkerLabel('');
          setSelectedLocation(null);
          setShowNewMarkerForm(false);
          // Refetch immediately for UI consistency
          refetchMarkers();
        }
      } catch (err) {
        console.error('Failed to place marker:', err);
      }
    }
  };

  // Delete marker
  const handleDeleteMarker = async (markerId) => {
    await base44.entities.MapMarker.delete(markerId);
    refetchMarkers();
  };

  // Handle shape/path creation
  const handleShapeCreated = async (shape) => {
    if (shape.type === 'polygon') {
      setDrawnShapes(prev => [...prev, { ...shape, color: '#3b82f6' }]);
      setDrawMode(null);
    } else if (shape.type === 'circle') {
      // For circles, we need radius - would be calculated from drag distance
      setDrawnShapes(prev => [...prev, { ...shape, color: '#10b981' }]);
      setDrawMode(null);
    } else if (shape.type === 'path') {
      const pathData = { ...shape, color: '#f59e0b' };
      setDrawnPaths(prev => [...prev, pathData]);
      setDrawMode(null);

      // Persist path as event log
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'SYSTEM',
        severity: 'LOW',
        summary: 'Movement path drawn on tactical map',
        details: {
          waypoints: shape.points.length,
          path_id: `path-${Date.now()}`
        }
      });
    }
  };

  const handleClearDrawings = () => {
    setDrawnShapes([]);
    setDrawnPaths([]);
    setDrawMode(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 border border-zinc-800 rounded">
      {/* Map Toolbar */}
      <div className="flex gap-2 p-3 border-b border-zinc-800 bg-zinc-950 flex-wrap items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
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
        {!readOnly && (
          <MapDrawingTools
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            onClearDrawings={handleClearDrawings}
            canDraw={true}
          />
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

          {/* Drawing layer */}
          <MapDrawingLayer
            drawMode={drawMode}
            onShapeCreated={handleShapeCreated}
            shapes={drawnShapes}
            paths={drawnPaths}
          />

          {/* Click handler */}
          <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
      </div>

      {/* New Marker Form */}
      {showNewMarkerForm && !readOnly && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <div className="grid grid-cols-1 gap-2">
            <Button
              size="sm"
              variant={showIconPalette ? 'default' : 'outline'}
              onClick={() => setShowIconPalette(!showIconPalette)}
              className="h-7 text-[10px] w-full"
            >
              Select Tactical Icon {showIconPalette ? '▼' : '▶'}
            </Button>
            {showIconPalette && (
              <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-2 border border-zinc-800 max-h-48 overflow-y-auto">
                {Object.entries(TACTICAL_ICON_CATEGORIES).map(([category, icons]) => (
                  <div key={category} className="col-span-4">
                    <div className="text-[8px] font-bold text-zinc-500 uppercase px-1 py-1">
                      {category}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {icons.map((iconKey) => (
                        <button
                          key={iconKey}
                          onClick={() => {
                            setMarkerType(iconKey);
                            setShowIconPalette(false);
                          }}
                          className={`p-1 border rounded text-center text-[9px] transition-all ${
                            markerType === iconKey
                              ? 'border-[#ea580c] bg-[#ea580c]/10'
                              : 'border-zinc-700 hover:border-zinc-600'
                          }`}
                          title={iconKey}
                        >
                          {iconKey.split('_').pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value)}
              className="col-span-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2"
            >
              {Object.entries(TACTICAL_ICON_CATEGORIES).map(([category, icons]) => (
                <optgroup key={category} label={category}>
                  {icons.map((iconKey) => (
                    <option key={iconKey} value={iconKey}>
                      {iconKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="text"
              placeholder="Label..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              className="col-span-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2 placeholder-zinc-600"
            />
            <div className="grid grid-cols-2 gap-2">
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
                  setShowIconPalette(false);
                }}
                className="h-7 text-[10px]"
              >
                Cancel
              </Button>
            </div>
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