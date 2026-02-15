import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  ExternalLink,
  AlertTriangle,
  Target,
  Activity,
} from 'lucide-react';
import { analyzeTacticalSituation, subscribeToTacticalAI, updateTacticalAI } from '../../services/tacticalAIService';

const FOOTER_HEIGHT_KEY = 'nexus.tacticalFooter.height';
const DEFAULT_HEIGHT = 320;
const MIN_HEIGHT = 200;

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

// Star Citizen System Data
const STAR_SYSTEMS = {
  stanton: {
    name: 'Stanton',
    star: { x: 50, y: 50, size: 8, color: '#fbbf24' },
    bodies: [
      { name: 'Hurston', x: 65, y: 50, size: 5, color: '#92400e', type: 'planet' },
      { name: 'Crusader', x: 50, y: 35, size: 7, color: '#60a5fa', type: 'planet' },
      { name: 'microTech', x: 35, y: 50, size: 5, color: '#e0f2fe', type: 'planet' },
      { name: 'ArcCorp', x: 50, y: 65, size: 4, color: '#9ca3af', type: 'planet' },
    ],
    lagrange: [
      { name: 'HUR-L1', x: 58, y: 50, size: 2, parent: 'Hurston' },
      { name: 'HUR-L2', x: 72, y: 50, size: 2, parent: 'Hurston' },
      { name: 'CRU-L1', x: 50, y: 42, size: 2, parent: 'Crusader' },
      { name: 'MIC-L1', x: 42, y: 50, size: 2, parent: 'microTech' },
      { name: 'ARC-L1', x: 50, y: 58, size: 2, parent: 'ArcCorp' },
    ],
  },
  pyro: {
    name: 'Pyro',
    star: { x: 150, y: 50, size: 10, color: '#dc2626' },
    bodies: [
      { name: 'Pyro I', x: 162, y: 50, size: 3, color: '#7c2d12', type: 'planet' },
      { name: 'Pyro II', x: 150, y: 38, size: 4, color: '#991b1b', type: 'planet' },
      { name: 'Pyro III', x: 138, y: 50, size: 5, color: '#b91c1c', type: 'planet' },
      { name: 'Pyro IV', x: 150, y: 62, size: 4, color: '#7f1d1d', type: 'planet' },
      { name: 'Pyro V', x: 165, y: 60, size: 6, color: '#450a0a', type: 'planet' },
      { name: 'Pyro VI', x: 135, y: 40, size: 4, color: '#78350f', type: 'planet' },
    ],
    lagrange: [
      { name: 'PY1-L1', x: 156, y: 50, size: 2, parent: 'Pyro I' },
      { name: 'PY2-L1', x: 150, y: 44, size: 2, parent: 'Pyro II' },
      { name: 'PY3-L1', x: 144, y: 50, size: 2, parent: 'Pyro III' },
    ],
  },
  nyx: {
    name: 'Nyx',
    star: { x: 250, y: 50, size: 7, color: '#f97316' },
    bodies: [
      { name: 'Nyx I', x: 265, y: 50, size: 4, color: '#78350f', type: 'planet' },
      { name: 'Nyx II (Delamar)', x: 250, y: 37, size: 5, color: '#57534e', type: 'planet' },
      { name: 'Nyx III', x: 235, y: 50, size: 3, color: '#44403c', type: 'planet' },
    ],
    lagrange: [
      { name: 'NY1-L1', x: 258, y: 50, size: 2, parent: 'Nyx I' },
      { name: 'NY2-L1', x: 250, y: 44, size: 2, parent: 'Nyx II' },
      { name: 'NY3-L1', x: 242, y: 50, size: 2, parent: 'Nyx III' },
    ],
  },
};

function StarSystemMap({ markers, playerStatuses, events, operations, controlZones }) {
  const [selectedSystem, setSelectedSystem] = useState('stanton');
  const [hoveredBody, setHoveredBody] = useState(null);
  const [tacticalAI, setTacticalAI] = useState(null);
  const [showAIOverlays, setShowAIOverlays] = useState(true);
  const svgRef = useRef(null);

  const system = STAR_SYSTEMS[selectedSystem];

  // AI Analysis
  useEffect(() => {
    const analysis = analyzeTacticalSituation({
      events: events || [],
      operations: operations || [],
      playerStatuses: playerStatuses || [],
      controlZones: controlZones || [],
    });
    setTacticalAI(analysis);

    const unsubscribe = subscribeToTacticalAI((newAnalysis) => {
      setTacticalAI(newAnalysis);
    });

    const interval = setInterval(() => {
      updateTacticalAI({
        events: events || [],
        operations: operations || [],
        playerStatuses: playerStatuses || [],
        controlZones: controlZones || [],
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [events, operations, playerStatuses, controlZones]);

  return (
    <div className="h-full relative bg-zinc-950">
      {/* System Selector & AI Controls */}
      <div className="absolute top-2 left-2 z-40 flex gap-2">
        <div className="flex gap-1">
          {Object.keys(STAR_SYSTEMS).map((sysKey) => (
            <button
              key={sysKey}
              onClick={() => setSelectedSystem(sysKey)}
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                selectedSystem === sysKey
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                  : 'bg-zinc-900/80 border-zinc-700 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {STAR_SYSTEMS[sysKey].name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAIOverlays(!showAIOverlays)}
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
            showAIOverlays
              ? 'bg-green-500/20 border-green-500/40 text-green-400'
              : 'bg-zinc-900/80 border-zinc-700 text-zinc-500'
          }`}
          title="Toggle tactical analysis overlays"
        >
          <Activity className="w-3 h-3" />
          ANALYSIS
        </button>
      </div>

      {/* Threat Assessment Panel */}
      {tacticalAI && showAIOverlays && (
        <div className="absolute top-2 right-2 z-40 text-[10px] bg-zinc-900/95 border border-orange-500/30 text-zinc-200 px-3 py-2 rounded min-w-48 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-400 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Threat Assessment
            </span>
            <span className={`text-[9px] font-bold ${
              tacticalAI.assessment.overallThreat === 'CRITICAL' ? 'text-red-400' :
              tacticalAI.assessment.overallThreat === 'HIGH' ? 'text-orange-400' :
              tacticalAI.assessment.overallThreat === 'MODERATE' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {tacticalAI.assessment.overallThreat}
            </span>
          </div>
          <div className="text-zinc-400 text-[9px] space-y-0.5 border-t border-zinc-800 pt-1">
            <div>Threats: {tacticalAI.assessment.activeThreats}</div>
            <div>Risk Zones: {tacticalAI.assessment.totalRiskZones}</div>
            <div>Ready: {tacticalAI.assessment.readyUnits} | Engaged: {tacticalAI.assessment.engagedUnits}</div>
          </div>
          {tacticalAI.assessment.recommendations.length > 0 && (
            <div className="text-[9px] text-yellow-300 border-t border-zinc-800 pt-1">
              {tacticalAI.assessment.recommendations[0]}
            </div>
          )}
        </div>
      )}

      {/* Info Panel */}
      {hoveredBody && !tacticalAI && (
        <div className="absolute top-2 right-2 z-40 text-[10px] bg-zinc-900/95 border border-zinc-700 text-zinc-200 px-3 py-2 rounded min-w-32">
          <div className="font-bold text-orange-400">{hoveredBody.name}</div>
          <div className="text-zinc-500 text-[9px] mt-0.5">{hoveredBody.type || 'lagrange'}</div>
        </div>
      )}

      {/* SVG Star Map */}
      <svg
        ref={svgRef}
        viewBox="0 0 300 100"
        className="w-full h-full"
        style={{ background: 'radial-gradient(ellipse at center, rgba(24,24,27,0.8) 0%, rgba(9,9,11,1) 100%)' }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(113,113,122,0.08)" strokeWidth="0.2" />
          </pattern>
          <pattern id="fine-grid" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.15" fill="rgba(251,191,36,0.15)" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="300" height="100" fill="url(#grid)" />
        <rect width="300" height="100" fill="url(#fine-grid)" opacity="0.3" />

        {/* Star - Tactical Symbol */}
        <g filter="url(#glow)">
          <circle
            cx={system.star.x}
            cy={system.star.y}
            r={2.5}
            fill="none"
            stroke={system.star.color}
            strokeWidth="0.8"
            opacity="0.9"
          />
          <circle
            cx={system.star.x}
            cy={system.star.y}
            r={1}
            fill={system.star.color}
            opacity="0.8"
          />
          <path
            d={`M ${system.star.x - 4} ${system.star.y} L ${system.star.x + 4} ${system.star.y} M ${system.star.x} ${system.star.y - 4} L ${system.star.x} ${system.star.y + 4}`}
            stroke={system.star.color}
            strokeWidth="0.4"
            opacity="0.5"
          />
        </g>

        {/* Orbital Paths */}
        {system.bodies.map((body, i) => {
          const radius = Math.sqrt(
            Math.pow(body.x - system.star.x, 2) + Math.pow(body.y - system.star.y, 2)
          );
          return (
            <circle
              key={`orbit-${i}`}
              cx={system.star.x}
              cy={system.star.y}
              r={radius}
              fill="none"
              stroke="rgba(113,113,122,0.15)"
              strokeWidth="0.2"
              strokeDasharray="2,3"
            />
          );
        })}

        {/* Celestial Bodies - Tactical Icons */}
        {system.bodies.map((body, i) => (
          <g
            key={`body-${i}`}
            onMouseEnter={() => setHoveredBody(body)}
            onMouseLeave={() => setHoveredBody(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Tactical Ring */}
            <circle 
              cx={body.x} 
              cy={body.y} 
              r={body.size + 1.5} 
              fill="none" 
              stroke={body.color} 
              strokeWidth="0.3" 
              opacity="0.3"
              strokeDasharray="1,1.5"
            />
            {/* Core Symbol */}
            <circle cx={body.x} cy={body.y} r={body.size * 0.6} fill="none" stroke={body.color} strokeWidth="0.5" opacity="0.8" />
            <circle cx={body.x} cy={body.y} r={1.2} fill={body.color} opacity="0.6" />
            {/* Crosshair */}
            <path
              d={`M ${body.x - body.size} ${body.y} L ${body.x - body.size * 0.3} ${body.y} M ${body.x + body.size * 0.3} ${body.y} L ${body.x + body.size} ${body.y}`}
              stroke={body.color}
              strokeWidth="0.3"
              opacity="0.5"
            />
            <path
              d={`M ${body.x} ${body.y - body.size} L ${body.x} ${body.y - body.size * 0.3} M ${body.x} ${body.y + body.size * 0.3} L ${body.x} ${body.y + body.size}`}
              stroke={body.color}
              strokeWidth="0.3"
              opacity="0.5"
            />
            <text
              x={body.x}
              y={body.y + body.size + 3.5}
              fontSize="2"
              fill="rgba(244,244,245,0.8)"
              textAnchor="middle"
              fontWeight="600"
              fontFamily="monospace"
            >
              {body.name}
            </text>
          </g>
        ))}

        {/* Lagrange Points - Tactical Markers */}
        {system.lagrange.map((point, i) => (
          <g
            key={`lag-${i}`}
            onMouseEnter={() => setHoveredBody(point)}
            onMouseLeave={() => setHoveredBody(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Diamond marker */}
            <path
              d={`M ${point.x} ${point.y - 2} L ${point.x + 1.5} ${point.y} L ${point.x} ${point.y + 2} L ${point.x - 1.5} ${point.y} Z`}
              fill="none"
              stroke="#6366f1"
              strokeWidth="0.4"
              opacity="0.7"
            />
            <circle cx={point.x} cy={point.y} r={0.5} fill="#6366f1" opacity="0.6" />
            <text
              x={point.x}
              y={point.y + 3.5}
              fontSize="1.8"
              fill="rgba(139,92,246,0.9)"
              textAnchor="middle"
              fontWeight="500"
              fontFamily="monospace"
            >
              {point.name}
            </text>
          </g>
        ))}

        {/* Tactical Analysis Overlays */}
        {showAIOverlays && tacticalAI && (
          <g>
            {/* Risk Zones */}
            {tacticalAI.riskZones.map((zone, i) => {
              const x = 50 + Math.random() * 150;
              const y = 35 + Math.random() * 30;
              const radius = 8;
              const color = zone.level === 'critical' ? '#ef4444' : zone.level === 'danger' ? '#f97316' : '#eab308';
              return (
                <g key={`risk-${i}`}>
                  <circle cx={x} cy={y} r={radius} fill={color} opacity="0.08" />
                  <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="1,1" opacity="0.4" />
                  <circle cx={x} cy={y} r={radius * 0.5} fill="none" stroke={color} strokeWidth="0.2" opacity="0.6" />
                </g>
              );
            })}

            {/* Threat Predictions */}
            {tacticalAI.threats.map((threat, i) => {
              const x = 50 + Math.random() * 150;
              const y = 35 + Math.random() * 30;
              const size = 2 + threat.threatLevel * 3;
              return (
                <g key={`threat-${i}`} filter="url(#glow)">
                  <path
                    d={`M ${x - size} ${y} L ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} Z`}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="0.4"
                    opacity="0.7"
                  />
                  <circle cx={x} cy={y} r={size * 1.5} fill="none" stroke="#dc2626" strokeWidth="0.2" opacity="0.3" strokeDasharray="0.5,1">
                    <animate attributeName="r" from={size * 1.5} to={size * 2} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* Unit Placement Suggestions */}
            {tacticalAI.placements.map((placement, i) => {
              const x = 50 + Math.random() * 150;
              const y = 35 + Math.random() * 30;
              const size = 2;
              return (
                <g key={`placement-${i}`}>
                  <circle cx={x} cy={y} r={size} fill="#22c55e" opacity="0.4" />
                  <path
                    d={`M ${x - size * 1.5} ${y} L ${x + size * 1.5} ${y} M ${x} ${y - size * 1.5} L ${x} ${y + size * 1.5}`}
                    stroke="#22c55e"
                    strokeWidth="0.3"
                    opacity="0.6"
                  />
                  <circle cx={x} cy={y} r={size * 2} fill="none" stroke="#22c55e" strokeWidth="0.2" opacity="0.3" strokeDasharray="0.5,0.5" />
                </g>
              );
            })}
          </g>
        )}

        {/* Player Markers - Tactical Icons */}
        {playerStatuses
          .filter((status) => status.system === selectedSystem)
          .map((status, i) => {
            const coord = getCoordinate(status);
            if (!coord) return null;
            const [lat, lng] = coord;
            const color = STATUS_COLORS[status.status] || '#38bdf8';
            return (
              <g key={`player-${i}`} filter="url(#glow)">
                {/* Triangle marker */}
                <path
                  d={`M ${lng} ${lat - 1.5} L ${lng + 1.2} ${lat + 1} L ${lng - 1.2} ${lat + 1} Z`}
                  fill={color}
                  opacity="0.8"
                />
                <path
                  d={`M ${lng} ${lat - 1.5} L ${lng + 1.2} ${lat + 1} L ${lng - 1.2} ${lat + 1} Z`}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.3"
                  opacity="0.9"
                />
                <circle cx={lng} cy={lat} r={2.5} fill="none" stroke={color} strokeWidth="0.2" opacity="0.3" />
              </g>
            );
          })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-40 text-[9px] bg-zinc-900/80 border border-zinc-700 text-zinc-400 px-2 py-1.5 rounded space-y-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Star</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span>Planet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>Lagrange</span>
        </div>
        {showAIOverlays && tacticalAI && (
          <>
            <div className="border-t border-zinc-700 pt-0.5 mt-0.5" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/40" />
              <span>Risk Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-2 h-2 text-red-500" />
              <span>Threat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-2 h-2 text-green-500" />
              <span>Suggested</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
    <div className="flex flex-col h-full p-3 overflow-hidden">
      {/* Op Title & Status */}
      <div className="flex-shrink-0 space-y-2 mb-3">
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

      <div className="flex-shrink-0 h-px bg-zinc-800/40 mb-3" />

      {/* Quick Metrics */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-2 mb-3">
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
        <div className="flex-shrink-0 px-2.5 py-1.5 rounded border border-green-500/30 bg-green-500/5 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-300 font-bold uppercase tracking-wider">{voiceNet.activeNetId}</span>
            </div>
            <span className="text-[10px] text-green-400 font-mono">({voiceNet.participants?.length || 0})</span>
          </div>
        </div>
      )}

      {/* Participants List (flex-1 with internal scroll if needed) */}
      {participants.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Team</div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[10px] px-1.5 py-1 rounded hover:bg-zinc-800/30">
                <span className="text-zinc-300 truncate">{p.callsign || p.name || 'Unknown'}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 mt-3 pt-2 flex gap-1.5 border-t border-zinc-800/40">
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
  const [activeTab, setActiveTab] = useState('map');
  const [markers, setMarkers] = useState([]);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(FOOTER_HEIGHT_KEY);
      return saved ? Number(saved) : DEFAULT_HEIGHT;
    } catch {
      return DEFAULT_HEIGHT;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const resizeRef = useRef(null);
  const popoutWindowRef = useRef(null);

  const eventId = activeOp?.activeEvent?.id || null;

  // Persist height preference
  useEffect(() => {
    try {
      localStorage.setItem(FOOTER_HEIGHT_KEY, String(height));
    } catch {}
  }, [height]);

  // Handle resize
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      const maxHeight = window.innerHeight - 80; // Account for header
      const newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, startHeight + delta));
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

  // Load map data
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const filter = eventId ? { event_id: eventId } : {};
        const [markerList, statusList, eventsList] = await Promise.all([
          base44.entities.MapMarker?.filter(filter, '-created_date', 100).catch(() => []),
          base44.entities.PlayerStatus?.filter(filter, '-created_date', 50).catch(() => []),
          base44.entities.Message?.filter({}, '-created_date', 200).catch(() => []),
        ]);
        setMarkers(markerList || []);
        setPlayerStatuses(statusList || []);
        
        // Transform messages to events format for AI
        const transformedEvents = (eventsList || []).map(msg => ({
          id: msg.id,
          createdAt: msg.created_date,
          eventType: 'MESSAGE',
          channelId: msg.channel_id,
          authorId: msg.member_profile_id,
          payload: {
            content: msg.content,
            location: msg.channel_id,
          },
        }));
        
        // Initial AI analysis
        if (transformedEvents.length > 0) {
          updateTacticalAI({
            events: transformedEvents,
            operations: [],
            playerStatuses: statusList || [],
            controlZones: [],
          });
        }
      } catch (error) {
        console.error('Tactical footer load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  // Handle popout window
  const handlePopout = useCallback(() => {
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.focus();
      return;
    }

    const popoutWindow = window.open(
      '',
      'TacticalFooter',
      'width=1200,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!popoutWindow) return;

    popoutWindowRef.current = popoutWindow;
    setIsPoppedOut(true);

    // Write content to popout window
    popoutWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tactical Operations Center</title>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background: #09090b; }
            #root { width: 100vw; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `);
    popoutWindow.document.close();

    // Copy styles from parent
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((style) => {
      if (style.tagName === 'STYLE') {
        const newStyle = popoutWindow.document.createElement('style');
        newStyle.textContent = style.textContent;
        popoutWindow.document.head.appendChild(newStyle);
      } else if (style.tagName === 'LINK') {
        const newLink = popoutWindow.document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = style.href;
        popoutWindow.document.head.appendChild(newLink);
      }
    });

    // Handle window close
    popoutWindow.addEventListener('beforeunload', () => {
      setIsPoppedOut(false);
      popoutWindowRef.current = null;
    });

    // Render React content into popout
    import('react-dom/client').then(({ createRoot }) => {
      const PopoutContent = () => {
        const [popoutTab, setPopoutTab] = React.useState(activeTab);

        return (
          <div className="nexus-shell-root h-full bg-zinc-950 text-zinc-100 flex flex-col">
            <div className="nexus-shell-sweep" />
            <div className="nexus-shell-grid" />
            <div className="nexus-shell-vignette" />

            {/* Header */}
            <div className="relative flex-shrink-0 px-4 py-2 border-b border-orange-500/15 bg-zinc-900/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500 shrink-0" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Tactical Operations Center</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPopoutTab('map')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                      popoutTab === 'map' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopoutTab('operation')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                      popoutTab === 'operation' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Operation
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopoutTab('team')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                      popoutTab === 'team' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Team
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-hidden">
              {popoutTab === 'map' && (
                <StarSystemMap markers={markers} playerStatuses={playerStatuses} />
              )}

              {popoutTab === 'operation' && (
                <div className="h-full bg-zinc-900/20">
                  <EventDashboard activeOp={activeOp} voiceNet={voiceNet} />
                </div>
              )}

              {popoutTab === 'team' && (
                <div className="h-full p-4 bg-zinc-900/20">
                  <div className="grid grid-cols-4 gap-3 h-full">
                    {(activeOp?.participants || []).map((p) => (
                      <div key={p.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col">
                        <div className="text-xs font-bold text-orange-400 truncate">{p.callsign || p.name || 'Unknown'}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{p.role || 'Member'}</div>
                        <div className="mt-auto pt-2">
                          <div className="w-full h-1 rounded-full bg-zinc-800">
                            <div className="h-full rounded-full bg-green-500" style={{ width: '80%' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!activeOp?.participants || activeOp.participants.length === 0) && (
                      <div className="col-span-4 flex items-center justify-center text-zinc-600 text-xs">
                        No participants in active operation
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      };

      const root = createRoot(popoutWindow.document.getElementById('root'));
      root.render(<PopoutContent />);
    });
  }, [activeTab, markers, playerStatuses, activeOp, voiceNet]);

  // Cleanup popout on unmount
  React.useEffect(() => {
    return () => {
      if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
        popoutWindowRef.current.close();
      }
    };
  }, []);

  if (collapsed) {
    return (
      <footer className="relative w-full z-[700] border-t border-orange-500/20 bg-black/95 backdrop-blur-xl">
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePopout}
              className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
              title="Open in separate window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
              title="Expand tactical footer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    );
  }

  if (isPoppedOut) {
    return (
      <footer className="relative w-full z-[700] border-t border-orange-500/20 bg-black/95 backdrop-blur-xl">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[10px] font-mono flex-1 min-w-0">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 truncate">
              <ExternalLink className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="text-orange-300 truncate">Tactical view open in separate window</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
                popoutWindowRef.current.close();
              }
              setIsPoppedOut(false);
            }}
            className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors shrink-0"
            title="Close popout and show here"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative w-full z-[700] border-t border-orange-500/20 bg-black/98 backdrop-blur-xl shadow-2xl shadow-orange-500/5 flex flex-col transition-all duration-200" style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={`h-1.5 bg-gradient-to-r from-transparent via-orange-700/60 to-transparent cursor-ns-resize hover:via-orange-500 transition-all flex-shrink-0 flex items-center justify-center ${
          isResizing ? 'via-orange-500' : ''
        }`}
        onMouseDown={handleResizeStart}
        title="Drag to resize tactical footer"
      >
        <div className="w-12 h-0.5 bg-orange-400/60 rounded-full" />
      </div>

      {/* Header with Tabs */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-orange-500/15 bg-zinc-900/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-orange-500 shrink-0" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Tactical Operations Center</h3>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                activeTab === 'map' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('operation')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                activeTab === 'operation' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Operation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                activeTab === 'team' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Team
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePopout}
            className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
            title="Open in separate window"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 text-zinc-500 hover:text-orange-400 transition-colors"
            title="Collapse tactical footer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabbed Content - No scrolling needed */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'map' && (
          <StarSystemMap 
            markers={markers} 
            playerStatuses={playerStatuses}
            events={[]}
            operations={[]}
            controlZones={[]}
          />
        )}

        {activeTab === 'operation' && (
          <div className="h-full bg-zinc-900/20">
            <EventDashboard activeOp={activeOp} voiceNet={voiceNet} />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="h-full p-4 bg-zinc-900/20">
            <div className="grid grid-cols-4 gap-3 h-full">
              {(activeOp?.participants || []).map((p) => (
                <div key={p.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col">
                  <div className="text-xs font-bold text-orange-400 truncate">{p.callsign || p.name || 'Unknown'}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">{p.role || 'Member'}</div>
                  <div className="mt-auto pt-2">
                    <div className="w-full h-1 rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-green-500" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
              ))}
              {(!activeOp?.participants || activeOp.participants.length === 0) && (
                <div className="col-span-4 flex items-center justify-center text-zinc-600 text-xs">
                  No participants in active operation
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}