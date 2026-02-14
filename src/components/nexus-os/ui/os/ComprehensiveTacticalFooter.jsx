import React, { useState, useMemo } from 'react';
import { MapContainer, Marker, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { NexusButton, NexusBadge } from '../primitives';
import {
  Map,
  Calendar,
  Users,
  Radio,
  Zap,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';

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
    html: `<div style="width: 12px; height: 12px; border-radius: 999px; background: ${color}; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 0 8px ${color}66;"></div>`,
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

function TacticalMapEvents({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.(event);
    },
  });
  return null;
}

function EventDashboard({ activeOp, voiceNet }) {
  if (!activeOp?.activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Calendar className="w-8 h-8 text-zinc-700 mb-3" />
        <p className="text-xs text-zinc-500 mb-4">No active operation</p>
        <NexusButton size="sm" intent="primary">
          <Plus className="w-3 h-3 mr-1" />
          New Op
        </NexusButton>
      </div>
    );
  }

  const event = activeOp.activeEvent;
  const participants = activeOp?.participants || [];

  return (
    <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
      {/* Op Title & Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wide truncate">
            {event.title}
          </h4>
          <NexusBadge tone="active" className="text-[10px]">
            {event.phase || 'ACTIVE'}
          </NexusBadge>
        </div>
        {event.description && (
          <p className="text-[10px] text-zinc-400 line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="h-px bg-zinc-800/40" />

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800/40">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Participants</div>
          <div className="text-sm font-bold text-zinc-200">{participants.length}</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800/40">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Duration</div>
          <div className="text-sm font-bold text-zinc-200">
            {event.start_time ? Math.round((Date.now() - new Date(event.start_time).getTime()) / 60000) : '0'}m
          </div>
        </div>
      </div>

      {/* Voice Net Status */}
      {voiceNet?.activeNetId && (
        <div className="px-2.5 py-1.5 rounded border border-green-500/30 bg-green-500/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-300 font-bold uppercase tracking-wider">{voiceNet.activeNetId}</span>
            </div>
            <span className="text-[10px] text-green-400 font-mono">({voiceNet.participants?.length || 0})</span>
          </div>
        </div>
      )}

      {/* Participants List (minimalist) */}
      {participants.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Team</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {participants.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[10px] px-1.5 py-1 rounded hover:bg-zinc-800/30">
                <span className="text-zinc-300 truncate">{p.callsign || p.name || 'Unknown'}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              </div>
            ))}
            {participants.length > 6 && (
              <div className="text-[10px] text-zinc-600 text-center py-1">+{participants.length - 6} more</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto pt-2 flex gap-1.5">
        <NexusButton size="sm" intent="subtle" className="flex-1 h-7 text-[10px]">
          <Users className="w-3 h-3" />
        </NexusButton>
        <NexusButton size="sm" intent="subtle" className="flex-1 h-7 text-[10px]">
          <Settings className="w-3 h-3" />
        </NexusButton>
      </div>
    </div>
  );
}

export default function ComprehensiveTacticalFooter() {
  const { user: authUser } = useAuth();
  const activeOp = useActiveOp();
  const voiceNet = useVoiceNet();

  const [collapsed, setCollapsed] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const eventId = activeOp?.activeEvent?.id || null;

  // Load map data
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const filter = eventId ? { event_id: eventId } : {};
        const [markerList, statusList] = await Promise.all([
          base44.entities.MapMarker?.filter(filter, '-created_date', 100).catch(() => []),
          base44.entities.PlayerStatus?.filter(filter, '-created_date', 50).catch(() => []),
        ]);
        setMarkers(markerList || []);
        setPlayerStatuses(statusList || []);
      } catch (error) {
        console.error('Tactical footer load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  if (collapsed) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-[700] border-t border-orange-500/20 bg-black/95 backdrop-blur-xl">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[10px] font-mono flex-1 min-w-0">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800 truncate">
              <Map className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-zinc-400 truncate">Tactical Map</span>
              <span className="text-orange-400 ml-auto shrink-0">{markers.length}M</span>
            </div>
            {activeOp?.activeEvent && (
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 truncate">
                <Calendar className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="text-orange-300 truncate">{activeOp.activeEvent.title}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors shrink-0"
            title="Expand tactical footer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[700] border-t border-orange-500/20 bg-black/98 backdrop-blur-xl shadow-2xl shadow-orange-500/5 flex flex-col h-80">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-orange-500/15 bg-zinc-900/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Map className="w-4 h-4 text-orange-500 shrink-0" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wide">Tactical Operations Center</h3>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
          title="Collapse tactical footer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Two-Column Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Tactical Map (50%) */}
        <div className="w-1/2 border-r border-orange-500/15 relative bg-zinc-950">
          <div className="absolute top-2 left-2 z-40 text-[10px] bg-zinc-900/80 border border-zinc-700 text-zinc-400 px-2 py-1 rounded">
            System Level
          </div>
          <MapContainer
            crs={L.CRS.Simple}
            center={[100, 100]}
            zoom={0}
            minZoom={-1}
            maxZoom={2}
            maxBounds={[[0, 0], [200, 200]]}
            style={{ height: '100%', width: '100%', background: 'transparent' }}
            className="tactical-map-compact"
          >
            <TacticalMapEvents onMapClick={() => {}} />

            {markers
              .filter((m) => m.type !== 'ping')
              .map((marker) => {
                const coord = getCoordinate(marker);
                if (!coord) return null;
                return (
                  <Marker key={marker.id} position={coord} icon={createMarkerIcon(marker.color)}>
                    <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                      <div className="text-[10px] font-semibold text-orange-200">{marker.label}</div>
                    </Tooltip>
                  </Marker>
                );
              })}

            {playerStatuses.map((status) => {
              const coord = getCoordinate(status);
              if (!coord) return null;
              const color = STATUS_COLORS[status.status] || '#38bdf8';
              return (
                <CircleMarker key={status.id} center={coord} radius={5} pathOptions={{ color, fillColor: color }}>
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div className="text-[10px] font-semibold text-white">{status.member_profile_id}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: Event Dashboard (50%) */}
        <div className="w-1/2 bg-zinc-900/20 border-l border-orange-500/15">
          <EventDashboard activeOp={activeOp} voiceNet={voiceNet} />
        </div>
      </div>
    </footer>
  );
}