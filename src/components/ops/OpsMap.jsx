import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Radio, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  const [markerType, setMarkerType] = useState('rally');
  const [markerLabel, setMarkerLabel] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [drawMode, setDrawMode] = useState(null);
  const [drawnShapes, setDrawnShapes] = useState([]);
  const [drawnPaths, setDrawnPaths] = useState([]);
  const [showIconPalette, setShowIconPalette] = useState(false);
  const [showCommandForm, setShowCommandForm] = useState(false);
  const [commandMsg, setCommandMsg] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch all map layers with real-time subscriptions
  const { data: markers = [], refetch: refetchMarkers } = useQuery({
    queryKey: ['map-markers', eventId],
    queryFn: () => base44.entities.MapMarker.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 3000
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['fleet-assets', eventId],
    queryFn: () => base44.entities.FleetAsset.list(),
    refetchInterval: 3000
  });

  const { data: playerStatuses = [] } = useQuery({
    queryKey: ['player-status', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 3000
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: () => base44.entities.Incident.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 3000
  });

  const { data: commands = [] } = useQuery({
    queryKey: ['tactical-commands', eventId],
    queryFn: () => base44.entities.TacticalCommand.filter({ event_id: eventId }, '-created_date', 10),
    enabled: !!eventId,
    refetchInterval: 3000
  });

  // Mutations for creating markers and commands
  const createMarkerMutation = useMutation({
    mutationFn: (data) => base44.entities.MapMarker.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-markers', eventId] });
      toast.success('Rally point placed');
    }
  });

  const createCommandMutation = useMutation({
    mutationFn: (data) => base44.entities.TacticalCommand.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-commands', eventId] });
      toast.success('Command broadcast');
    }
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!eventId) return;
    const unsubMarkers = base44.entities.MapMarker.subscribe(() => refetchMarkers());
    return () => unsubMarkers?.();
  }, [eventId, refetchMarkers]);

  // Handle map click to place marker
  const handleMapClick = (latlng) => {
    if (!readOnly) {
      setSelectedLocation(latlng);
      setShowNewMarkerForm(true);
    }
  };

  // Drop rally point (creates MapMarker + EventLog + EventNotification)
  const handleDropRallyPoint = async () => {
    if (!selectedLocation || !markerLabel.trim()) return;
    
    try {
      createMarkerMutation.mutate({
        event_id: eventId,
        type: markerType,
        label: markerLabel,
        coordinates: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        },
        color: '#ea580c'
      });

      // Log to EventLog
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'SYSTEM',
        severity: 'LOW',
        actor_user_id: currentUser?.id,
        summary: `Rally point: ${markerLabel}`,
        details: {
          marker_type: markerType,
          coordinates: { lat: selectedLocation.lat, lng: selectedLocation.lng }
        }
      });

      setMarkerLabel('');
      setSelectedLocation(null);
      setShowNewMarkerForm(false);
    } catch (err) {
      console.error('Failed to drop rally point:', err);
      toast.error('Failed to place marker');
    }
  };

  // Broadcast tactical command
  const handleBroadcastCommand = async () => {
    if (!selectedLocation || !commandMsg.trim()) return;

    try {
      createCommandMutation.mutate({
        event_id: eventId,
        message: commandMsg,
        issued_by: currentUser?.id,
        coordinates: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng
        },
        command_type: 'OTHER',
        priority: 'NORMAL'
      });

      // Log to EventLog
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'SYSTEM',
        severity: 'MEDIUM',
        actor_user_id: currentUser?.id,
        summary: `Command: ${commandMsg.slice(0, 50)}...`,
        details: {
          coordinates: { lat: selectedLocation.lat, lng: selectedLocation.lng }
        }
      });

      setCommandMsg('');
      setSelectedLocation(null);
      setShowCommandForm(false);
    } catch (err) {
      console.error('Failed to broadcast command:', err);
      toast.error('Failed to broadcast command');
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
           <span className="text-xs font-bold text-zinc-500 uppercase">Tactical Command</span>
           {!readOnly && (
             <>
               <Button
                 size="sm"
                 onClick={() => {
                   setShowNewMarkerForm(!showNewMarkerForm);
                   setShowCommandForm(false);
                   setSelectedLocation(null);
                 }}
                 className="h-7 text-[10px] gap-1"
                 variant={showNewMarkerForm ? 'default' : 'outline'}
               >
                 <Plus className="w-3 h-3" /> Rally Point
               </Button>
               <Button
                 size="sm"
                 onClick={() => {
                   setShowCommandForm(!showCommandForm);
                   setShowNewMarkerForm(false);
                   setSelectedLocation(null);
                 }}
                 className="h-7 text-[10px] gap-1"
                 variant={showCommandForm ? 'default' : 'outline'}
               >
                 <Radio className="w-3 h-3" /> Command
               </Button>
               {selectedLocation && (
                 <span className="text-[10px] text-amber-500 font-mono">
                   {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                 </span>
               )}
             </>
           )}
         </div>
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

          {/* Personnel Layer - Status-based markers */}
          {playerStatuses.map((ps) => {
            if (!ps.coordinates) return null;
            const statusColors = {
              READY: '#10b981',
              ENGAGED: '#f59e0b',
              DOWN: '#dc2626',
              DISTRESS: '#dc2626',
              OFFLINE: '#6b7280'
            };
            const color = statusColors[ps.status] || '#9ca3af';
            const isUrgent = ps.status === 'DOWN' || ps.status === 'DISTRESS';

            return (
              <Marker
                key={`player-${ps.id}`}
                position={[ps.coordinates.lat, ps.coordinates.lng]}
                icon={createMarkerIcon(ps.status === 'DISTRESS' ? 'distress' : 'waypoint', color)}
              >
                <Popup className="dark-popup">
                  <div className={`text-xs font-bold text-white p-2 ${isUrgent ? 'bg-red-950' : 'bg-zinc-900'}`}>
                    <div>{ps.status}</div>
                    <div className="text-[10px] text-zinc-400">{ps.role}</div>
                    {ps.notes && <div className="text-[9px] text-zinc-300 mt-1">{ps.notes}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Incidents Layer - Severity-based rings */}
          {incidents
            .filter(inc => inc.status === 'active' && inc.coordinates)
            .map((inc) => {
              const severityRadius = {
                CRITICAL: 800,
                HIGH: 600,
                MEDIUM: 400,
                LOW: 200
              };
              const severityColors = {
                CRITICAL: '#dc2626',
                HIGH: '#f59e0b',
                MEDIUM: '#3b82f6',
                LOW: '#10b981'
              };
              return (
                <React.Fragment key={`incident-${inc.id}`}>
                  <Circle
                    center={[inc.coordinates.lat, inc.coordinates.lng]}
                    radius={severityRadius[inc.severity] || 400}
                    color={severityColors[inc.severity]}
                    fillOpacity={0.1}
                    weight={2}
                  />
                  <Marker
                    position={[inc.coordinates.lat, inc.coordinates.lng]}
                    icon={createMarkerIcon('hazard', severityColors[inc.severity])}
                  >
                    <Popup className="dark-popup">
                      <div className="text-xs text-white bg-zinc-900 p-3 min-w-[200px]">
                        <div className="font-bold">{inc.title}</div>
                        <div className={`text-[9px] font-bold ${severityColors[inc.severity] === '#dc2626' ? 'text-red-400' : 'text-zinc-400'}`}>
                          {inc.severity}
                        </div>
                        {inc.description && <div className="text-[9px] text-zinc-300 mt-1">{inc.description}</div>}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

          {/* Objectives/Markers Layer */}
          {markers?.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.coordinates.lat, marker.coordinates.lng]}
              icon={createMarkerIcon(marker.type, marker.color)}
            >
              <Popup className="dark-popup">
                <div className="text-xs text-white bg-zinc-900 p-3 space-y-2 min-w-[220px]">
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

          {/* Command Pings Layer - Time-stamped orders */}
          {commands?.map((cmd) => {
            if (!cmd.coordinates) return null;
            const age = Date.now() - new Date(cmd.created_date).getTime();
            const isFresh = age < 30000; // Fresh if < 30 seconds old

            return (
              <Marker
                key={`cmd-${cmd.id}`}
                position={[cmd.coordinates.lat, cmd.coordinates.lng]}
                icon={createMarkerIcon(cmd.command_type || 'waypoint', isFresh ? '#ea580c' : '#6b7280')}
              >
                <Popup className="dark-popup">
                  <div className="text-xs text-white bg-zinc-900 p-3 space-y-1 min-w-[240px]">
                    <div className="font-bold text-[#ea580c] flex items-center gap-1">
                      <Radio className="w-3 h-3" /> ORDER
                    </div>
                    <div className="text-[9px] text-zinc-400">{cmd.message}</div>
                    <div className="text-[8px] text-zinc-500 mt-1">
                      by {cmd.issued_by?.slice(0, 8)}
                    </div>
                    {isFresh && <div className="text-[8px] text-[#ea580c] font-bold">FRESH</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

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

      {/* Rally Point Form */}
      {showNewMarkerForm && !readOnly && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <div className="text-[9px] font-bold text-zinc-400 uppercase mb-2">DROP RALLY POINT</div>
          <div className="grid grid-cols-1 gap-2">
            <select
              value={markerType}
              onChange={(e) => setMarkerType(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2"
            >
              <option value="rally">Rally Point</option>
              <option value="waypoint">Waypoint</option>
              <option value="objective">Objective</option>
              <option value="hazard">Hazard</option>
              <option value="extraction">Extraction</option>
              <option value="insertion">Insertion</option>
            </select>
            <input
              type="text"
              placeholder="Rally label..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2 placeholder-zinc-600"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={handleDropRallyPoint}
                disabled={!selectedLocation || !markerLabel.trim() || createMarkerMutation.isPending}
                className="h-7 text-[10px] bg-[#ea580c] hover:bg-[#c2410c]"
              >
                {createMarkerMutation.isPending ? '...' : 'CONFIRM'}
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
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Command Form */}
      {showCommandForm && !readOnly && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <div className="text-[9px] font-bold text-zinc-400 uppercase mb-2">BROADCAST COMMAND</div>
          <div className="grid grid-cols-1 gap-2">
            <textarea
              placeholder="Command message..."
              value={commandMsg}
              onChange={(e) => setCommandMsg(e.target.value)}
              maxLength="200"
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs p-2 placeholder-zinc-600 h-12 resize-none"
            />
            <div className="text-[8px] text-zinc-500">{commandMsg.length}/200</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={handleBroadcastCommand}
                disabled={!selectedLocation || !commandMsg.trim() || createCommandMutation.isPending}
                className="h-7 text-[10px] bg-red-600 hover:bg-red-700"
              >
                {createCommandMutation.isPending ? '...' : 'BROADCAST'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCommandForm(false);
                  setSelectedLocation(null);
                }}
                className="h-7 text-[10px]"
              >
                CANCEL
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