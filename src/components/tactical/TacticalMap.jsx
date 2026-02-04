import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Polygon, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useNotification } from '@/components/providers/NotificationContext';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminUser } from '@/utils';
import {
  Crosshair,
  Layers,
  LocateFixed,
  MapPin,
  Route,
  Square,
  Zap,
  Navigation,
  Users,
  RefreshCw,
} from 'lucide-react';

const MAP_LEVELS = [
  { id: 'system', label: 'System', bounds: [[0, 0], [400, 400]], zoom: -0.5 },
  { id: 'planet', label: 'Planet', bounds: [[0, 0], [200, 200]], zoom: 0 },
  { id: 'local', label: 'Local', bounds: [[0, 0], [100, 100]], zoom: 0.5 },
];

const TOOL_DEFS = [
  { id: 'pan', label: 'Navigate', icon: Navigation },
  { id: 'marker', label: 'Marker', icon: MapPin },
  { id: 'route', label: 'Route', icon: Route },
  { id: 'zone', label: 'Zone', icon: Square },
  { id: 'ping', label: 'Ping', icon: Zap },
  { id: 'report', label: 'Report', icon: LocateFixed },
];

const DEFAULT_MARKER = {
  label: '',
  type: 'rally',
  color: '#f97316',
  description: '',
};

const DEFAULT_REPORT = {
  status: 'READY',
  role: 'PILOT',
  notes: '',
};

const MARKER_TYPES = [
  { id: 'rally', label: 'Rally' },
  { id: 'objective', label: 'Objective' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'extraction', label: 'Extraction' },
  { id: 'support', label: 'Support' },
  { id: 'route', label: 'Route' },
  { id: 'zone', label: 'Zone' },
  { id: 'ping', label: 'Ping' },
];

const STATUS_COLORS = {
  READY: '#22c55e',
  ENGAGED: '#f97316',
  DISTRESS: '#ef4444',
  DOWN: '#a1a1aa',
  OFFLINE: '#52525b',
};

const createMarkerIcon = (color = '#f97316') =>
  L.divIcon({
    className: 'tactical-marker-icon',
    html: `
      <div style="width: 14px; height: 14px; border-radius: 999px; background: ${color}; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 0 10px ${color}66;"></div>
    `,
  });

const getCoordinate = (record) => {
  const coord = record?.coordinates || record?.position || record?.location;
  if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
    return [coord.lat, coord.lng];
  }
  if (typeof record?.lat === 'number' && typeof record?.lng === 'number') {
    return [record.lat, record.lng];
  }
  return null;
};

const getMapLevel = (record) => {
  return (record?.map_level || record?.mapLevel || record?.layer_level || 'system').toString().toLowerCase();
};

function TacticalMapEvents({ activeTool, onMapClick }) {
  useMapEvents({
    click(event) {
      if (!activeTool || activeTool === 'pan') return;
      onMapClick?.(event);
    },
  });
  return null;
}

export default function TacticalMap({ eventId = null, activeEvent = null, compact = false }) {
  const { user: authUser } = useAuth();
  const member = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const { addNotification } = useNotification();

  const [mapLevel, setMapLevel] = useState('system');
  const [activeTool, setActiveTool] = useState('pan');
  const [markers, setMarkers] = useState([]);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [draftPoints, setDraftPoints] = useState([]);
  const [markerDraft, setMarkerDraft] = useState(null);
  const [reportDraft, setReportDraft] = useState(null);
  const [markerForm, setMarkerForm] = useState(DEFAULT_MARKER);
  const [reportForm, setReportForm] = useState(DEFAULT_REPORT);

  const [layerVisibility, setLayerVisibility] = useState({
    markers: true,
    routes: true,
    zones: true,
    pings: true,
    statuses: true,
    incidents: true,
    commands: true,
  });

  const [creating, setCreating] = useState(false);
  const mapRef = useRef(null);

  const markerIds = useMemo(() => markers.map((m) => m.issued_by_member_profile_id || m.created_by_member_profile_id).filter(Boolean), [markers]);
  const statusIds = useMemo(() => playerStatuses.map((s) => s.member_profile_id).filter(Boolean), [playerStatuses]);
  const commandIds = useMemo(() => commands.map((c) => c.issued_by_member_profile_id).filter(Boolean), [commands]);
  const { memberMap } = useMemberProfileMap(Array.from(new Set([...markerIds, ...statusIds, ...commandIds])));

  const mapConfig = useMemo(() => MAP_LEVELS.find((lvl) => lvl.id === mapLevel) || MAP_LEVELS[0], [mapLevel]);

  const notify = useCallback((title, message, type = 'info') => {
    addNotification?.({ title, message, type, duration: 5000 });
  }, [addNotification]);

  const splitMarkers = useMemo(() => {
    const activeMarkers = markers.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now());
    return {
      markers: activeMarkers.filter((m) => !['route', 'zone', 'ping'].includes(m.type)),
      routes: activeMarkers.filter((m) => m.type === 'route'),
      zones: activeMarkers.filter((m) => m.type === 'zone'),
      pings: activeMarkers.filter((m) => m.type === 'ping'),
    };
  }, [markers]);

  const filteredMarkers = useMemo(() => {
    return {
      markers: splitMarkers.markers.filter((m) => getMapLevel(m) === mapLevel),
      routes: splitMarkers.routes.filter((m) => getMapLevel(m) === mapLevel),
      zones: splitMarkers.zones.filter((m) => getMapLevel(m) === mapLevel),
      pings: splitMarkers.pings.filter((m) => getMapLevel(m) === mapLevel),
    };
  }, [splitMarkers, mapLevel]);

  const filteredStatuses = useMemo(() => {
    return playerStatuses.filter((s) => {
      const level = getMapLevel(s);
      return level === mapLevel || !level;
    });
  }, [playerStatuses, mapLevel]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => getMapLevel(i) === mapLevel || !getMapLevel(i));
  }, [incidents, mapLevel]);

  const filteredCommands = useMemo(() => {
    return commands.filter((c) => getMapLevel(c) === mapLevel || !getMapLevel(c));
  }, [commands, mapLevel]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const markerFilter = eventId ? { event_id: eventId } : {};
      const statusFilter = eventId ? { event_id: eventId } : {};
      const incidentFilter = eventId ? { event_id: eventId } : {};
      const commandFilter = eventId ? { event_id: eventId } : {};

      const [markerList, statusList, incidentList, commandList] = await Promise.all([
        base44.entities.MapMarker.filter(markerFilter, '-created_date', 500).catch(() => []),
        base44.entities.PlayerStatus.filter(statusFilter, '-created_date', 200).catch(() => []),
        base44.entities.Incident.filter(incidentFilter, '-created_date', 100).catch(() => []),
        base44.entities.TacticalCommand.filter(commandFilter, '-created_date', 100).catch(() => []),
      ]);

      setMarkers(markerList || []);
      setPlayerStatuses(statusList || []);
      setIncidents(incidentList || []);
      setCommands(commandList || []);
    } catch (error) {
      console.error('Tactical map load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribes = [];
    const matchesEvent = (data) => {
      if (!eventId) return true;
      const payloadEventId = data?.event_id || data?.eventId;
      return payloadEventId === eventId;
    };

    const addSubscription = (entity, handler) => {
      if (!entity?.subscribe) return;
      const unsubscribe = entity.subscribe(handler);
      if (typeof unsubscribe === 'function') {
        unsubscribes.push(unsubscribe);
      }
    };

    addSubscription(base44.entities.MapMarker, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setMarkers((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.PlayerStatus, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setPlayerStatuses((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.Incident, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setIncidents((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.TacticalCommand, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setCommands((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, []);

  const handleMapClick = useCallback((event) => {
    const coords = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (activeTool === 'marker') {
      setMarkerDraft(coords);
      setMarkerForm(DEFAULT_MARKER);
      return;
    }
    if (activeTool === 'route' || activeTool === 'zone') {
      setDraftPoints((prev) => [...prev, coords]);
      return;
    }
    if (activeTool === 'ping') {
      createMarker({
        ...DEFAULT_MARKER,
        type: 'ping',
        label: 'Ping',
      }, coords, { expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() });
      return;
    }
    if (activeTool === 'report') {
      setReportDraft(coords);
      setReportForm(DEFAULT_REPORT);
    }
  }, [activeTool]);

  const createMarker = async (form, coords, extra = {}) => {
    if (!coords) return;
    setCreating(true);
    try {
      await base44.entities.MapMarker.create({
        event_id: eventId || null,
        type: form.type,
        label: form.label || 'Marker',
        color: form.color || '#f97316',
        description: form.description || '',
        coordinates: coords,
        map_level: mapLevel,
        issued_by_member_profile_id: member?.id || null,
        created_by_member_profile_id: member?.id || null,
        metadata: extra.metadata || undefined,
        expires_at: extra.expires_at || undefined,
      });
      notify('Tactical Map', 'Marker created.', 'success');
    } catch (error) {
      console.error('Marker create failed:', error);
      notify('Tactical Map', 'Failed to create marker.', 'error');
    } finally {
      setCreating(false);
      setMarkerDraft(null);
      setMarkerForm(DEFAULT_MARKER);
    }
  };

  const submitRoute = async (type) => {
    if (draftPoints.length < (type === 'route' ? 2 : 3)) return;
    setCreating(true);
    try {
      await base44.entities.MapMarker.create({
        event_id: eventId || null,
        type,
        label: type === 'route' ? 'Route Plan' : 'Zone',
        color: '#38bdf8',
        description: type === 'route' ? 'Planned route' : 'Operational zone',
        coordinates: draftPoints[0],
        map_level: mapLevel,
        issued_by_member_profile_id: member?.id || null,
        created_by_member_profile_id: member?.id || null,
        metadata: { points: draftPoints },
      });
      notify('Tactical Map', `${type === 'route' ? 'Route' : 'Zone'} saved.`, 'success');
    } catch (error) {
      console.error('Route/Zone create failed:', error);
      notify('Tactical Map', 'Failed to save route/zone.', 'error');
    } finally {
      setCreating(false);
      setDraftPoints([]);
    }
  };

  const submitReport = async () => {
    if (!reportDraft || !member?.id) return;
    setCreating(true);
    try {
      const existing = await base44.entities.PlayerStatus.filter({
        member_profile_id: member.id,
        ...(eventId ? { event_id: eventId } : {}),
      });

      const payload = {
        member_profile_id: member.id,
        event_id: eventId || null,
        status: reportForm.status,
        role: reportForm.role,
        coordinates: reportDraft,
        notes: reportForm.notes,
        map_level: mapLevel,
      };

      if (existing?.[0]) {
        await base44.entities.PlayerStatus.update(existing[0].id, payload);
      } else {
        await base44.entities.PlayerStatus.create(payload);
      }

      notify('Status Reported', 'Your position has been updated.', 'success');
    } catch (error) {
      console.error('Status report failed:', error);
      notify('Status Report', 'Unable to update status.', 'error');
    } finally {
      setCreating(false);
      setReportDraft(null);
      setReportForm(DEFAULT_REPORT);
    }
  };

  const handleSeedDemo = async () => {
    if (!eventId) {
      notify('Seed Map', 'Activate an operation to seed tactical data.', 'warning');
      return;
    }
    try {
      await invokeMemberFunction('seedTacticalMap', { eventId });
      notify('Seed Map', 'Scenario seeded.', 'success');
    } catch (error) {
      console.error('Seed map failed:', error);
      notify('Seed Map', 'Failed to seed scenario.', 'error');
    }
  };

  const removeMarker = async (markerId) => {
    if (!markerId) return;
    try {
      await base44.entities.MapMarker.delete(markerId);
    } catch (error) {
      console.error('Failed to delete marker:', error);
      notify('Tactical Map', 'Failed to remove marker.', 'error');
    }
  };

  const routePreview = draftPoints.map((p) => [p.lat, p.lng]);
  const levelBounds = mapConfig.bounds;

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-4'}`}>
      {!compact && (
      <div className="col-span-1 space-y-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Map Level</div>
            {activeEvent && (
              <div className="text-[10px] text-orange-400 uppercase">{activeEvent.title}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MAP_LEVELS.map((level) => (
              <Button
                key={level.id}
                size="sm"
                variant={mapLevel === level.id ? 'default' : 'outline'}
                onClick={() => setMapLevel(level.id)}
                className="text-xs"
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Crosshair className="w-3 h-3" />
            Tools
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TOOL_DEFS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={activeTool === tool.id ? 'default' : 'outline'}
                  onClick={() => setActiveTool(tool.id)}
                  className="text-xs justify-start gap-2"
                >
                  <Icon className="w-3 h-3" />
                  {tool.label}
                </Button>
              );
            })}
          </div>
          {(activeTool === 'route' || activeTool === 'zone') && draftPoints.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400">Draft points: {draftPoints.length}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submitRoute(activeTool)} disabled={creating}>
                  Save {activeTool === 'route' ? 'Route' : 'Zone'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDraftPoints([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleSeedDemo} className="w-full text-xs">
              <Zap className="w-3 h-3 mr-2" />
              Seed Demo Scenario
            </Button>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Layers className="w-3 h-3" />
            Layers
          </div>
          {Object.entries(layerVisibility).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase">{key}</span>
              <input
                type="checkbox"
                checked={value}
                onChange={() => setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
            </label>
          ))}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Users className="w-3 h-3" />
            Status Feed
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredStatuses.slice(0, 6).map((status) => (
              <div key={status.id} className="text-xs text-zinc-400 flex items-center justify-between">
                <span className="truncate">
                  {memberMap[status.member_profile_id]?.label || status.callsign || status.member_profile_id}
                </span>
                <span className="text-[10px] text-orange-300">{status.status}</span>
              </div>
            ))}
            {filteredStatuses.length === 0 && (
              <div className="text-xs text-zinc-500">No status reports yet.</div>
            )}
          </div>
        </div>
      </div>
      )}

      <div className={`${compact ? 'col-span-1' : 'col-span-3'} bg-zinc-900/40 border border-zinc-800 rounded overflow-hidden relative`}>
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 text-zinc-300">
            {mapLevel} grid
          </div>
          {loading && (
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 text-orange-300 flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Sync
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40" />
        <MapContainer
          ref={mapRef}
          crs={L.CRS.Simple}
          center={[mapConfig.bounds[1][0] / 2, mapConfig.bounds[1][1] / 2]}
          zoom={mapConfig.zoom}
          minZoom={-1}
          maxZoom={3}
          maxBounds={levelBounds}
          style={{ height: '620px', width: '100%', background: 'transparent' }}
          className="tactical-map"
        >
          <TacticalMapEvents activeTool={activeTool} onMapClick={handleMapClick} />

          {layerVisibility.markers &&
            filteredMarkers.markers.map((marker) => {
              const coord = getCoordinate(marker);
              if (!coord) return null;
              const label = marker.label || marker.type;
              return (
                <Marker
                  key={marker.id}
                  position={coord}
                  icon={createMarkerIcon(marker.color)}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-orange-200">{label}</div>
                    {marker.description && <div className="text-[10px] text-zinc-400">{marker.description}</div>}
                    {(isAdmin || marker.created_by_member_profile_id === member?.id) && (
                      <button
                        type="button"
                        onClick={() => removeMarker(marker.id)}
                        className="text-[10px] text-red-400 mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </Tooltip>
                </Marker>
              );
            })}

          {layerVisibility.routes &&
            filteredMarkers.routes.map((route) => {
              const points = route?.metadata?.points || [];
              if (!Array.isArray(points) || points.length < 2) return null;
              return (
                <Polyline
                  key={route.id}
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: route.color || '#38bdf8', weight: 2 }}
                />
              );
            })}

          {layerVisibility.zones &&
            filteredMarkers.zones.map((zone) => {
              const points = zone?.metadata?.points || [];
              if (!Array.isArray(points) || points.length < 3) return null;
              return (
                <Polygon
                  key={zone.id}
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: zone.color || '#a855f7', fillOpacity: 0.2 }}
                />
              );
            })}

          {layerVisibility.pings &&
            filteredMarkers.pings.map((ping) => {
              const coord = getCoordinate(ping);
              if (!coord) return null;
              return (
                <CircleMarker
                  key={ping.id}
                  center={coord}
                  radius={8}
                  pathOptions={{ color: ping.color || '#facc15', fillColor: ping.color || '#facc15' }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-orange-200">{ping.label || 'Ping'}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {layerVisibility.statuses &&
            filteredStatuses.map((status) => {
              const coord = getCoordinate(status);
              if (!coord) return null;
              const label = memberMap[status.member_profile_id]?.label || status.callsign || status.member_profile_id || 'Unknown';
              const color = STATUS_COLORS[status.status] || '#38bdf8';
              return (
                <CircleMarker
                  key={status.id}
                  center={coord}
                  radius={6}
                  pathOptions={{ color, fillColor: color }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <div className="text-[10px] text-zinc-300">{status.status}</div>
                    {status.notes && <div className="text-[10px] text-zinc-400">{status.notes}</div>}
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {layerVisibility.incidents &&
            filteredIncidents.map((incident) => {
              const coord = getCoordinate(incident);
              if (!coord) return null;
              return (
                <Marker
                  key={incident.id}
                  position={coord}
                  icon={createMarkerIcon('#ef4444')}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-red-300">{incident.title}</div>
                    <div className="text-[10px] text-zinc-400">{incident.description}</div>
                  </Tooltip>
                </Marker>
              );
            })}

          {layerVisibility.commands &&
            filteredCommands.map((command) => {
              const coord = getCoordinate(command);
              if (!coord) return null;
              return (
                <Marker
                  key={command.id}
                  position={coord}
                  icon={createMarkerIcon('#0ea5e9')}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-cyan-300">Command</div>
                    <div className="text-[10px] text-zinc-300">{command.message}</div>
                  </Tooltip>
                </Marker>
              );
            })}

          {(activeTool === 'route' || activeTool === 'zone') && draftPoints.length > 0 && (
            activeTool === 'route' ? (
              <Polyline positions={routePreview} pathOptions={{ color: '#38bdf8', dashArray: '4 6' }} />
            ) : (
              <Polygon positions={routePreview} pathOptions={{ color: '#a855f7', dashArray: '4 6', fillOpacity: 0.1 }} />
            )
          )}
        </MapContainer>
      </div>

      <Dialog open={!!markerDraft} onOpenChange={(open) => !open && setMarkerDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Marker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={markerForm.label}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Marker label"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={markerForm.type}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {MARKER_TYPES.filter((t) => !['route', 'zone'].includes(t.id)).map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
              <Input
                value={markerForm.color}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, color: e.target.value }))}
                placeholder="#f97316"
              />
            </div>
            <Textarea
              value={markerForm.description}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkerDraft(null)}>Cancel</Button>
            <Button onClick={() => createMarker(markerForm, markerDraft)} disabled={creating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportDraft} onOpenChange={(open) => !open && setReportDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              value={reportForm.status}
              onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              {Object.keys(STATUS_COLORS).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Input
              value={reportForm.role}
              onChange={(e) => setReportForm((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="Role (Pilot, Medic, etc.)"
            />
            <Textarea
              value={reportForm.notes}
              onChange={(e) => setReportForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
            {reportDraft && (
              <div className="text-[11px] text-zinc-500">
                Coordinates: {reportDraft.lat.toFixed(2)}, {reportDraft.lng.toFixed(2)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDraft(null)}>Cancel</Button>
            <Button onClick={submitReport} disabled={creating || !member?.id}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
