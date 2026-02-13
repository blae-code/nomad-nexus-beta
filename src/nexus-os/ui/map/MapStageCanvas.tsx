import React, { useMemo, useRef, useState } from 'react';
import type { ControlZone, TacticalLayerId } from '../../schemas/mapSchemas';
import type { IntelRenderable } from '../../services/intelService';
import type { MapCommsOverlay, MapCommsOverlayCallout, MapCommsOverlayLink } from '../../services/mapCommsOverlayService';
import type { MapLogisticsLane, MapLogisticsOverlay } from '../../services/mapLogisticsOverlayService';
import type {
  MapRadialState,
  MapCommsAnchor,
  OpsOverlayNode,
  RenderablePresence,
  TacticalRenderableNode,
  TacticalMapViewMode,
} from './mapTypes';
import RadialMenu, { type RadialMenuItem } from './RadialMenu';
import { AnimatedMount } from '../motion';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODE_BY_ID } from './mapBoard';

interface MapStageCanvasProps {
  layerEnabled: (id: TacticalLayerId) => boolean;
  opsOverlay: OpsOverlayNode[];
  controlZones: ControlZone[];
  visibleCommsLinks: MapCommsOverlayLink[];
  commsOverlay: MapCommsOverlay;
  commsAnchors: Record<string, MapCommsAnchor>;
  visibleCommsCallouts: MapCommsOverlayCallout[];
  logisticsOverlay: MapLogisticsOverlay;
  visibleMapNodes: TacticalRenderableNode[];
  presence: RenderablePresence[];
  visibleIntel: IntelRenderable[];
  mapViewMode: TacticalMapViewMode;
  selectedNodeLabel?: string;
  activeRadial: MapRadialState | null;
  radialItems: RadialMenuItem[];
  hasAnyOverlay: boolean;
  onClearRadial: () => void;
  onSelectZone: (zoneId: string) => void;
  onSelectIntel: (intelId: string) => void;
  onSetActiveRadial: (value: MapRadialState | null) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function confidenceBandToStroke(confidence: IntelRenderable['confidence']): number {
  if (confidence === 'HIGH') return 1.35;
  if (confidence === 'MED') return 1;
  return 0.72;
}

function confidenceBandToColor(confidence: IntelRenderable['confidence']): string {
  if (confidence === 'HIGH') return 'rgba(118, 201, 140, 0.9)';
  if (confidence === 'MED') return 'rgba(201, 161, 94, 0.86)';
  return 'rgba(189, 104, 87, 0.82)';
}

function glyphFillForIntelType(type: IntelRenderable['type']): string {
  if (type === 'PIN') return 'rgba(84, 146, 196, 0.24)';
  if (type === 'MARKER') return 'rgba(98, 162, 138, 0.22)';
  return 'rgba(122, 142, 164, 0.22)';
}

function keyForIntel(intel: IntelRenderable): string {
  return `${intel.id}:${intel.updatedAt}`;
}

function intelTooltip(intel: IntelRenderable): string {
  return `${intel.title} | ${intel.type} | ${intel.stratum} | ${intel.confidence} | ttl ${intel.ttl.remainingSeconds}s`;
}

function stateColor(state: RenderablePresence['displayState']): string {
  if (state === 'DECLARED') return 'rgba(118, 201, 140, 0.86)';
  if (state === 'INFERRED') return 'rgba(201, 161, 94, 0.85)';
  return 'rgba(135, 128, 122, 0.72)';
}

function confidenceColor(confidenceBand: RenderablePresence['confidenceBand']): string {
  if (confidenceBand === 'HIGH') return 'rgba(118, 201, 140, 0.9)';
  if (confidenceBand === 'MED') return 'rgba(201, 161, 94, 0.85)';
  return 'rgba(189, 104, 87, 0.85)';
}

function commsPriorityColor(priority: string): string {
  if (priority === 'CRITICAL') return 'rgba(214, 83, 64, 0.92)';
  if (priority === 'HIGH') return 'rgba(201, 161, 94, 0.9)';
  return 'rgba(118, 172, 214, 0.84)';
}

function logisticsLaneColor(lane: MapLogisticsLane): string {
  if (lane.stale) return 'rgba(126, 119, 112, 0.45)';
  if (lane.laneKind === 'EXTRACT') return 'rgba(118, 201, 140, 0.88)';
  if (lane.laneKind === 'HOLD') return 'rgba(201, 161, 94, 0.86)';
  if (lane.laneKind === 'AVOID') return 'rgba(214, 83, 64, 0.9)';
  if (lane.laneKind === 'ROUTE_HYPOTHESIS') return 'rgba(94, 158, 178, 0.82)';
  return 'rgba(118, 172, 214, 0.88)';
}

function nodeStrokeColor(category: string | undefined, isSystem: boolean): string {
  if (isSystem) return 'rgba(110, 178, 224, 0.74)';
  if (category === 'planet') return 'rgba(150, 172, 196, 0.72)';
  if (category === 'moon') return 'rgba(134, 160, 182, 0.7)';
  if (category === 'station') return 'rgba(98, 188, 218, 0.82)';
  if (category === 'lagrange') return 'rgba(132, 176, 206, 0.72)';
  if (category === 'orbital-marker') return 'rgba(118, 144, 172, 0.58)';
  return 'rgba(126, 152, 178, 0.64)';
}

function nodeFillColor(category: string | undefined, isSystem: boolean): string {
  if (isSystem) return 'rgba(78, 138, 188, 0.2)';
  if (category === 'planet') return 'rgba(78, 98, 124, 0.28)';
  if (category === 'moon') return 'rgba(70, 88, 108, 0.24)';
  if (category === 'station') return 'rgba(58, 102, 124, 0.32)';
  if (category === 'lagrange') return 'rgba(70, 96, 116, 0.2)';
  if (category === 'orbital-marker') return 'rgba(80, 96, 116, 0.14)';
  return 'rgba(72, 92, 112, 0.2)';
}

export default function MapStageCanvas({
  layerEnabled,
  opsOverlay,
  controlZones,
  visibleCommsLinks,
  commsOverlay,
  commsAnchors,
  visibleCommsCallouts,
  logisticsOverlay,
  visibleMapNodes,
  presence,
  visibleIntel,
  mapViewMode,
  selectedNodeLabel,
  activeRadial,
  radialItems,
  hasAnyOverlay,
  onClearRadial,
  onSelectZone,
  onSelectIntel,
  onSetActiveRadial,
}: MapStageCanvasProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPointerActive, setIsPointerActive] = useState(false);
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const mapScaleLabel = `${Math.max(1, Math.round(500_000 / zoom)).toLocaleString()} km`;

  const mapTransform = useMemo(() => {
    const scale = clamp(Number.isFinite(zoom) ? zoom : 1, 0.8, 2.2);
    return `translate(50 50) scale(${scale}) translate(-50 -50)`;
  }, [zoom]);

  const orbitalRings = useMemo(
    () =>
      visibleMapNodes
        .filter(
          (node) =>
            Boolean(node.parentId) &&
            (node.category === 'moon' ||
              node.category === 'station' ||
              node.category === 'lagrange' ||
              node.category === 'orbital-marker')
        )
        .map((node) => {
          const parent = node.parentId ? TACTICAL_MAP_NODE_BY_ID[node.parentId] : null;
          if (!parent) return null;
          const dx = node.x - parent.x;
          const dy = node.y - parent.y;
          return {
            id: `orbit:${node.id}`,
            x: parent.x,
            y: parent.y,
            radius: Math.sqrt(dx * dx + dy * dy),
            dashed: node.category !== 'moon',
          };
        })
        .filter(Boolean) as Array<{ id: string; x: number; y: number; radius: number; dashed: boolean }>,
    [visibleMapNodes]
  );
  const mapNodeIdSet = useMemo(() => new Set(visibleMapNodes.map((node) => node.id)), [visibleMapNodes]);

  const handleCursorUpdate: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    const centeredX = relativeX * 100;
    const centeredY = relativeY * 100;
    const x = clamp((centeredX - 50) / zoom + 50, 0, 100);
    const y = clamp((centeredY - 50) / zoom + 50, 0, 100);
    setCursorCoords({ x, y });
  };

  return (
    <div
      ref={stageRef}
      className="h-full min-h-[280px] rounded border border-zinc-800 bg-zinc-950/60 relative overflow-hidden nexus-map-stage"
      onClick={onClearRadial}
      onDoubleClick={() => setZoom(1)}
      onPointerMove={handleCursorUpdate}
      onPointerEnter={() => setIsPointerActive(true)}
      onPointerLeave={() => setIsPointerActive(false)}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="zone-contested-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(201,152,96,0.3)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="rgba(8, 14, 21, 0.9)" />
        <g transform={mapTransform}>
          {orbitalRings.map((ring) => (
            <circle
              key={ring.id}
              cx={ring.x}
              cy={ring.y}
              r={ring.radius}
              fill="none"
              stroke="rgba(128, 174, 208, 0.2)"
              strokeWidth={0.4}
              strokeDasharray={ring.dashed ? '1.6 1.1' : undefined}
            />
          ))}

        {TACTICAL_MAP_EDGES.map((edge) => {
          if (!mapNodeIdSet.has(edge.fromNodeId) || !mapNodeIdSet.has(edge.toNodeId)) return null;
          const source = TACTICAL_MAP_NODE_BY_ID[edge.fromNodeId];
          const target = TACTICAL_MAP_NODE_BY_ID[edge.toNodeId];
          if (!source || !target) return null;
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={edge.risk === 'high' ? 'rgba(214,83,64,0.5)' : edge.risk === 'medium' ? 'rgba(201,161,94,0.45)' : 'rgba(92,138,174,0.3)'}
              strokeWidth={1.05}
              strokeDasharray="3 2"
            />
          );
        })}

        {layerEnabled('ops')
          ? opsOverlay.map((entry) => {
              const anchorNode = TACTICAL_MAP_NODE_BY_ID[entry.nodeId];
              if (!anchorNode) return null;
              return (
                <g key={`ops:${entry.id}`}>
                  <circle
                    cx={anchorNode.x}
                    cy={anchorNode.y}
                    r={anchorNode.radius + (entry.isFocus ? 3.8 : 2.2)}
                    fill="none"
                    stroke={entry.isFocus ? 'rgba(106, 188, 236, 0.9)' : 'rgba(102, 136, 164, 0.38)'}
                    strokeWidth={entry.isFocus ? 1.3 : 0.9}
                    strokeDasharray={entry.isFocus ? '4 2' : '2 2'}
                    opacity={entry.isFocus ? 0.9 : 0.45}
                  />
                </g>
              );
            })
          : null}

        {layerEnabled('controlZones')
          ? controlZones.map((zone) => {
              const anchorNode = zone.geometryHint.nodeId ? TACTICAL_MAP_NODE_BY_ID[zone.geometryHint.nodeId] : null;
              if (!anchorNode) return null;
              const lead = zone.assertedControllers[0];
              const confidence = lead?.confidence || 0.45;
              const decayOpacity = Math.max(0.18, Math.min(0.78, confidence * 0.8));
              const radius = anchorNode.radius + 7 + confidence * 11;
              const contested = zone.contestationLevel >= 0.45;
              const controllers = zone.assertedControllers.slice(0, 2);
              return (
                <g
                  key={zone.id}
                  tabIndex={0}
                  role="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectZone(zone.id);
                    onSetActiveRadial({
                      type: 'zone',
                      title: 'Control Zone',
                      anchor: { x: anchorNode.x, y: anchorNode.y },
                      zoneId: zone.id,
                      nodeId: anchorNode.id,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelectZone(zone.id);
                    onSetActiveRadial({
                      type: 'zone',
                      title: 'Control Zone',
                      anchor: { x: anchorNode.x, y: anchorNode.y },
                      zoneId: zone.id,
                      nodeId: anchorNode.id,
                    });
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {controllers.length <= 1 ? (
                    <circle
                      cx={anchorNode.x}
                      cy={anchorNode.y}
                      r={radius}
                      fill={contested ? 'url(#zone-contested-hatch)' : 'rgba(86,150,196,0.12)'}
                      stroke={contested ? 'rgba(201,145,102,0.7)' : 'rgba(98,174,220,0.56)'}
                      strokeWidth={1.4 + zone.contestationLevel * 2}
                      opacity={decayOpacity}
                    />
                  ) : (
                    controllers.map((controller, controllerIndex) => (
                      <circle
                        key={`${zone.id}:${controller.orgId}`}
                        cx={anchorNode.x + (controllerIndex === 0 ? -0.5 : 0.5)}
                        cy={anchorNode.y}
                        r={radius + controllerIndex * 1.4}
                        fill={controllerIndex === 0 ? 'rgba(86,150,196,0.12)' : 'url(#zone-contested-hatch)'}
                        stroke={controllerIndex === 0 ? 'rgba(98,174,220,0.62)' : 'rgba(201,145,102,0.7)'}
                        strokeWidth={1.1 + controller.confidence * 2}
                        opacity={Math.max(0.16, Math.min(0.72, decayOpacity - controllerIndex * 0.08))}
                      />
                    ))
                  )}
                </g>
              );
            })
          : null}

        {layerEnabled('comms')
          ? visibleCommsLinks.map((link) => {
              const source = commsAnchors[link.fromNetId];
              const target = commsAnchors[link.toNetId];
              if (!source || !target) return null;
              const isDegraded = link.status === 'degraded';
              return (
                <line
                  key={`comms-link:${link.id}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isDegraded ? 'rgba(201,161,94,0.74)' : 'rgba(89,172,198,0.68)'}
                  strokeWidth={isDegraded ? 1.05 : 0.95}
                  strokeDasharray={isDegraded ? '2 2' : '4 2'}
                  opacity={isDegraded ? 0.74 : 0.62}
                />
              );
            })
          : null}

        {layerEnabled('comms')
          ? commsOverlay.nets.map((net) => {
              const anchor = commsAnchors[net.id];
              if (!anchor) return null;
              const color = net.quality === 'CONTESTED'
                ? 'rgba(214,83,64,0.94)'
                : net.quality === 'DEGRADED'
                  ? 'rgba(201,161,94,0.9)'
                  : 'rgba(94,172,118,0.88)';
              return (
                <g key={`comms-net:${net.id}`}>
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={Math.max(0.95, Math.min(2.1, 0.9 + net.participants * 0.16))}
                    fill={color}
                    fillOpacity={net.speaking > 0 ? 0.42 : 0.22}
                    stroke={color}
                    strokeWidth={net.speaking > 0 ? 1.2 : 0.75}
                    opacity={net.participants > 0 ? 0.95 : 0.55}
                  />
                </g>
              );
            })
          : null}

        {layerEnabled('comms')
          ? visibleCommsCallouts.map((callout, index) => {
              const anchorNet = callout.netId ? commsAnchors[callout.netId] : null;
              const node = TACTICAL_MAP_NODE_BY_ID[callout.nodeId];
              if (!node) return null;
              const x = anchorNet ? anchorNet.x + (((index % 2) * 2) - 1) * 1.15 : node.x + (((index % 3) - 1) * 1.2);
              const y = anchorNet ? anchorNet.y - 2.35 : node.y - node.radius - 2.4 - (index % 2);
              const color = commsPriorityColor(callout.priority);
              const opacity = callout.stale ? 0.44 : 0.92;
              return (
                <g key={`comms-callout:${callout.id}`} opacity={opacity}>
                  <polygon
                    points={`${x},${y - 1.25} ${x + 1.2},${y + 1.05} ${x - 1.2},${y + 1.05}`}
                    fill="rgba(17,13,11,0.9)"
                    stroke={color}
                    strokeWidth={0.68}
                  />
                  <circle cx={x} cy={y + 0.25} r={0.32} fill={color} />
                </g>
              );
            })
          : null}

        {layerEnabled('logistics')
          ? logisticsOverlay.lanes.map((lane, index) => {
              const fromNode = TACTICAL_MAP_NODE_BY_ID[lane.fromNodeId];
              const toNode = TACTICAL_MAP_NODE_BY_ID[lane.toNodeId];
              if (!fromNode || !toNode) return null;
              const color = logisticsLaneColor(lane);
              const offset = ((index % 3) - 1) * 0.45;
              const x1 = fromNode.x + offset;
              const y1 = fromNode.y + offset;
              const x2 = toNode.x + offset;
              const y2 = toNode.y + offset;
              return (
                <g key={lane.id} opacity={lane.stale ? 0.45 : 0.92}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth={lane.laneKind === 'EXTRACT' ? 1.25 : 1}
                    strokeDasharray={lane.laneKind === 'HOLD' ? '2 2' : lane.laneKind === 'ROUTE_HYPOTHESIS' ? '4 2' : '5 2'}
                  />
                  <circle cx={x2} cy={y2} r={0.62} fill={color} />
                </g>
              );
            })
          : null}

        {visibleMapNodes.map((node) => {
          const isSystem = node.kind === 'system';
          const isOm = node.category === 'orbital-marker';
          const isStation = node.category === 'station';
          const isLagrange = node.category === 'lagrange';
          const labelText = isOm
            ? node.label.split(' ').slice(-1)[0]
            : isLagrange
              ? node.label.replace(/^.*\sL/, 'L')
              : node.label;
          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              onClick={(event) => {
                event.stopPropagation();
                onSetActiveRadial({
                  type: 'node',
                  title: node.label,
                  anchor: { x: node.x, y: node.y },
                  nodeId: node.id,
                });
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSetActiveRadial({
                  type: 'node',
                  title: node.label,
                  anchor: { x: node.x, y: node.y },
                  nodeId: node.id,
                });
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={nodeFillColor(node.category, isSystem)}
                stroke={nodeStrokeColor(node.category, isSystem)}
                strokeWidth={isSystem ? 1.8 : isOm ? 0.45 : isStation ? 0.8 : 1.05}
                opacity={isOm ? 0.7 : 1}
              />
              <text
                x={node.x}
                y={node.y + node.radius + (isOm ? 1.4 : 2.6)}
                textAnchor="middle"
                style={{
                  fill: isOm ? 'rgba(170,188,206,0.72)' : 'rgba(214,230,242,0.9)',
                  fontSize: isSystem ? '2.6px' : isOm ? '1.2px' : isLagrange ? '1.45px' : '1.95px',
                  letterSpacing: isOm ? '0.16px' : '0.25px',
                  textTransform: 'uppercase',
                }}
              >
                {labelText}
              </text>
            </g>
          );
        })}

        {layerEnabled('presence')
          ? presence.map((entry, index) => {
              const node = TACTICAL_MAP_NODE_BY_ID[entry.nodeId];
              if (!node) return null;
              const x = node.x + ((index % 3) - 1) * 1.9;
              const y = node.y - node.radius - 2.2 - ((index % 2) * 1.2);
              return (
                <g key={entry.id}>
                  <circle cx={x} cy={y} r={1.3} fill={stateColor(entry.displayState)} stroke={confidenceColor(entry.confidenceBand)} strokeWidth={0.45} />
                  <text
                    x={x + 1.8}
                    y={y + 0.45}
                    style={{
                      fill: 'rgba(220,235,246,0.88)',
                      fontSize: '1.6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {entry.subjectId.slice(0, 6)}
                  </text>
                </g>
              );
            })
          : null}

        {layerEnabled('intel')
          ? visibleIntel.map((intel) => {
              const node = TACTICAL_MAP_NODE_BY_ID[intel.anchor.nodeId];
              if (!node) return null;
              const x = node.x + Number(intel.anchor.dx || 0);
              const y = node.y + Number(intel.anchor.dy || 0);
              const strokeWidth = confidenceBandToStroke(intel.confidence);
              const opacity = intel.ttl.stale ? 0.18 : Math.max(0.24, Math.min(0.9, intel.ttl.decayRatio));
              const stroke = confidenceBandToColor(intel.confidence);
              const fill = glyphFillForIntelType(intel.type);
              return (
                <g
                  key={keyForIntel(intel)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectIntel(intel.id);
                    onSetActiveRadial({
                      type: 'intel',
                      title: intel.type,
                      anchor: { x, y },
                      intelId: intel.id,
                      nodeId: intel.anchor.nodeId,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelectIntel(intel.id);
                    onSetActiveRadial({
                      type: 'intel',
                      title: intel.type,
                      anchor: { x, y },
                      intelId: intel.id,
                      nodeId: intel.anchor.nodeId,
                    });
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer', opacity }}
                >
                  <title>{intelTooltip(intel)}</title>
                  {intel.type === 'PIN' ? (
                    <polygon
                      points={`${x},${y - 1.8} ${x + 1.8},${y} ${x},${y + 1.8} ${x - 1.8},${y}`}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  ) : null}
                  {intel.type === 'MARKER' ? (
                    <polygon
                      points={`${x},${y - 2} ${x + 1.9},${y + 1.8} ${x - 1.9},${y + 1.8}`}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  ) : null}
                  {intel.type === 'NOTE' ? (
                    <rect
                      x={x - 1.6}
                      y={y - 1.6}
                      width={3.2}
                      height={3.2}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  ) : null}
                </g>
              );
            })
          : null}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 nexus-map-noise-overlay" />

      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-[12]">
        <button
          type="button"
          className="nexus-map-zoom-btn"
          onClick={(event) => {
            event.stopPropagation();
            setZoom((prev) => clamp(prev + 0.15, 0.8, 2.2));
          }}
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="nexus-map-zoom-btn"
          onClick={(event) => {
            event.stopPropagation();
            setZoom((prev) => clamp(prev - 0.15, 0.8, 2.2));
          }}
          title="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          className="nexus-map-zoom-btn nexus-map-zoom-btn-reset"
          onClick={(event) => {
            event.stopPropagation();
            setZoom(1);
          }}
          title="Reset zoom"
        >
          R
        </button>
      </div>

      <div className="absolute bottom-3 left-3 nexus-map-hud-panel text-[11px] z-[12]">
        <div className="nexus-map-hud-title">Map Telemetry</div>
        <div className="nexus-map-hud-row">
          <span>Cursor</span>
          <strong>{isPointerActive ? `${cursorCoords.x.toFixed(2)} / ${cursorCoords.y.toFixed(2)}` : '-- / --'}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>View</span>
          <strong>{mapViewMode}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>Selection</span>
          <strong className="truncate">{selectedNodeLabel || 'None'}</strong>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 nexus-map-hud-panel text-[11px] z-[12]">
        <div className="nexus-map-hud-title">Scale + Zoom</div>
        <div className="nexus-map-hud-row">
          <span>Scale</span>
          <strong>{mapScaleLabel}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>Zoom</span>
          <strong>{zoomLabel}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>Comms</span>
          <strong>{visibleCommsCallouts.length}</strong>
        </div>
      </div>

      <RadialMenu
        open={Boolean(activeRadial)}
        title={activeRadial?.title || 'Actions'}
        anchor={activeRadial?.anchor || { x: 50, y: 50 }}
        items={radialItems}
        onClose={onClearRadial}
      />

      {!hasAnyOverlay ? (
        <AnimatedMount show className="absolute inset-x-3 bottom-3">
          <div className="rounded border border-zinc-700 bg-zinc-950/72 px-3 py-2 text-xs text-zinc-400 nexus-command-capsule-grid">
            No active overlays. Baseline system board is rendered and ready for scoped data.
          </div>
        </AnimatedMount>
      ) : null}
    </div>
  );
}
