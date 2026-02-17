import React, { useEffect, useMemo, useRef, useState } from 'react';
import RadialMenu from './RadialMenu';
import { TacticalNodeGlyph } from './tacticalGlyphs';
import { AnimatedMount } from '../motion';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODE_BY_ID } from './mapBoard';
import MapDrawingTools from './MapDrawingTools';
import MapCollaborativeCursors from './MapCollaborativeCursors';
import MapDrawingLayer from './MapDrawingLayer';
import MapShareDialog from './MapShareDialog';
import { useMapCollaboration } from '../../hooks/useMapCollaboration';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampViewportCenter(center, zoom) {
  const boundedZoom = clamp(zoom, 0.8, 2.2);
  const halfSpan = 50 / boundedZoom;
  return {
    x: clamp(center.x, halfSpan, 100 - halfSpan),
    y: clamp(center.y, halfSpan, 100 - halfSpan),
  };
}

function confidenceBandToStroke(confidence) {
  if (confidence === 'HIGH') return 0.65;
  if (confidence === 'MED') return 0.5;
  return 0.42;
}

function confidenceBandToColor(confidence) {
  if (confidence === 'HIGH') return 'rgba(118, 201, 140, 0.9)';
  if (confidence === 'MED') return 'rgba(201, 161, 94, 0.86)';
  return 'rgba(189, 104, 87, 0.82)';
}

function glyphFillForIntelType(type) {
  if (type === 'PIN') return 'rgba(84, 146, 196, 0.24)';
  if (type === 'MARKER') return 'rgba(98, 162, 138, 0.22)';
  return 'rgba(122, 142, 164, 0.22)';
}

function keyForIntel(intel) {
  return `${intel.id}:${intel.updatedAt}`;
}

function intelTooltip(intel) {
  return `${intel.title} | ${intel.type} | ${intel.stratum} | ${intel.confidence} | ttl ${intel.ttl.remainingSeconds}s`;
}

function stateColor(state) {
  if (state === 'DECLARED') return 'rgba(118, 201, 140, 0.86)';
  if (state === 'INFERRED') return 'rgba(201, 161, 94, 0.85)';
  return 'rgba(135, 128, 122, 0.72)';
}

function confidenceColor(confidenceBand) {
  if (confidenceBand === 'HIGH') return 'rgba(118, 201, 140, 0.9)';
  if (confidenceBand === 'MED') return 'rgba(201, 161, 94, 0.85)';
  return 'rgba(189, 104, 87, 0.85)';
}

function commsPriorityColor(priority) {
  if (priority === 'CRITICAL') return 'rgba(214, 83, 64, 0.92)';
  if (priority === 'HIGH') return 'rgba(201, 161, 94, 0.9)';
  return 'rgba(118, 172, 214, 0.84)';
}

function logisticsLaneColor(lane) {
  if (lane.stale) return 'rgba(126, 119, 112, 0.45)';
  if (lane.laneKind === 'EXTRACT') return 'rgba(118, 201, 140, 0.88)';
  if (lane.laneKind === 'HOLD') return 'rgba(201, 161, 94, 0.86)';
  if (lane.laneKind === 'AVOID') return 'rgba(214, 83, 64, 0.9)';
  if (lane.laneKind === 'ROUTE_HYPOTHESIS') return 'rgba(94, 158, 178, 0.82)';
  return 'rgba(118, 172, 214, 0.88)';
}

function nodeStrokeColor(category, isSystem) {
  if (isSystem) return 'rgba(235, 224, 146, 0.86)';
  if (category === 'planet') return 'rgba(142, 206, 172, 0.74)';
  if (category === 'moon') return 'rgba(154, 170, 186, 0.62)';
  if (category === 'station') return 'rgba(124, 220, 168, 0.84)';
  if (category === 'lagrange') return 'rgba(210, 196, 118, 0.72)';
  if (category === 'orbital-marker') return 'rgba(132, 186, 156, 0.54)';
  return 'rgba(124, 188, 160, 0.62)';
}

function nodeFillColor(category, isSystem) {
  if (isSystem) return 'rgba(214, 168, 94, 0.26)';
  if (category === 'planet') return 'rgba(70, 132, 108, 0.27)';
  if (category === 'moon') return 'rgba(74, 92, 104, 0.24)';
  if (category === 'station') return 'rgba(50, 112, 92, 0.32)';
  if (category === 'lagrange') return 'rgba(120, 102, 58, 0.2)';
  if (category === 'orbital-marker') return 'rgba(64, 90, 80, 0.12)';
  return 'rgba(64, 92, 82, 0.2)';
}

function shouldRenderLabel(node, viewMode, selectedNodeId) {
  if (selectedNodeId && node.id === selectedNodeId) return true;
  if (node.kind === 'system' || node.category === 'planet') return true;
  if (viewMode === 'LOCAL') return node.category !== 'orbital-marker';
  if (viewMode === 'PLANETARY') return node.category === 'moon' || node.category === 'station';
  return false;
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
  selectedNodeId,
  selectedNodeLabel,
  activeRadial,
  radialItems,
  hasAnyOverlay,
  operationId,
  actorId,
  onClearRadial,
  onSelectZone,
  onSelectIntel,
  onSetActiveRadial,
}) {
  const stageRef = useRef(null);
  const minimapRef = useRef(null);
  const dragStateRef = useRef(null);
  const recenterKeyRef = useRef('');
  const drawStartRef = useRef(null);
  const pathPointsRef = useRef([]);
  const [zoom, setZoom] = useState(1);
  const [viewportCenter, setViewportCenter] = useState({ x: 50, y: 50 });
  const [cursorCoords, setCursorCoords] = useState({ x: 50, y: 50 });
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [drawMode, setDrawMode] = useState(null);
  const [drawingPreview, setDrawingPreview] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const mapScaleLabel = `${Math.max(1, Math.round(500_000 / zoom)).toLocaleString()} km`;

  const collaboration = useMapCollaboration({
    operationId: operationId || '',
    actorId: actorId || '',
    enabled: Boolean(operationId && actorId),
  });

  const mapTransform = useMemo(() => {
    const scale = clamp(Number.isFinite(zoom) ? zoom : 1, 0.8, 2.2);
    return `translate(50 50) scale(${scale}) translate(${-viewportCenter.x} ${-viewportCenter.y})`;
  }, [zoom, viewportCenter.x, viewportCenter.y]);
  const viewportWindow = useMemo(() => {
    const span = 100 / Math.max(zoom, 0.8);
    return {
      x: viewportCenter.x - span / 2,
      y: viewportCenter.y - span / 2,
      width: span,
      height: span,
    };
  }, [viewportCenter.x, viewportCenter.y, zoom]);

  const orbitalRings = useMemo(
    () =>
      visibleMapNodes
        .filter(
          (node) =>
            Boolean(node.parentId) &&
            mapViewMode !== 'SYSTEM' &&
            (node.category === 'moon' ||
              node.category === 'station' ||
              (mapViewMode === 'LOCAL' && (node.category === 'lagrange' || node.category === 'orbital-marker')))
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
        .filter(Boolean),
    [visibleMapNodes, mapViewMode]
  );
  const mapNodeIdSet = useMemo(() => new Set(visibleMapNodes.map((node) => node.id)), [visibleMapNodes]);
  const visibleEdges = useMemo(
    () =>
      TACTICAL_MAP_EDGES.filter((edge) => {
        if (!mapNodeIdSet.has(edge.fromNodeId) || !mapNodeIdSet.has(edge.toNodeId)) return false;
        if (mapViewMode === 'SYSTEM') return edge.kind === 'jump';
        if (mapViewMode === 'PLANETARY') return edge.kind !== 'jump';
        return true;
      }),
    [mapNodeIdSet, mapViewMode]
  );
  const minimapNodes = useMemo(
    () =>
      visibleMapNodes.filter(
        (node) =>
          node.kind === 'system' ||
          node.category === 'planet' ||
          (selectedNodeId ? node.id === selectedNodeId : false)
      ),
    [visibleMapNodes, selectedNodeId]
  );

  useEffect(() => {
    setViewportCenter((prev) => clampViewportCenter(prev, zoom));
  }, [zoom]);

  useEffect(() => {
    const recenterKey = `${selectedNodeId || ''}:${mapViewMode}`;
    if (recenterKeyRef.current === recenterKey) return;
    recenterKeyRef.current = recenterKey;
    if (!selectedNodeId) return;
    const node = TACTICAL_MAP_NODE_BY_ID[selectedNodeId];
    if (!node) return;
    setViewportCenter(clampViewportCenter({ x: node.x, y: node.y }, zoom));
  }, [selectedNodeId, mapViewMode, zoom]);

  const handleCursorUpdate = (event) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    const centeredX = relativeX * 100;
    const centeredY = relativeY * 100;
    const x = clamp(viewportCenter.x + (centeredX - 50) / zoom, 0, 100);
    const y = clamp(viewportCenter.y + (centeredY - 50) / zoom, 0, 100);
    setCursorCoords({ x, y });
    
    // Update collaborative cursor
    collaboration.updateCursor(x, y);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target.closest('[data-map-interactive="true"]')) return;
    
    // Handle drawing modes
    if (drawMode) {
      event.stopPropagation();
      
      if (drawMode === 'marker') {
        // Place marker immediately
        collaboration.addElement({
          type: 'marker',
          data: {
            x: cursorCoords.x,
            y: cursorCoords.y,
            fill: 'rgba(239, 68, 68, 0.7)',
            stroke: 'rgba(239, 68, 68, 1)',
            label: 'Marker',
          },
        });
        setDrawMode(null);
        return;
      }
      
      if (drawMode === 'zone') {
        drawStartRef.current = { x: cursorCoords.x, y: cursorCoords.y };
        return;
      }
      
      if (drawMode === 'path') {
        pathPointsRef.current.push({ x: cursorCoords.x, y: cursorCoords.y });
        setDrawingPreview({ type: 'path', points: [...pathPointsRef.current] });
        return;
      }
    }
    
    if (!stageRef.current) return;
    stageRef.current.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setIsDragging(true);
    onClearRadial();
  };

  const handlePointerMove = (event) => {
    handleCursorUpdate(event);
    
    // Handle zone drawing preview
    if (drawMode === 'zone' && drawStartRef.current) {
      const dx = cursorCoords.x - drawStartRef.current.x;
      const dy = cursorCoords.y - drawStartRef.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      setDrawingPreview({
        type: 'zone',
        cx: drawStartRef.current.x,
        cy: drawStartRef.current.y,
        radius,
      });
      return;
    }
    
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = event.clientX - dragState.clientX;
    const dy = event.clientY - dragState.clientY;
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    const dxPercent = (dx / rect.width) * 100;
    const dyPercent = (dy / rect.height) * 100;
    setViewportCenter((prev) =>
      clampViewportCenter(
        {
          x: prev.x - dxPercent / zoom,
          y: prev.y - dyPercent / zoom,
        },
        zoom
      )
    );
  };

  const handlePointerUp = (event) => {
    // Complete zone drawing
    if (drawMode === 'zone' && drawStartRef.current && drawingPreview) {
      collaboration.addElement({
        type: 'circle',
        data: {
          cx: drawingPreview.cx,
          cy: drawingPreview.cy,
          radius: drawingPreview.radius,
          fill: 'rgba(59, 130, 246, 0.2)',
          stroke: 'rgba(59, 130, 246, 0.8)',
          strokeWidth: 0.4,
        },
      });
      drawStartRef.current = null;
      setDrawingPreview(null);
      setDrawMode(null);
      return;
    }
    
    if (stageRef.current && stageRef.current.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const updateZoom = (updater) => {
    setZoom((prev) => {
      const next = clamp(updater(prev), 0.8, 2.2);
      setViewportCenter((center) => clampViewportCenter(center, next));
      return next;
    });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    const zoomMultiplier = event.deltaY > 0 ? 0.9 : 1.1;
    const nextZoom = clamp(zoom * zoomMultiplier, 0.8, 2.2);
    const worldX = viewportCenter.x + (pointerX - 50) / zoom;
    const worldY = viewportCenter.y + (pointerY - 50) / zoom;

    setZoom(nextZoom);
    setViewportCenter(
      clampViewportCenter(
        {
          x: worldX - (pointerX - 50) / nextZoom,
          y: worldY - (pointerY - 50) / nextZoom,
        },
        nextZoom
      )
    );
  };

  const handleMinimapPointerDown = (event) => {
    event.stopPropagation();
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setViewportCenter(clampViewportCenter({ x, y }, zoom));
  };

  const radialAnchorFromPointer = (clientX, clientY) => {
    if (!stageRef.current) return { x: 50, y: 50 };
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 50, y: 50 };
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 4, 96),
    };
  };

  const radialAnchorFromNode = (x, y) => ({
    x: clamp(50 + (x - viewportCenter.x) * zoom, 6, 94),
    y: clamp(50 + (y - viewportCenter.y) * zoom, 6, 94),
  });

  const handleKeyDown = (event) => {
    if (drawMode === 'path' && event.key === 'Enter') {
      // Complete path
      if (pathPointsRef.current.length >= 2) {
        collaboration.addElement({
          type: 'path',
          data: {
            points: [...pathPointsRef.current],
            stroke: 'rgba(251, 191, 36, 0.8)',
            strokeWidth: 0.3,
          },
        });
      }
      pathPointsRef.current = [];
      setDrawingPreview(null);
      setDrawMode(null);
    } else if (drawMode && event.key === 'Escape') {
      // Cancel drawing
      drawStartRef.current = null;
      pathPointsRef.current = [];
      setDrawingPreview(null);
      setDrawMode(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawMode, collaboration]);

  return (
    <div
      ref={stageRef}
      className={`h-full min-h-[280px] rounded border border-zinc-800 bg-zinc-950/60 relative overflow-hidden nexus-map-stage ${
        isDragging ? 'cursor-grabbing' : drawMode ? 'cursor-crosshair' : 'cursor-grab'
      }`}
      data-dragging={isDragging ? 'true' : 'false'}
      onClick={(e) => {
        if (!drawMode) onClearRadial();
      }}
      onDoubleClick={() => {
        if (!drawMode) {
          setZoom(1);
          setViewportCenter({ x: 50, y: 50 });
        }
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsPointerActive(true)}
      onPointerLeave={(event) => {
        setIsPointerActive(false);
        handlePointerUp(event);
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="zone-contested-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(201,152,96,0.3)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="rgba(5, 10, 13, 0.94)" />
        <g transform={mapTransform}>
          {orbitalRings.map((ring) => (
            <circle
              key={ring.id}
              cx={ring.x}
              cy={ring.y}
              r={ring.radius}
              fill="none"
              stroke="rgba(132, 201, 162, 0.2)"
              strokeWidth={0.18}
              strokeDasharray={ring.dashed ? '1.1 1' : undefined}
            />
          ))}

        {visibleEdges.map((edge) => {
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
              stroke={
                edge.risk === 'high'
                  ? 'rgba(214,83,64,0.54)'
                  : edge.risk === 'medium'
                    ? 'rgba(201,161,94,0.42)'
                    : 'rgba(118, 198, 158, 0.28)'
              }
              strokeWidth={edge.kind === 'jump' ? 0.28 : 0.14}
              strokeDasharray={edge.kind === 'jump' ? '1.1 0.8' : '0.8 1.1'}
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
                    r={anchorNode.radius + (entry.isFocus ? 2.2 : 1.4)}
                    fill="none"
                    stroke={entry.isFocus ? 'rgba(132, 214, 172, 0.9)' : 'rgba(118, 152, 136, 0.38)'}
                    strokeWidth={entry.isFocus ? 0.72 : 0.46}
                    strokeDasharray={entry.isFocus ? '1.8 1' : '1.2 1.2'}
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
              const radius = anchorNode.radius + 4 + confidence * 5.2;
              const contested = zone.contestationLevel >= 0.45;
              const controllers = zone.assertedControllers.slice(0, 2);
              return (
                <g
                  key={zone.id}
                  data-map-interactive="true"
                  tabIndex={0}
                  role="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectZone(zone.id);
                    onSetActiveRadial({
                      type: 'zone',
                      title: 'Control Zone',
                      anchor: radialAnchorFromPointer(event.clientX, event.clientY),
                      zoneId: zone.id,
                      nodeId: anchorNode.id,
                    });
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectZone(zone.id);
                    onSetActiveRadial({
                      type: 'zone',
                      title: 'Control Zone',
                      anchor: radialAnchorFromPointer(event.clientX, event.clientY),
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
                      anchor: radialAnchorFromNode(anchorNode.x, anchorNode.y),
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
                      strokeWidth={0.52 + zone.contestationLevel * 0.56}
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
                        strokeWidth={0.45 + controller.confidence * 0.5}
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
                  stroke={isDegraded ? 'rgba(201,161,94,0.6)' : 'rgba(118,198,162,0.52)'}
                  strokeWidth={isDegraded ? 0.34 : 0.28}
                  strokeDasharray={isDegraded ? '1 1' : '1.2 1'}
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
                    r={Math.max(0.58, Math.min(1.3, 0.56 + net.participants * 0.08))}
                    fill={color}
                    fillOpacity={net.speaking > 0 ? 0.42 : 0.22}
                    stroke={color}
                    strokeWidth={net.speaking > 0 ? 0.64 : 0.36}
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
              const x = anchorNet ? anchorNet.x + (((index % 2) * 2) - 1) * 0.8 : node.x + (((index % 3) - 1) * 0.9);
              const y = anchorNet ? anchorNet.y - 1.7 : node.y - node.radius - 1.8 - (index % 2) * 0.6;
              const color = commsPriorityColor(callout.priority);
              const opacity = callout.stale ? 0.44 : 0.92;
              return (
                <g key={`comms-callout:${callout.id}`} opacity={opacity}>
                  <polygon
                    points={`${x},${y - 0.9} ${x + 0.84},${y + 0.72} ${x - 0.84},${y + 0.72}`}
                    fill="rgba(17,13,11,0.9)"
                    stroke={color}
                    strokeWidth={0.34}
                  />
                  <circle cx={x} cy={y + 0.18} r={0.24} fill={color} />
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
              const offset = ((index % 3) - 1) * 0.24;
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
                    strokeWidth={lane.laneKind === 'EXTRACT' ? 0.54 : 0.38}
                    strokeDasharray={lane.laneKind === 'HOLD' ? '1 1' : lane.laneKind === 'ROUTE_HYPOTHESIS' ? '1.4 1' : '1.6 1'}
                  />
                  <circle cx={x2} cy={y2} r={0.34} fill={color} />
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
              data-map-interactive="true"
              tabIndex={0}
              role="button"
              onClick={(event) => {
                event.stopPropagation();
                onSetActiveRadial({
                  type: 'node',
                  title: node.label,
                  anchor: radialAnchorFromPointer(event.clientX, event.clientY),
                  nodeId: node.id,
                });
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSetActiveRadial({
                  type: 'node',
                  title: node.label,
                  anchor: radialAnchorFromPointer(event.clientX, event.clientY),
                  nodeId: node.id,
                });
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSetActiveRadial({
                  type: 'node',
                  title: node.label,
                  anchor: radialAnchorFromNode(node.x, node.y),
                  nodeId: node.id,
                });
              }}
              style={{ cursor: 'pointer' }}
            >
              {isSystem ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 1.8}
                  fill="none"
                  stroke="rgba(218, 191, 112, 0.36)"
                  strokeWidth={0.34}
                />
              ) : null}
              {selectedNodeId === node.id ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + 1.1}
                  fill="none"
                  stroke="rgba(182, 239, 211, 0.86)"
                  strokeWidth={0.26}
                  strokeDasharray="1.2 0.9"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={nodeFillColor(node.category, isSystem)}
                stroke={nodeStrokeColor(node.category, isSystem)}
                strokeWidth={isSystem ? 0.92 : isOm ? 0.26 : isStation ? 0.38 : 0.46}
                opacity={isOm ? 0.7 : 1}
              />
              <TacticalNodeGlyph
                category={node.category}
                kind={node.kind}
                x={node.x}
                y={node.y}
                radius={node.radius}
                selected={selectedNodeId === node.id}
              />
              {shouldRenderLabel(node, mapViewMode, selectedNodeId) ? (
                <text
                  x={node.x}
                  y={node.y + node.radius + (isOm ? 1.2 : 1.9)}
                  textAnchor="middle"
                  style={{
                    fill: isOm ? 'rgba(170,198,184,0.72)' : 'rgba(215,242,227,0.88)',
                    fontSize: isSystem ? '2.2px' : isOm ? '1px' : isLagrange ? '1.2px' : '1.46px',
                    letterSpacing: isOm ? '0.12px' : '0.2px',
                    textTransform: 'uppercase',
                  }}
                >
                  {labelText}
                </text>
              ) : null}
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
                  <circle cx={x} cy={y} r={0.9} fill={stateColor(entry.displayState)} stroke={confidenceColor(entry.confidenceBand)} strokeWidth={0.28} />
                  <text
                    x={x + 1.8}
                    y={y + 0.34}
                    style={{
                      fill: 'rgba(220,240,226,0.88)',
                      fontSize: '1.25px',
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
                  data-map-interactive="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectIntel(intel.id);
                    onSetActiveRadial({
                      type: 'intel',
                      title: intel.type,
                      anchor: radialAnchorFromPointer(event.clientX, event.clientY),
                      intelId: intel.id,
                      nodeId: intel.anchor.nodeId,
                    });
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectIntel(intel.id);
                    onSetActiveRadial({
                      type: 'intel',
                      title: intel.type,
                      anchor: radialAnchorFromPointer(event.clientX, event.clientY),
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
                      anchor: radialAnchorFromNode(x, y),
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

        {/* Collaborative drawn elements */}
        <MapDrawingLayer 
          elements={collaboration.elements}
          mapTransform=""
          onSelectElement={setSelectedElementId}
        />

        {/* Drawing preview */}
        {drawingPreview && drawingPreview.type === 'zone' && (
          <circle
            cx={drawingPreview.cx}
            cy={drawingPreview.cy}
            r={drawingPreview.radius}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth={0.3}
            strokeDasharray="1 1"
          />
        )}
        {drawingPreview && drawingPreview.type === 'path' && drawingPreview.points?.length > 0 && (
          <path
            d={drawingPreview.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(251, 191, 36, 0.6)"
            strokeWidth={0.25}
            strokeDasharray="0.8 0.8"
          />
        )}

        {/* Collaborative cursors */}
        <MapCollaborativeCursors
          participants={collaboration.participants}
          currentUserId={actorId}
          mapTransform=""
        />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 nexus-map-crt-overlay" />
      <div className="pointer-events-none absolute inset-0 nexus-map-noise-overlay" />

      <MapDrawingTools
        drawMode={drawMode}
        onChangeDrawMode={setDrawMode}
        onSaveLayout={() => {
          const code = collaboration.exportLayout();
          if (code) {
            navigator.clipboard.writeText(code);
            alert('Map layout copied to clipboard!');
          }
        }}
        onShareLayout={() => setShareDialogOpen(true)}
        onImportLayout={() => setShareDialogOpen(true)}
        onClearElements={() => {
          if (confirm('Clear all drawn elements?')) {
            collaboration.clearAllElements();
          }
        }}
        elementCount={collaboration.elements.length}
        sessionActive={Boolean(collaboration.session)}
        participants={collaboration.participants}
      />

      <MapShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        layoutCode={collaboration.exportLayout()}
        onImport={(code) => {
          collaboration.importLayout(code);
          setShareDialogOpen(false);
        }}
        elementCount={collaboration.elements.length}
      />

      <div className="absolute top-3 left-3 nexus-map-hud-panel text-[11px] z-[12]">
        <div className="nexus-map-hud-title">Stanton Tactical Ops</div>
        <div className="nexus-map-hud-row">
          <span>Grid</span>
          <strong>{mapViewMode}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>Selection</span>
          <strong className="truncate">{selectedNodeLabel || 'None'}</strong>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-[12]">
        <button
          type="button"
          className="nexus-map-zoom-btn"
          onClick={(event) => {
            event.stopPropagation();
            updateZoom((prev) => prev + 0.15);
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
            updateZoom((prev) => prev - 0.15);
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
            setViewportCenter({ x: 50, y: 50 });
          }}
          title="Reset zoom"
        >
          R
        </button>
      </div>

      <div className="absolute bottom-[7.25rem] left-3 nexus-map-hud-panel nexus-map-minimap-panel z-[12]">
        <div className="nexus-map-hud-title">Minimap</div>
        <div
          ref={minimapRef}
          className="nexus-map-minimap"
          onPointerDown={handleMinimapPointerDown}
          title="Click to recenter map viewport"
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <rect x="0" y="0" width="100" height="100" fill="rgba(5, 12, 12, 0.92)" />
            {minimapNodes.map((node) => (
              <circle
                key={`mini:${node.id}`}
                cx={node.x}
                cy={node.y}
                r={node.kind === 'system' ? 1.2 : 0.65}
                fill={node.id === selectedNodeId ? 'rgba(196, 244, 218, 0.92)' : 'rgba(142, 206, 172, 0.6)'}
                stroke="rgba(60, 108, 88, 0.86)"
                strokeWidth={0.18}
              />
            ))}
            <rect
              x={viewportWindow.x}
              y={viewportWindow.y}
              width={viewportWindow.width}
              height={viewportWindow.height}
              fill="rgba(182, 239, 211, 0.08)"
              stroke="rgba(182, 239, 211, 0.7)"
              strokeWidth={0.34}
            />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 nexus-map-hud-panel text-[11px] z-[12]">
        <div className="nexus-map-hud-title">Cursor Position</div>
        <div className="nexus-map-hud-row">
          <span>Cursor</span>
          <strong>{isPointerActive ? `${cursorCoords.x.toFixed(2)} / ${cursorCoords.y.toFixed(2)}` : '-- / --'}</strong>
        </div>
        <div className="nexus-map-hud-row">
          <span>Nodes</span>
          <strong>{visibleMapNodes.length}</strong>
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