import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Polygon, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useReadiness } from '@/components/hooks/useReadiness';
import { isAdminUser } from '@/utils';
import {
  Map,
  Maximize2,
  Minimize2,
  X,
  MapPin,
  Route,
  Square,
  Zap,
  LocateFixed,
  Navigation,
  Layers,
  Radio,
  Target,
  Users,
  History,
  Activity,
  Shield,
  Calendar,
  ChevronUp,
  RefreshCw,
  Settings2,
} from 'lucide-react';

const FOOTER_HEIGHT_KEY = 'nexus.tacticalFooter.height';
const FOOTER_COLLAPSED_KEY = 'nexus.tacticalFooter.collapsed';
const FOOTER_LAYERS_KEY = 'nexus.tacticalFooter.layers';
const FOOTER_MAPLEVEL_KEY = 'nexus.tacticalFooter.mapLevel';

const DEFAULT_HEIGHT = 380;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 700;

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
    html: `<div style="width: 14px; height: 14px; border-radius: 999px; background: ${color}; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 0 10px ${color}66;"></div>`,
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

export default function TacticalFooter() {
  const { user: authUser } = useAuth();
  const member = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const activeOp = useActiveOp();
  const voiceNet = useVoiceNet();
  const readinessData = useReadiness();

  const eventId = activeOp?.activeEvent?.id || null;

  const [height, setHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(FOOTER_HEIGHT_KEY);
      return saved ? Number(saved) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(FOOTER_COLLAPSED_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [mapLevel, setMapLevel] = useState(() => {
    try {
      const saved = localStorage.getItem(FOOTER_MAPLEVEL_KEY);
      return saved || 'system';
    } catch {
      return 'system';
    }
  });

  const [layerVisibility, setLayerVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem(FOOTER_LAYERS_KEY);
      return saved ? JSON.parse(saved) : {
        markers: true,
        routes: true,
        zones: true,
        pings: true,
        statuses: true,
        incidents: true,
        commands: true,
      };
    } catch {
      return {
        markers: true,
        routes: true,
        zones: true,
        pings: true,
        statuses: true,
        incidents: true,
        commands: true,
      };
    }
  });

  const [activeTool, setActiveTool] = useState('pan');
  const [markers, setMarkers] = useState([]);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);

  const [draftPoints, setDraftPoints] = useState([]);
  const [markerDraft, setMarkerDraft] = useState(null);
  const [reportDraft, setReportDraft] = useState(null);
  const [markerForm, setMarkerForm] = useState(DEFAULT_MARKER);
  const [reportForm, setReportForm] = useState(DEFAULT_REPORT);
  const [creating, setCreating] = useState(false);

  const [isResizing, setIsResizing] = useState(false);
  const mapRef = useRef(null);

  const markerIds = useMemo(() => markers.map((m) => m.issued_by_member_profile_id || m.created_by_member_profile_id).filter(Boolean), [markers]);
  const statusIds = useMemo(() => playerStatuses.map((s) => s.member_profile_id).filter(Boolean), [playerStatuses]);
  const commandIds = useMemo(() => commands.map((c) => c.issued_by_member_profile_id).filter(Boolean), [commands]);
  const { memberMap } = useMemberProfileMap(Array.from(new Set([...markerIds, ...statusIds, ...commandIds])));

  const mapConfig = useMemo(() => MAP_LEVELS.find((lvl) => lvl.id === mapLevel) || MAP_LEVELS[0], [mapLevel]);

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

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(FOOTER_HEIGHT_KEY, String(height));
    } catch {}
  }, [height]);

  useEffect(() => {
    try {
      localStorage.setItem(FOOTER_COLLAPSED_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(FOOTER_MAPLEVEL_KEY, mapLevel);
    } catch {}
  }, [mapLevel]);

  useEffect(() => {
    try {
      localStorage.setItem(FOOTER_LAYERS_KEY, JSON.stringify(layerVisibility));
    } catch {}
  }, [layerVisibility]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const markerFilter = eventId ? { event_id: eventId } : {};
      const statusFilter = eventId ? { event_id: eventId } : {};
      const incidentFilter = eventId ? { event_id: eventId } : {};
      const commandFilter = eventId ? { event_id: eventId } : {};

      const [markerList, statusList, incidentList, commandList] = await Promise.all([
        base44.entities.MapMarker.filter(markerFilter, '-created_date', 200).catch(() => []),
        base44.entities.PlayerStatus.filter(statusFilter, '-created_date', 100).catch(() => []),
        base44.entities.Incident.filter(incidentFilter, '-created_date', 50).catch(() => []),
        base44.entities.TacticalCommand.filter(commandFilter, '-created_date', 50).catch(() => []),
      ]);

      setMarkers(markerList || []);
      setPlayerStatuses(statusList || []);
      setIncidents(incidentList || []);
      setCommands(commandList || []);
    } catch (error) {
      console.error('Tactical footer load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(timer);
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

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [eventId]);

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
    } catch (error) {
      console.error('Marker create failed:', error);
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
    } catch (error) {
      console.error('Route/Zone create failed:', error);
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
    } catch (error) {
      console.error('Status report failed:', error);
    } finally {
      setCreating(false);
      setReportDraft(null);
      setReportForm(DEFAULT_REPORT);
    }
  };

  const removeMarker = async (markerId) => {
    if (!markerId) return;
    try {
      await base44.entities.MapMarker.delete(markerId);
    } catch (error) {
      console.error('Failed to delete marker:', error);
    }
  };

  const handleResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height]);

  const readiness = readinessData?.state || 'INITIALIZING';
  const readinessConfig = {
    READY: { color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' },
    DEGRADED: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
    OFFLINE: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
    INITIALIZING: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  };
  const config = readinessConfig[readiness] || readinessConfig.INITIALIZING;

  const routePreview = draftPoints.map((p) => [p.lat, p.lng]);
  const levelBounds = mapConfig.bounds;

  if (collapsed) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-[700] border-t-2 border-red-700/40 bg-black/95 backdrop-blur-xl shadow-lg shadow-black/50">
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: System Status */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${config.bg} ${config.border}`}>
                <Shield className={`w-3.5 h-3.5 ${config.color}`} />
                <span className={`font-bold uppercase tracking-[0.15em] ${config.color}`}>{readiness}</span>
                <div className={`w-1 h-1 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} />
              </div>

              {activeOp?.activeEvent ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded">
                  <Calendar className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-300 font-bold uppercase tracking-wider truncate max-w-[200px]">
                    {activeOp.activeEvent.title}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/40 border border-zinc-800/60 rounded">
                  <Calendar className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-600 uppercase tracking-wider">No Active Op</span>
                </div>
              )}

              {voiceNet?.activeNetId ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-500/10 border border-green-500/30 rounded">
                  <Radio className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 font-bold uppercase tracking-wider">{voiceNet.activeNetId}</span>
                  <span className="text-green-500 font-mono">({voiceNet.participants?.length || 0})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/40 border border-zinc-800/60 rounded">
                  <Radio className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-600 uppercase tracking-wider">No Voice Net</span>
                </div>
              )}
            </div>

            {/* Right: Tactical Map Status + Expand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <Map className="w-3.5 h-3.5 text-red-400" />
                <span className="uppercase tracking-wider">Tactical Map</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{mapLevel}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{markers.length}M</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{playerStatuses.length}S</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCollapsed(false)}
                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <>
      <footer
        className="fixed bottom-0 left-0 right-0 z-[700] border-t-2 border-red-700/50 bg-black/98 backdrop-blur-xl shadow-2xl shadow-red-500/10 flex flex-col"
        style={{ height: `${height}px` }}
      >
        {/* Resize Handle */}
        <div
          className={`h-1.5 bg-gradient-to-r from-transparent via-red-700/60 to-transparent cursor-ns-resize hover:via-red-500 transition-all ${
            isResizing ? 'via-red-500' : ''
          }`}
          onMouseDown={handleResize}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-0.5 bg-red-400/60 rounded-full" />
          </div>
        </div>

        {/* Header Bar */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-red-700/30 bg-zinc-900/60">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title + Context */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Tactical Map</h3>
              </div>
              <div className="h-4 w-px bg-zinc-700/40" />
              {activeOp?.activeEvent && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-[10px]">
                  <Calendar className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-300 font-bold uppercase tracking-wider">{activeOp.activeEvent.title}</span>
                </div>
              )}
            </div>

            {/* Center: Quick Stats */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-orange-400" />
                <span className="text-zinc-400">{markers.length}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-green-400" />
                <span className="text-zinc-400">{playerStatuses.length}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-red-400" />
                <span className="text-zinc-400">{incidents.length}</span>
              </span>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={loadData}
                className="h-7 px-2 text-[10px] text-zinc-500 hover:text-orange-400"
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCollapsed(true)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar: Tools + Layers */}
          <div className="w-56 border-r border-red-700/30 bg-zinc-900/40 p-3 space-y-3 overflow-y-auto">
            {/* Map Level Selector */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold">Map Level</div>
              <div className="flex gap-1">
                {MAP_LEVELS.map((level) => (
                  <Button
                    key={level.id}
                    size="sm"
                    variant={mapLevel === level.id ? 'default' : 'outline'}
                    onClick={() => setMapLevel(level.id)}
                    className="flex-1 h-7 text-[10px] border-red-700/40"
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold flex items-center gap-2">
                <Navigation className="w-3 h-3" />
                Tools
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {TOOL_DEFS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      size="sm"
                      variant={activeTool === tool.id ? 'default' : 'outline'}
                      onClick={() => setActiveTool(tool.id)}
                      className="h-8 text-[10px] justify-start gap-1.5 border-red-700/40"
                    >
                      <Icon className="w-3 h-3" />
                      {tool.label}
                    </Button>
                  );
                })}
              </div>
              {(activeTool === 'route' || activeTool === 'zone') && draftPoints.length > 0 && (
                <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2 space-y-1.5">
                  <div className="text-[10px] text-zinc-400">Draft: {draftPoints.length} points</div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => submitRoute(activeTool)} disabled={creating} className="flex-1 h-7 text-[10px]">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDraftPoints([])} className="flex-1 h-7 text-[10px]">
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Layer Toggles */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Layers
              </div>
              <div className="space-y-1.5">
                {Object.entries(layerVisibility).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer px-2 py-1 rounded hover:bg-zinc-800/40 transition-colors">
                    <span className="uppercase tracking-wider">{key}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="w-3.5 h-3.5"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Status Feed */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold flex items-center gap-2">
                <Users className="w-3 h-3" />
                Status ({filteredStatuses.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {filteredStatuses.slice(0, 8).map((status) => (
                  <div key={status.id} className="text-[10px] flex items-center justify-between px-2 py-1 bg-zinc-950/60 border border-zinc-800 rounded">
                    <span className="text-zinc-300 truncate">
                      {memberMap[status.member_profile_id]?.label || status.callsign || 'Unknown'}
                    </span>
                    <span className="text-orange-300 font-bold uppercase">{status.status}</span>
                  </div>
                ))}
                {filteredStatuses.length === 0 && (
                  <div className="text-[10px] text-zinc-600 text-center py-2">No status reports</div>
                )}
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 relative bg-zinc-950">
            <div className="absolute top-2 left-2 z-[400] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] bg-zinc-900/90 border border-zinc-700 text-zinc-300 rounded">
              {mapLevel} Grid
            </div>
            {loading && (
              <div className="absolute top-2 right-2 z-[400] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] bg-orange-950/80 border border-orange-700 text-orange-300 rounded flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.04)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.04)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
            <MapContainer
              ref={mapRef}
              crs={L.CRS.Simple}
              center={[mapConfig.bounds[1][0] / 2, mapConfig.bounds[1][1] / 2]}
              zoom={mapConfig.zoom}
              minZoom={-1}
              maxZoom={3}
              maxBounds={levelBounds}
              style={{ height: '100%', width: '100%', background: 'transparent' }}
              className="tactical-map"
            >
              <TacticalMapEvents activeTool={activeTool} onMapClick={handleMapClick} />

              {layerVisibility.markers &&
                filteredMarkers.markers.map((marker) => {
                  const coord = getCoordinate(marker);
                  if (!coord) return null;
                  return (
                    <Marker key={marker.id} position={coord} icon={createMarkerIcon(marker.color)}>
                      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                        <div className="text-xs font-semibold text-orange-200">{marker.label || marker.type}</div>
                        {marker.description && <div className="text-[10px] text-zinc-400">{marker.description}</div>}
                        {(isAdmin || marker.created_by_member_profile_id === member?.id) && (
                          <button type="button" onClick={() => removeMarker(marker.id)} className="text-[10px] text-red-400 mt-1">
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
                  const label = memberMap[status.member_profile_id]?.label || status.callsign || 'Unknown';
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
                    <Marker key={incident.id} position={coord} icon={createMarkerIcon('#ef4444')}>
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
                    <Marker key={command.id} position={coord} icon={createMarkerIcon('#0ea5e9')}>
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
        </div>
      </footer>

      {/* Dialogs */}
      <Dialog open={!!markerDraft} onOpenChange={(open) => !open && setMarkerDraft(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-2 border-red-700/60">
          <DialogHeader>
            <DialogTitle className="text-white">Create Marker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={markerForm.label}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Marker label"
              className="border-red-700/40"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={markerForm.type}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full bg-zinc-900 border border-red-700/40 text-xs text-white px-3 py-2 rounded"
              >
                {MARKER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
              <Input
                value={markerForm.color}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, color: e.target.value }))}
                placeholder="#f97316"
                className="border-red-700/40"
              />
            </div>
            <Textarea
              value={markerForm.description}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px] border-red-700/40"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkerDraft(null)}>Cancel</Button>
            <Button onClick={() => createMarker(markerForm, markerDraft)} disabled={creating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportDraft} onOpenChange={(open) => !open && setReportDraft(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-2 border-red-700/60">
          <DialogHeader>
            <DialogTitle className="text-white">Report Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              value={reportForm.status}
              onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-red-700/40 text-xs text-white px-3 py-2 rounded"
            >
              {Object.keys(STATUS_COLORS).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Input
              value={reportForm.role}
              onChange={(e) => setReportForm((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="Role (Pilot, Medic, etc.)"
              className="border-red-700/40"
            />
            <Textarea
              value={reportForm.notes}
              onChange={(e) => setReportForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px] border-red-700/40"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDraft(null)}>Cancel</Button>
            <Button onClick={submitReport} disabled={creating || !member?.id}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}