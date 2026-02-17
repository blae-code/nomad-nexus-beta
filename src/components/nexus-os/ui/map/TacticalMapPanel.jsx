import React, { useEffect, useMemo, useRef, useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import AIFeatureToggle from '@/components/ai/AIFeatureToggle';
import type { LocationEstimate, VisibilityScope } from '../../schemas/coreSchemas';
import type { IntelStratum, IntentDraftKind } from '../../schemas/intelSchemas';
import type {
  ControlSignal,
  MapLayerState,
  TacticalLayerId,
  TacticalMapDockId,
  TacticalMapMode,
} from '../../schemas/mapSchemas';
import { getRenderableLocationEstimates } from '../../services/locationEstimateService';
import {
  buildMapCommsOverlay,
  createEmptyMapCommsOverlay,
  extractCommsTopologySnapshot,
  type CommsPriority,
  type MapCommsOverlay,
  type MapCommsOverlayNet,
} from '../../services/mapCommsOverlayService';
import { buildMapAiPrompt, computeMapInference } from '../../services/mapInferenceService';
import { applyTTLDecay, computeControlZones } from '../../services/controlZoneService';
import {
  addComment,
  listIntelComments,
  listIntelObjects,
  subscribeIntelObjects,
} from '../../services/intelService';
import {
  cancelDraft,
  confirmDraft,
  createDraft,
  listDrafts,
  subscribeIntentDrafts,
  updateDraft,
} from '../../services/intentDraftService';
import {
  buildMapLogisticsOverlay,
  type MapLogisticsLane,
} from '../../services/mapLogisticsOverlayService';
import {
  buildMapCommandSurface,
  type MapCommandAlert,
  type TacticalMacroId,
} from '../../services/mapCommandSurfaceService';
import { buildMapTimelineSnapshot } from '../../services/mapTimelineService';
import {
  loadTacticalMapPreferences,
  mapModeLayerDefaults,
  saveTacticalMapPreferences,
} from '../../services/tacticalMapPreferenceService';
import {
  getMapCommandSurfaceRetryDelayMs,
  isMapCommandSurfaceV2Enabled,
} from '../../services/tacticalMapFeatureFlagService';
import {
  resolveTacticalMapDefaultMode,
  tacticalMapDockIdsForMode,
  resolveTacticalMapShortcut,
} from '../../services/tacticalMapInteractionService';
import { useRenderProfiler } from '../../diagnostics';
import { useReducedMotion } from '../motion';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import IntelDetailPanel from './IntelDetailPanel';
import IntentDraftPanel from './IntentDraftPanel';
import type { RadialMenuItem } from './RadialMenu';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODE_BY_ID, TACTICAL_MAP_NODES, findMapNodeForLocation } from './mapBoard';
import type { MapCommsAnchor, MapRadialState, OpsOverlayNode, RenderablePresence, TacticalMapViewMode } from './mapTypes';
import MapCommandStrip from './MapCommandStrip';
import MapStageCanvas from './MapStageCanvas';
import MapDock, { type MapDockTab } from './MapDock';
import MapActionQueue from './MapActionQueue';
import MapTimelineReplay from './MapTimelineReplay';

interface TacticalMapPanelProps extends Partial<CqbPanelSharedProps> {
  locationEstimates?: LocationEstimate[];
  controlSignals?: ControlSignal[];
  viewerScope?: VisibilityScope;
  onOpenMapFocus?: () => void;
  compact?: boolean;
}

interface CommsOverlayState {
  loading: boolean;
  error: string | null;
  overlay: MapCommsOverlay;
}

const DEFAULT_VISIBLE_STRATA: Readonly<Record<IntelStratum, boolean>> = Object.freeze({
  PERSONAL: true,
  SHARED_COMMONS: true,
  OPERATIONAL: false,
  COMMAND_ASSESSED: false,
});

const SUMMARY_PAGE_SIZE = 4;

function createLayerState(defaults: Partial<Record<TacticalLayerId, boolean>>): MapLayerState[] {
  return [
    { id: 'presence', enabled: defaults.presence !== false },
    { id: 'controlZones', enabled: defaults.controlZones !== false },
    { id: 'ops', enabled: defaults.ops !== false },
    { id: 'intel', enabled: defaults.intel === true },
    { id: 'comms', enabled: defaults.comms === true },
    { id: 'logistics', enabled: defaults.logistics === true },
  ];
}

function mapPresence(estimates: LocationEstimate[], viewerScope: VisibilityScope): RenderablePresence[] {
  const renderable = getRenderableLocationEstimates(estimates, { viewerScope, includeStale: true });
  return renderable
    .map((estimate) => {
      const node = findMapNodeForLocation(estimate.bestGuessLocation);
      if (!node) return null;
      return {
        id: `presence:${estimate.subjectId}:${estimate.updatedAt}`,
        nodeId: node.id,
        subjectId: estimate.subjectId,
        displayState: estimate.displayState,
        confidenceBand: estimate.confidenceBand,
        confidence: estimate.confidence,
        ageSeconds: estimate.ageSeconds,
        ttlRemainingSeconds: estimate.ttlRemainingSeconds,
        sourceType: estimate.primarySourceType,
      };
    })
    .filter(Boolean) as RenderablePresence[];
}

function formatAge(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}m ${remainder}s`;
}

function commsPriorityRank(priority: CommsPriority): number {
  if (priority === 'CRITICAL') return 3;
  if (priority === 'HIGH') return 2;
  return 1;
}

function commsPriorityColor(priority: CommsPriority): string {
  if (priority === 'CRITICAL') return 'rgba(214, 83, 64, 0.92)';
  if (priority === 'HIGH') return 'rgba(201, 161, 94, 0.9)';
  return 'rgba(118, 172, 214, 0.84)';
}

function commsPriorityTone(priority: CommsPriority): 'danger' | 'warning' | 'active' {
  if (priority === 'CRITICAL') return 'danger';
  if (priority === 'HIGH') return 'warning';
  return 'active';
}

function commsQualityTone(quality: MapCommsOverlayNet['quality']): 'ok' | 'warning' | 'danger' {
  if (quality === 'CONTESTED') return 'danger';
  if (quality === 'DEGRADED') return 'warning';
  return 'ok';
}

function logisticsLaneTone(lane: MapLogisticsLane): 'ok' | 'warning' | 'neutral' {
  if (lane.stale) return 'neutral';
  if (lane.laneKind === 'AVOID') return 'warning';
  if (lane.laneKind === 'EXTRACT') return 'ok';
  return 'warning';
}

function signalWeightLabel(signal: ControlSignal, nowMs: number): string {
  const decayed = applyTTLDecay(signal, nowMs);
  if (decayed <= 0) return 'STALE';
  return `${Math.round(decayed * 100)}%`;
}

function getErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || '';
  const candidate = (error as any)?.message;
  return typeof candidate === 'string' ? candidate : '';
}

function isFormTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const node = target as HTMLElement;
  const tag = String((node as any).tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean((node as any).isContentEditable);
}

export default function TacticalMapPanel({
  locationEstimates = [],
  controlSignals = [],
  viewerScope = 'ORG',
  onOpenMapFocus,
  compact = false,
  actorId = 'ce-warden',
  bridgeId,
  opId,
  operations = [],
  focusOperationId,
  onOpenCommsWorkspace,
  onOpenOperationFocus,
}: TacticalMapPanelProps) {
  const { aiFeaturesEnabled } = useAuth();
  const aiEnabled = aiFeaturesEnabled !== false;
  useRenderProfiler('TacticalMapPanel');
  const reducedMotion = useReducedMotion();
  const commandSurfaceV2Enabled = isMapCommandSurfaceV2Enabled();

  const initialMode = resolveTacticalMapDefaultMode(bridgeId);
  const [mapMode, setMapMode] = useState<TacticalMapMode>(initialMode);
  const [layers, setLayers] = useState<MapLayerState[]>(() => createLayerState(mapModeLayerDefaults(initialMode)));
  const [activeDockId, setActiveDockId] = useState<TacticalMapDockId>(tacticalMapDockIdsForMode(initialMode)[0]);
  const [visibleStrata, setVisibleStrata] = useState<Record<IntelStratum, boolean>>({ ...DEFAULT_VISIBLE_STRATA });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [activeRadial, setActiveRadial] = useState<MapRadialState | null>(null);
  const [intelVersion, setIntelVersion] = useState(0);
  const [draftVersion, setDraftVersion] = useState(0);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [commsPriorityFloor, setCommsPriorityFloor] = useState<CommsPriority>('STANDARD');
  const [showCommsLinks, setShowCommsLinks] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showLagrange, setShowLagrange] = useState(false);
  const [showOmMarkers, setShowOmMarkers] = useState(false);
  const [aiInferenceLoading, setAiInferenceLoading] = useState(false);
  const [aiInferenceText, setAiInferenceText] = useState('');
  const [aiInferenceError, setAiInferenceError] = useState<string | null>(null);
  const [replayWindowMinutes, setReplayWindowMinutes] = useState(30);
  const [replayOffsetMinutes, setReplayOffsetMinutes] = useState(0);
  const [mapViewMode, setMapViewMode] = useState<TacticalMapViewMode>('SYSTEM');
  const [busyMacroId, setBusyMacroId] = useState<TacticalMacroId | null>(null);
  const [macroExecutionMessage, setMacroExecutionMessage] = useState<string | null>(null);
  const [macroExecutionError, setMacroExecutionError] = useState<string | null>(null);
  const [remoteMapAlerts, setRemoteMapAlerts] = useState<MapCommandAlert[]>([]);
  const [commsDegraded, setCommsDegraded] = useState(false);
  const [commsRetryDelayMs, setCommsRetryDelayMs] = useState(20_000);
  const [commsRefreshNonce, setCommsRefreshNonce] = useState(0);
  const [quickBroadcastMessage, setQuickBroadcastMessage] = useState('');
  const [quickBroadcastPriority, setQuickBroadcastPriority] = useState<CommsPriority>('STANDARD');
  const [quickBroadcastBusy, setQuickBroadcastBusy] = useState(false);
  const [quickBroadcastError, setQuickBroadcastError] = useState<string | null>(null);
  const [summaryOrdersPage, setSummaryOrdersPage] = useState(0);
  const [summaryCommsPage, setSummaryCommsPage] = useState(0);
  const commsRetryDelayRef = useRef(20_000);

  const scopedCommsOpId = focusOperationId || opId || '';
  const [commsState, setCommsState] = useState<CommsOverlayState>({
    loading: true,
    error: null,
    overlay: createEmptyMapCommsOverlay(scopedCommsOpId),
  });

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeIntel = subscribeIntelObjects(() => setIntelVersion((prev) => prev + 1));
    const unsubscribeDrafts = subscribeIntentDrafts(() => setDraftVersion((prev) => prev + 1));
    return () => {
      unsubscribeIntel();
      unsubscribeDrafts();
    };
  }, []);

  useEffect(() => {
    const prefs = loadTacticalMapPreferences({ actorId, bridgeId, opId: scopedCommsOpId || undefined });
    setMapMode(prefs.mode);
    setLayers(createLayerState(prefs.layerDefaults));
    setActiveDockId(
      tacticalMapDockIdsForMode(prefs.mode).includes(prefs.dockId)
        ? prefs.dockId
        : tacticalMapDockIdsForMode(prefs.mode)[0]
    );
    setShowStations(Boolean(prefs.mapDetail.showStations));
    setShowLagrange(Boolean(prefs.mapDetail.showLagrange));
    setShowOmMarkers(Boolean(prefs.mapDetail.showOmMarkers));
  }, [actorId, bridgeId, scopedCommsOpId]);

  useEffect(() => {
    saveTacticalMapPreferences(
      { actorId, bridgeId, opId: scopedCommsOpId || undefined },
      {
        mode: mapMode,
        dockId: activeDockId,
        layerDefaults: layers.reduce<Partial<Record<TacticalLayerId, boolean>>>((acc, layer) => {
          acc[layer.id] = layer.enabled;
          return acc;
        }, {}),
        mapDetail: { showStations, showLagrange, showOmMarkers },
      }
    );
  }, [actorId, bridgeId, scopedCommsOpId, mapMode, activeDockId, layers, showStations, showLagrange, showOmMarkers]);

  const operationMapSignature = useMemo(
    () => operations.map((entry) => `${entry.id}:${entry.ao?.nodeId || ''}:${entry.updatedAt || ''}`).sort().join('|'),
    [operations]
  );

  useEffect(() => {
    let active = true;
    let timerId = 0;

    const scheduleNext = (delayMs: number) => {
      window.clearTimeout(timerId);
      if (!active) return;
      timerId = window.setTimeout(() => {
        void loadComms();
      }, delayMs);
    };

    const loadComms = async () => {
      setCommsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        let response: any;
        let usedFallback = false;

        if (commandSurfaceV2Enabled) {
          try {
            response = await invokeMemberFunction('updateCommsConsole', {
              action: 'get_map_command_surface',
              eventId: scopedCommsOpId || undefined,
              includeGlobal: !scopedCommsOpId,
              limit: 160,
            });
          } catch {
            usedFallback = true;
            response = await invokeMemberFunction('updateCommsConsole', {
              action: 'get_comms_topology_snapshot',
              eventId: scopedCommsOpId || undefined,
              includeGlobal: !scopedCommsOpId,
              limit: 160,
            });
          }
        } else {
          response = await invokeMemberFunction('updateCommsConsole', {
            action: 'get_comms_topology_snapshot',
            eventId: scopedCommsOpId || undefined,
            includeGlobal: !scopedCommsOpId,
            limit: 160,
          });
        }
        if (!active) return;
        const topology = extractCommsTopologySnapshot(response);
        const overlay = buildMapCommsOverlay({
          topology,
          opId,
          focusOperationId,
          operations,
          mapNodes: TACTICAL_MAP_NODES,
          nowMs: Date.now(),
        });
        const alertsRaw = Array.isArray(response?.actionable_alerts) ? response.actionable_alerts : [];
        setRemoteMapAlerts(
          alertsRaw
            .map((entry: any) => ({
              id: String(entry?.id || ''),
              level: String(entry?.level || 'LOW').toUpperCase() === 'HIGH'
                ? 'HIGH'
                : String(entry?.level || 'LOW').toUpperCase() === 'MED'
                  ? 'MED'
                  : 'LOW',
              title: String(entry?.title || 'Map alert'),
              detail: String(entry?.detail || ''),
              source: 'comms' as const,
            }))
            .filter((entry: MapCommandAlert) => Boolean(entry.id && entry.title))
        );
        if (!commandSurfaceV2Enabled) {
          setRemoteMapAlerts([]);
        }
        commsRetryDelayRef.current = 20_000;
        setCommsRetryDelayMs(commsRetryDelayRef.current);
        setCommsDegraded(usedFallback);
        setCommsState({
          loading: false,
          error: usedFallback
            ? 'Comms command surface unavailable; running legacy topology snapshot.'
            : null,
          overlay,
        });
        scheduleNext(commsRetryDelayRef.current);
      } catch (error: unknown) {
        if (!active) return;
        const errorText = getErrorText(error) || 'Comms topology unavailable.';
        const unavailable = /404|not found|unavailable|5\d\d|timeout/i.test(errorText);
        commsRetryDelayRef.current = getMapCommandSurfaceRetryDelayMs(commsRetryDelayRef.current);
        setCommsRetryDelayMs(commsRetryDelayRef.current);
        setCommsDegraded(true);
        setCommsState((prev) => ({
          loading: false,
          error: unavailable
            ? 'Comms surface degraded; tactical map is running from cached overlays.'
            : errorText,
          overlay: prev.overlay,
        }));
        scheduleNext(commsRetryDelayRef.current);
      }
    };

    void loadComms();
    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [scopedCommsOpId, opId, focusOperationId, operationMapSignature, commandSurfaceV2Enabled, commsRefreshNonce]);

  const presence = useMemo(() => mapPresence(locationEstimates, viewerScope), [locationEstimates, viewerScope]);
  const controlZones = useMemo(() => {
    try {
      return computeControlZones(controlSignals, nowMs);
    } catch {
      return [];
    }
  }, [controlSignals, nowMs]);
  const intelObjects = useMemo(
    () =>
      listIntelObjects(
        { viewerId: actorId, includeScopes: ['PERSONAL', 'ORG', 'OP'], activeOpId: opId, includeRetired: false, includeStale: true },
        nowMs
      ),
    [intelVersion, actorId, opId, nowMs]
  );

  const activeDraft = useMemo(() => listDrafts({ createdBy: actorId, status: 'DRAFT' })[0] || null, [draftVersion, actorId]);
  const selectedZone = useMemo(() => {
    if (!controlZones.length) return null;
    if (!selectedZoneId) return controlZones[0];
    return controlZones.find((zone) => zone.id === selectedZoneId) || controlZones[0];
  }, [controlZones, selectedZoneId]);
  const selectedIntel = useMemo(() => {
    if (!intelObjects.length) return null;
    if (!selectedIntelId) return intelObjects[0];
    return intelObjects.find((entry) => entry.id === selectedIntelId) || intelObjects[0];
  }, [intelObjects, selectedIntelId]);
  const selectedIntelComments = useMemo(() => (selectedIntel ? listIntelComments(selectedIntel.id) : []), [selectedIntel, intelVersion]);

  const layerEnabled = (id: TacticalLayerId) => layers.find((entry) => entry.id === id)?.enabled === true;

  const opsOverlay = useMemo<OpsOverlayNode[]>(
    () =>
      operations
        .map((operation) => ({
          id: operation.id,
          title: operation.name,
          nodeId: operation.ao?.nodeId || '',
          isFocus: operation.id === focusOperationId,
          posture: operation.posture,
          status: operation.status,
        }))
        .filter((entry) => Boolean(entry.nodeId && TACTICAL_MAP_NODE_BY_ID[entry.nodeId])),
    [operations, focusOperationId]
  );

  const commsOverlay = commsState.overlay;
  const logisticsOverlay = useMemo(
    () => buildMapLogisticsOverlay({ opId, focusOperationId, operations, mapNodes: TACTICAL_MAP_NODES, nowMs }),
    [opId, focusOperationId, operations, nowMs]
  );
  const visibleIntel = useMemo(() => (layerEnabled('intel') ? intelObjects.filter((intel) => visibleStrata[intel.stratum]) : []), [intelObjects, visibleStrata, layers]);
  const visibleCommsCallouts = useMemo(
    () => commsOverlay.callouts.filter((callout) => commsPriorityRank(callout.priority) >= commsPriorityRank(commsPriorityFloor)),
    [commsOverlay.callouts, commsPriorityFloor]
  );
  const visibleCommsLinks = useMemo(() => (showCommsLinks ? commsOverlay.links : []), [showCommsLinks, commsOverlay.links]);
  const commsAnchors = useMemo(() => {
    const byNetId: Record<string, MapCommsAnchor> = {};
    const netsByNode = commsOverlay.nets.reduce<Record<string, MapCommsOverlayNet[]>>((acc, net) => {
      if (!acc[net.nodeId]) acc[net.nodeId] = [];
      acc[net.nodeId].push(net);
      return acc;
    }, {});
    for (const [nodeId, netsAtNode] of Object.entries(netsByNode)) {
      const anchorNode = TACTICAL_MAP_NODE_BY_ID[nodeId];
      if (!anchorNode) continue;
      netsAtNode.forEach((net, index) => {
        const orbitRadius = anchorNode.radius + 2.4 + Math.min(3.2, netsAtNode.length * 0.5);
        const angle = (Math.PI * 2 * index) / Math.max(1, netsAtNode.length);
        byNetId[net.id] = { x: anchorNode.x + Math.cos(angle) * orbitRadius, y: anchorNode.y + Math.sin(angle) * orbitRadius, nodeId };
      });
    }
    return byNetId;
  }, [commsOverlay.nets]);

  const visibleMapNodes = useMemo(() => {
    const s = mapMode === 'ESSENTIAL' ? false : showStations;
    const l = mapMode === 'ESSENTIAL' ? false : showLagrange;
    const o = mapMode === 'ESSENTIAL' ? false : showOmMarkers;
    return TACTICAL_MAP_NODES.filter((node) => {
      if (node.category === 'station') return s;
      if (node.category === 'lagrange') return l;
      if (node.category === 'orbital-marker') return o;
      return true;
    });
  }, [mapMode, showStations, showLagrange, showOmMarkers]);
  const priorityNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of presence) ids.add(entry.nodeId);
    for (const entry of visibleIntel) ids.add(entry.anchor.nodeId);
    for (const zone of controlZones) {
      if (zone.geometryHint.nodeId) ids.add(zone.geometryHint.nodeId);
    }
    for (const entry of opsOverlay) ids.add(entry.nodeId);
    for (const net of commsOverlay.nets) ids.add(net.nodeId);
    for (const lane of logisticsOverlay.lanes) {
      ids.add(lane.fromNodeId);
      ids.add(lane.toNodeId);
    }
    return ids;
  }, [presence, visibleIntel, controlZones, opsOverlay, commsOverlay.nets, logisticsOverlay.lanes]);

  const selectedNode = useMemo(() => {
    if (activeRadial?.nodeId && TACTICAL_MAP_NODE_BY_ID[activeRadial.nodeId]) {
      return TACTICAL_MAP_NODE_BY_ID[activeRadial.nodeId];
    }
    if (selectedIntel?.anchor?.nodeId && TACTICAL_MAP_NODE_BY_ID[selectedIntel.anchor.nodeId]) {
      return TACTICAL_MAP_NODE_BY_ID[selectedIntel.anchor.nodeId];
    }
    if (selectedZone?.geometryHint?.nodeId && TACTICAL_MAP_NODE_BY_ID[selectedZone.geometryHint.nodeId]) {
      return TACTICAL_MAP_NODE_BY_ID[selectedZone.geometryHint.nodeId];
    }
    return visibleMapNodes.find((node) => node.id === 'system-stanton') || visibleMapNodes[0] || null;
  }, [activeRadial, selectedIntel, selectedZone, visibleMapNodes]);

  const stageVisibleNodes = useMemo(() => {
    if (!selectedNode) return visibleMapNodes;
    if (mapViewMode === 'SYSTEM') {
      const focusSystemTag = selectedNode.systemTag;
      const focusSystemId = `system-${focusSystemTag.toLowerCase()}`;
      const adjacentSystems = new Set<string>([focusSystemId]);
      for (const edge of TACTICAL_MAP_EDGES) {
        if (edge.kind !== 'jump') continue;
        if (edge.fromNodeId === focusSystemId) adjacentSystems.add(edge.toNodeId);
        if (edge.toNodeId === focusSystemId) adjacentSystems.add(edge.fromNodeId);
      }
      return visibleMapNodes.filter((node) => {
        if (node.systemTag === focusSystemTag) {
          return node.kind === 'system' || node.category === 'planet' || priorityNodeIds.has(node.id);
        }
        if (node.kind === 'system') return adjacentSystems.has(node.id);
        return false;
      });
    }
    if (mapViewMode === 'PLANETARY') {
      return visibleMapNodes.filter(
        (node) =>
          node.systemTag === selectedNode.systemTag ||
          node.id === selectedNode.id ||
          (priorityNodeIds.has(node.id) && node.systemTag === selectedNode.systemTag)
      );
    }
    const distanceMax = 14;
    return visibleMapNodes.filter((node) => {
      if (node.id === selectedNode.id) return true;
      if (node.parentId === selectedNode.id || selectedNode.parentId === node.id) return true;
      if (priorityNodeIds.has(node.id) && node.systemTag === selectedNode.systemTag) return true;
      const dx = node.x - selectedNode.x;
      const dy = node.y - selectedNode.y;
      return Math.sqrt(dx * dx + dy * dy) <= distanceMax;
    });
  }, [mapViewMode, selectedNode, visibleMapNodes, priorityNodeIds]);

  const stageNodeIdSet = useMemo(() => new Set(stageVisibleNodes.map((node) => node.id)), [stageVisibleNodes]);
  const stagePresence = useMemo(
    () =>
      presence
        .filter((entry) => stageNodeIdSet.has(entry.nodeId))
        .sort((a, b) => b.confidence - a.confidence || a.ageSeconds - b.ageSeconds)
        .slice(0, mapViewMode === 'LOCAL' ? 14 : 10),
    [presence, stageNodeIdSet, mapViewMode]
  );
  const stageIntel = useMemo(
    () =>
      visibleIntel
        .filter((entry) => stageNodeIdSet.has(entry.anchor.nodeId))
        .sort((a, b) => {
          if (a.ttl.stale !== b.ttl.stale) return a.ttl.stale ? 1 : -1;
          return b.ttl.decayRatio - a.ttl.decayRatio;
        })
        .slice(0, mapViewMode === 'LOCAL' ? 12 : 8),
    [visibleIntel, stageNodeIdSet, mapViewMode]
  );
  const stageControlZones = useMemo(
    () => controlZones.filter((zone) => (zone.geometryHint.nodeId ? stageNodeIdSet.has(zone.geometryHint.nodeId) : true)),
    [controlZones, stageNodeIdSet]
  );
  const stageOpsOverlay = useMemo(() => opsOverlay.filter((entry) => stageNodeIdSet.has(entry.nodeId)), [opsOverlay, stageNodeIdSet]);
  const stageCommsCallouts = useMemo(
    () =>
      visibleCommsCallouts
        .filter((entry) => stageNodeIdSet.has(entry.nodeId))
        .sort((a, b) => commsPriorityRank(b.priority) - commsPriorityRank(a.priority) || a.ageSeconds - b.ageSeconds)
        .slice(0, mapViewMode === 'LOCAL' ? 10 : 7),
    [visibleCommsCallouts, stageNodeIdSet, mapViewMode]
  );
  const stageCommsLinks = useMemo(() => {
    if (!visibleCommsLinks.length) return [];
    const netNodeById = commsOverlay.nets.reduce<Record<string, string>>((acc, net) => {
      acc[net.id] = net.nodeId;
      return acc;
    }, {});
    return visibleCommsLinks
      .filter((link) => stageNodeIdSet.has(netNodeById[link.fromNetId]) && stageNodeIdSet.has(netNodeById[link.toNetId]))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'degraded' ? -1 : 1))
      .slice(0, mapViewMode === 'LOCAL' ? 16 : 12);
  }, [visibleCommsLinks, commsOverlay.nets, stageNodeIdSet, mapViewMode]);
  const stageCommsNets = useMemo(() => commsOverlay.nets.filter((net) => stageNodeIdSet.has(net.nodeId)), [commsOverlay.nets, stageNodeIdSet]);
  const stageLogisticsOverlay = useMemo(
    () => ({
      ...logisticsOverlay,
      lanes: logisticsOverlay.lanes.filter((lane) => stageNodeIdSet.has(lane.fromNodeId) && stageNodeIdSet.has(lane.toNodeId)).slice(0, mapViewMode === 'LOCAL' ? 10 : 7),
    }),
    [logisticsOverlay, stageNodeIdSet, mapViewMode]
  );
  const mapRosterItems = useMemo(
    () =>
      stagePresence.slice(0, 12).map((entry) => ({
        id: entry.id,
        label: entry.subjectId,
        stateLabel: entry.displayState === 'DECLARED' ? 'DECL' : entry.displayState === 'INFERRED' ? 'INFR' : 'STALE',
        stateTone:
          entry.displayState === 'DECLARED'
            ? ('ok' as const)
            : entry.displayState === 'INFERRED'
              ? ('warning' as const)
              : ('neutral' as const),
        detail: `${entry.nodeId} · ${Math.round(entry.confidence * 100)}% · ${formatAge(entry.ageSeconds)}`,
      })),
    [stagePresence]
  );
  const selectedNodePresenceCount = useMemo(
    () => (selectedNode ? stagePresence.filter((entry) => entry.nodeId === selectedNode.id).length : 0),
    [selectedNode, stagePresence]
  );
  const selectedNodeIntelCount = useMemo(
    () => (selectedNode ? stageIntel.filter((entry) => entry.anchor.nodeId === selectedNode.id).length : 0),
    [selectedNode, stageIntel]
  );
  const selectedNodeCommsCount = useMemo(
    () => (selectedNode ? stageCommsCallouts.filter((entry) => entry.nodeId === selectedNode.id).length : 0),
    [selectedNode, stageCommsCallouts]
  );
  const selectedNodeNetCount = useMemo(
    () => (selectedNode ? stageCommsNets.filter((entry) => entry.nodeId === selectedNode.id).length : 0),
    [selectedNode, stageCommsNets]
  );
  const selectedInfoRows = useMemo(() => {
    if (!selectedNode) return [];
    return [
      { label: 'Type', value: String(selectedNode.category || selectedNode.kind).toUpperCase() },
      { label: 'Name', value: selectedNode.label },
      { label: 'System', value: selectedNode.systemTag },
      { label: 'Coords', value: `${selectedNode.x.toFixed(1)} / ${selectedNode.y.toFixed(1)}` },
      { label: 'Contacts', value: String(selectedNodePresenceCount) },
      { label: 'Comms', value: `${selectedNodeCommsCount} callouts / ${selectedNodeNetCount} nets` },
      { label: 'Intel', value: String(selectedNodeIntelCount) },
      { label: 'View', value: mapViewMode },
    ];
  }, [selectedNode, mapViewMode, selectedNodePresenceCount, selectedNodeCommsCount, selectedNodeNetCount, selectedNodeIntelCount]);

  const mapInference = useMemo(
    () => computeMapInference({ controlZones, commsOverlay, intelObjects: visibleIntel, operations, focusOperationId: focusOperationId || opId || '', nowMs }),
    [controlZones, commsOverlay, visibleIntel, operations, focusOperationId, opId, nowMs]
  );
  const localCommandSurface = useMemo(() => buildMapCommandSurface({ mapInference, commsOverlay, nowMs }), [mapInference, commsOverlay, nowMs]);
  const commandSurfaceAlerts = useMemo(() => [...remoteMapAlerts, ...localCommandSurface.alerts].slice(0, 10), [remoteMapAlerts, localCommandSurface.alerts]);
  const timeline = useMemo(
    () => buildMapTimelineSnapshot({ opId: scopedCommsOpId || undefined, commsOverlay, windowMinutes: replayWindowMinutes, offsetMinutes: replayOffsetMinutes, nowMs }),
    [scopedCommsOpId, commsOverlay, replayWindowMinutes, replayOffsetMinutes, nowMs]
  );
  const summaryOrderPageCount = Math.max(1, Math.ceil(timeline.visibleEntries.length / SUMMARY_PAGE_SIZE));
  const summaryCommsPageCount = Math.max(1, Math.ceil(stageCommsCallouts.length / SUMMARY_PAGE_SIZE));
  const summaryOrders = useMemo(
    () =>
      timeline.visibleEntries.slice(
        summaryOrdersPage * SUMMARY_PAGE_SIZE,
        summaryOrdersPage * SUMMARY_PAGE_SIZE + SUMMARY_PAGE_SIZE
      ),
    [timeline.visibleEntries, summaryOrdersPage]
  );
  const summaryComms = useMemo(
    () =>
      stageCommsCallouts.slice(
        summaryCommsPage * SUMMARY_PAGE_SIZE,
        summaryCommsPage * SUMMARY_PAGE_SIZE + SUMMARY_PAGE_SIZE
      ),
    [stageCommsCallouts, summaryCommsPage]
  );

  useEffect(() => {
    setSummaryOrdersPage((prev) => Math.min(prev, summaryOrderPageCount - 1));
  }, [summaryOrderPageCount]);

  useEffect(() => {
    setSummaryCommsPage((prev) => Math.min(prev, summaryCommsPageCount - 1));
  }, [summaryCommsPageCount]);

  const hasPresence = layerEnabled('presence') && presence.length > 0;
  const hasControl = layerEnabled('controlZones') && controlZones.length > 0;
  const hasIntel = layerEnabled('intel') && visibleIntel.length > 0;
  const hasOps = layerEnabled('ops') && opsOverlay.length > 0;
  const hasComms = layerEnabled('comms') && (commsOverlay.nets.length > 0 || visibleCommsCallouts.length > 0 || visibleCommsLinks.length > 0);
  const hasLogistics = layerEnabled('logistics') && logisticsOverlay.lanes.length > 0;
  const hasAnyOverlay = hasPresence || hasControl || hasIntel || hasOps || hasComms || hasLogistics;
  const activeLayerCount = layers.filter((entry) => entry.enabled).length;

  const intelAvailability = resolveAvailabilityState({ count: layerEnabled('intel') ? visibleIntel.length : undefined, staleCount: visibleIntel.filter((entry) => entry.ttl.stale).length });
  const commsAvailability = resolveAvailabilityState({ loading: commsState.loading, error: commsState.error, count: commsOverlay.nets.length + visibleCommsCallouts.length, staleCount: visibleCommsCallouts.filter((entry) => entry.stale).length });
  const scopeIsGlobal = !scopedCommsOpId;
  const commsStatusTone = commsDegraded ? 'warning' : availabilityTone(commsAvailability);
  const commsStatusLabel = commsDegraded ? 'DEGRADED' : availabilityLabel(commsAvailability);
  const commsStatusCopy = commsDegraded
    ? `${commsState.error || 'Comms surface degraded.'} Retry in ${Math.round(commsRetryDelayMs / 1000)}s.`
    : availabilityCopy(commsAvailability, commsState.error || undefined);
  const logisticsAvailability = resolveAvailabilityState({ count: layerEnabled('logistics') ? logisticsOverlay.lanes.length : undefined, staleCount: logisticsOverlay.lanes.filter((lane) => lane.stale).length });

  const applyMapMode = (nextMode: TacticalMapMode) => {
    setMapMode(nextMode);
    setLayers(createLayerState(mapModeLayerDefaults(nextMode)));
    if (!tacticalMapDockIdsForMode(nextMode).includes(activeDockId)) {
      setActiveDockId(tacticalMapDockIdsForMode(nextMode)[0]);
    }
    if (nextMode === 'ESSENTIAL') {
      setMapViewMode('SYSTEM');
      setShowLagrange(false);
      setShowOmMarkers(false);
    }
  };

  const toggleLayer = (id: TacticalLayerId) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, enabled: !layer.enabled } : layer)));
  };

  const createDraftFromMap = (kind: IntentDraftKind, target: { nodeId?: string; intelId?: string; zoneId?: string }, payload: Record<string, unknown> = {}) => {
    setDraftError(null);
    createDraft({
      kind,
      target,
      payload: { confidence: 'MED', opId: focusOperationId || opId || '', opIds: focusOperationId || opId || '', ...payload },
      createdBy: actorId,
    });
    setDraftVersion((prev) => prev + 1);
    setActiveRadial(null);
  };

  const executeMacro = async (macroId: TacticalMacroId) => {
    if (busyMacroId) return;
    setBusyMacroId(macroId);
    setMacroExecutionError(null);
    setMacroExecutionMessage(null);
    try {
      const response: any = await invokeMemberFunction('updateCommsConsole', {
        action: 'execute_map_command_macro',
        macroId,
        eventId: scopedCommsOpId || undefined,
        netId: commsOverlay.nets[0]?.id || undefined,
        lane: 'COMMAND',
      });
      setMacroExecutionMessage(Array.isArray(response?.effects) ? response.effects.join(' | ') : `Executed ${macroId}.`);
    } catch (error: any) {
      const message = error?.message || 'Macro execution failed.';
      setMacroExecutionError(message);
      if (/permission|403|privilege/i.test(message)) {
        createDraftFromMap('REQUEST_SITREP', { nodeId: TACTICAL_MAP_NODES[0]?.id || 'system-stanton' }, { notes: `Fallback for ${macroId}` });
        setMacroExecutionMessage('Macro denied. Fallback draft created.');
      }
    } finally {
      setBusyMacroId(null);
    }
  };

  const sendQuickBroadcast = async () => {
    const message = quickBroadcastMessage.trim();
    if (!message || quickBroadcastBusy) return;
    setQuickBroadcastBusy(true);
    setQuickBroadcastError(null);
    try {
      await invokeMemberFunction('updateCommsConsole', {
        action: 'issue_priority_callout',
        message,
        priority: quickBroadcastPriority,
        eventId: scopedCommsOpId || undefined,
        lane: 'COMMAND',
        requiresAck: quickBroadcastPriority === 'CRITICAL',
      });
      setQuickBroadcastMessage('');
      setMacroExecutionMessage(`Broadcast transmitted (${quickBroadcastPriority}).`);
      setCommsRefreshNonce((prev) => prev + 1);
    } catch (error: unknown) {
      const message = getErrorText(error) || 'Broadcast failed.';
      setQuickBroadcastError(message);
      if (/permission|403|privilege/i.test(message)) {
        createDraftFromMap('REQUEST_SITREP', { nodeId: selectedNode?.id || 'system-stanton' }, { notes: 'Comms broadcast fallback draft' });
      }
    } finally {
      setQuickBroadcastBusy(false);
    }
  };

  const requestAiInference = async () => {
    if (!aiEnabled) {
      setAiInferenceError('AI features are Disabled for this profile.');
      return;
    }
    setAiInferenceError(null);
    setAiInferenceLoading(true);
    try {
      const response: any = await invokeMemberFunction('commsAssistant', {
        action: 'ask_comms',
        data: { eventId: scopedCommsOpId || null, query: buildMapAiPrompt(mapInference) },
      });
      const answer = response?.data?.answer || response?.data?.response?.answer || response?.data?.summary || response?.data?.response || '';
      setAiInferenceText(String(answer || '').trim() || 'No AI estimate returned for current scoped records.');
    } catch (error: any) {
      setAiInferenceError(error?.message || 'AI estimate unavailable.');
    } finally {
      setAiInferenceLoading(false);
    }
  };

  const addIntelComment = async (intelId: string, body: string) => {
    await addComment(intelId, { by: actorId, body });
    setIntelVersion((prev) => prev + 1);
  };

  const confirmActiveDraft = () => {
    if (!activeDraft) return;
    try {
      confirmDraft(activeDraft.id, Date.now());
      setDraftError(null);
      setDraftVersion((prev) => prev + 1);
      setIntelVersion((prev) => prev + 1);
    } catch (error: any) {
      setDraftError(error?.message || 'Failed to confirm draft');
    }
  };

  const createNodeRadialItems = (nodeId: string): RadialMenuItem[] => [
    { id: 'declare-departing', label: 'Declare Departing', icon: 'depart', shortcut: '1', onSelect: () => createDraftFromMap('DECLARE_DEPARTURE', { nodeId }, { notes: `Departing ${nodeId}` }) },
    { id: 'declare-arriving', label: 'Declare Arriving', icon: 'arrive', shortcut: '2', onSelect: () => createDraftFromMap('DECLARE_ARRIVAL', { nodeId }, { notes: `Arriving ${nodeId}` }) },
    { id: 'report-contact', label: 'Report Contact', icon: 'contact', shortcut: '3', tone: 'warning', onSelect: () => createDraftFromMap('REPORT_CONTACT', { nodeId }, { notes: `Contact near ${nodeId}` }) },
    { id: 'drop-intel-pin', label: 'Drop Intel Pin', icon: 'intel-pin', shortcut: '4', onSelect: () => createDraftFromMap('DROP_INTEL', { nodeId }, { intelType: 'PIN', title: 'Intel Pin', body: '' }) },
  ];

  const createIntelRadialItems = (intelId: string): RadialMenuItem[] => [
    { id: 'endorse-intel', label: 'Endorse Intel', icon: 'endorse', shortcut: '1', onSelect: () => createDraftFromMap('ENDORSE_INTEL', { intelId }, { note: '' }) },
    { id: 'challenge-intel', label: 'Challenge Intel', icon: 'challenge', shortcut: '2', tone: 'danger', onSelect: () => createDraftFromMap('CHALLENGE_INTEL', { intelId }, { note: '' }) },
    { id: 'link-op', label: 'Link to Op', icon: 'link-op', shortcut: '3', onSelect: () => createDraftFromMap('LINK_INTEL_TO_OP', { intelId }, { opIds: focusOperationId || opId || '' }) },
  ];

  const createZoneRadialItems = (zoneId: string, nodeId?: string): RadialMenuItem[] => [
    { id: 'attach-intel', label: 'Attach Intel', icon: 'attach-intel', shortcut: '1', onSelect: () => createDraftFromMap('ATTACH_INTEL', { zoneId, nodeId }, { intelType: 'NOTE', title: 'Zone Intel' }) },
    { id: 'request-patrol', label: 'Request Patrol', icon: 'request-patrol', shortcut: '2', tone: 'warning', onSelect: () => createDraftFromMap('REQUEST_PATROL', { zoneId, nodeId }, { notes: 'Patrol requested' }) },
  ];

  const radialItems = useMemo(() => {
    if (!activeRadial) return [] as RadialMenuItem[];
    if (activeRadial.type === 'node' && activeRadial.nodeId) return createNodeRadialItems(activeRadial.nodeId);
    if (activeRadial.type === 'intel' && activeRadial.intelId) return createIntelRadialItems(activeRadial.intelId);
    if (activeRadial.type === 'zone' && activeRadial.zoneId) return createZoneRadialItems(activeRadial.zoneId, activeRadial.nodeId);
    return [] as RadialMenuItem[];
  }, [activeRadial, actorId, opId, focusOperationId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveTacticalMapShortcut({
        key: event.key,
        shiftKey: event.shiftKey,
        isFormTarget: isFormTarget(event.target),
        mode: mapMode,
      });
      if (action.type === 'SET_MODE') {
        applyMapMode(action.mode);
        return;
      }
      if (action.type === 'OPEN_ACTIONS') {
        setActiveDockId('ACTIONS');
        return;
      }
      if (action.type === 'REPLAY_BACK') {
        setReplayOffsetMinutes((prev) => Math.max(0, prev - 1));
        return;
      }
      if (action.type === 'REPLAY_FORWARD') {
        setReplayOffsetMinutes((prev) => prev + 1);
        return;
      }
      if (action.type === 'EXECUTE_CRITICAL_CALLOUT') {
        setActiveDockId('ACTIONS');
        void executeMacro('ISSUE_CRITICAL_CALLOUT');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapMode, applyMapMode, executeMacro]);

  if (!Array.isArray(layers) || layers.length === 0) {
    return <DegradedStateCard state="LOCKED" reason="Layer state failed to initialize for tactical map." />;
  }

  const summaryTab = (
    <div className="space-y-2">
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Selected Object</h4>
          <NexusBadge tone={mapInference.commandRiskScore >= 70 ? 'danger' : mapInference.commandRiskScore >= 45 ? 'warning' : 'ok'}>
            Risk {mapInference.commandRiskScore}
          </NexusBadge>
        </div>
        {selectedInfoRows.length > 0 ? (
          <div className="space-y-1">
            {selectedInfoRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                <span className="text-zinc-500 uppercase">{row.label}</span>
                <span className="text-zinc-200 truncate">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500 rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">No node selected.</div>
        )}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Recent Orders</h4>
          <div className="flex items-center gap-1.5">
            <NexusBadge tone="neutral">{timeline.visibleEntries.length}</NexusBadge>
            {summaryOrderPageCount > 1 ? (
              <span className="text-[10px] text-zinc-500">
                {summaryOrdersPage + 1}/{summaryOrderPageCount}
              </span>
            ) : null}
          </div>
        </div>
        {summaryOrders.map((entry) => (
          <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-200 truncate">{entry.title}</span>
              <span className="text-zinc-500">{entry.source}</span>
            </div>
            <div className="text-zinc-500 mt-0.5 truncate">{entry.detail}</div>
          </div>
        ))}
        {summaryOrderPageCount > 1 ? (
          <div className="flex items-center justify-between gap-2">
            <NexusButton
              size="sm"
              intent="subtle"
              className="text-[10px]"
              disabled={summaryOrdersPage === 0}
              onClick={() => setSummaryOrdersPage((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </NexusButton>
            <NexusButton
              size="sm"
              intent="subtle"
              className="text-[10px]"
              disabled={summaryOrdersPage >= summaryOrderPageCount - 1}
              onClick={() => setSummaryOrdersPage((prev) => Math.min(summaryOrderPageCount - 1, prev + 1))}
            >
              Next
            </NexusButton>
          </div>
        ) : null}
        {timeline.visibleEntries.length === 0 ? <div className="text-[11px] text-zinc-500">No orders inside current replay window.</div> : null}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Comms Log</h4>
          <div className="flex items-center gap-1.5">
            <NexusBadge tone={commsStatusTone}>{commsStatusLabel}</NexusBadge>
            {summaryCommsPageCount > 1 ? (
              <span className="text-[10px] text-zinc-500">
                {summaryCommsPage + 1}/{summaryCommsPageCount}
              </span>
            ) : null}
          </div>
        </div>
        {summaryComms.map((callout) => (
          <div key={callout.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span style={{ color: commsPriorityColor(callout.priority) }}>{callout.priority}</span>
              <span className="text-zinc-500">{callout.stale ? 'STALE' : `${formatAge(callout.ageSeconds)} ago`}</span>
            </div>
            <div className="text-zinc-300 mt-0.5 truncate">{callout.message}</div>
          </div>
        ))}
        {summaryCommsPageCount > 1 ? (
          <div className="flex items-center justify-between gap-2">
            <NexusButton
              size="sm"
              intent="subtle"
              className="text-[10px]"
              disabled={summaryCommsPage === 0}
              onClick={() => setSummaryCommsPage((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </NexusButton>
            <NexusButton
              size="sm"
              intent="subtle"
              className="text-[10px]"
              disabled={summaryCommsPage >= summaryCommsPageCount - 1}
              onClick={() => setSummaryCommsPage((prev) => Math.min(summaryCommsPageCount - 1, prev + 1))}
            >
              Next
            </NexusButton>
          </div>
        ) : null}
        {stageCommsCallouts.length === 0 ? <div className="text-[11px] text-zinc-500">No comms callouts in current view scope.</div> : null}
      </section>
    </div>
  );

  const commsTab = (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Comms</h4>
        <NexusBadge tone={commsStatusTone}>{commsStatusLabel}</NexusBadge>
      </div>
      {commsAvailability !== 'OK' || commsDegraded ? <div className="text-[11px] text-zinc-500">{commsStatusCopy}</div> : null}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['STANDARD', 'HIGH', 'CRITICAL'] as CommsPriority[]).map((entry) => (
          <NexusButton key={entry} size="sm" intent={commsPriorityFloor === entry ? 'primary' : 'subtle'} className="text-[10px]" onClick={() => setCommsPriorityFloor(entry)}>{entry === 'STANDARD' ? 'STD+' : entry}</NexusButton>
        ))}
        <NexusButton size="sm" intent={showCommsLinks ? 'primary' : 'subtle'} className="text-[10px]" onClick={() => setShowCommsLinks((prev) => !prev)}>Links</NexusButton>
      </div>
      {stageCommsNets.slice(0, 4).map((net) => (
        <div key={net.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2"><span className="text-zinc-200 truncate">{net.label}</span><NexusBadge tone={commsQualityTone(net.quality)}>{net.quality}</NexusBadge></div>
          <div className="mt-1 text-zinc-500">{net.discipline} · P {net.participants} · TX {net.speaking}</div>
        </div>
      ))}
      {stageCommsCallouts.slice(0, 4).map((callout) => (
        <div key={callout.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2"><span style={{ color: commsPriorityColor(callout.priority) }}>{callout.priority}</span><NexusBadge tone={commsPriorityTone(callout.priority)}>{callout.stale ? 'STALE' : `${formatAge(callout.ageSeconds)} ago`}</NexusBadge></div>
          <div className="mt-1 text-zinc-300">{callout.message}</div>
        </div>
      ))}
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Quick Broadcast</div>
          <NexusBadge tone={quickBroadcastPriority === 'CRITICAL' ? 'danger' : quickBroadcastPriority === 'HIGH' ? 'warning' : 'active'}>
            {quickBroadcastPriority}
          </NexusBadge>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['STANDARD', 'HIGH', 'CRITICAL'] as CommsPriority[]).map((entry) => (
            <NexusButton
              key={`broadcast:${entry}`}
              size="sm"
              intent={quickBroadcastPriority === entry ? 'primary' : 'subtle'}
              className="text-[10px]"
              onClick={() => setQuickBroadcastPriority(entry)}
            >
              {entry === 'STANDARD' ? 'STD' : entry}
            </NexusButton>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            value={quickBroadcastMessage}
            onChange={(event) => setQuickBroadcastMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void sendQuickBroadcast();
            }}
            className="flex-1 min-w-0 rounded border border-zinc-800 bg-zinc-950/75 px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-600"
            placeholder="Transmit callout..."
          />
          <NexusButton
            size="sm"
            intent="primary"
            className="text-[10px]"
            disabled={!quickBroadcastMessage.trim() || quickBroadcastBusy}
            onClick={() => void sendQuickBroadcast()}
          >
            {quickBroadcastBusy ? 'TX...' : 'TX'}
          </NexusButton>
        </div>
        {quickBroadcastError ? (
          <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-[11px] text-red-300">
            {quickBroadcastError}
          </div>
        ) : null}
      </section>
      <div className="flex items-center gap-1.5">
        <NexusButton size="sm" intent="subtle" onClick={() => onOpenCommsWorkspace?.({ opId: scopedCommsOpId || opId, netId: commsOverlay.nets[0]?.id, view: 'voice' })}>Open Voice</NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onOpenOperationFocus?.()}>Open Ops</NexusButton>
      </div>
    </section>
  );

  const intelTab = (
    <>
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Intel</h4><NexusBadge tone={availabilityTone(intelAvailability)}>{availabilityLabel(intelAvailability)}</NexusBadge></div>
        {visibleIntel.slice(0, 6).map((intel) => (
          <button key={intel.id} type="button" onClick={() => setSelectedIntelId(intel.id)} className={`w-full text-left rounded border px-2 py-1.5 ${selectedIntel?.id === intel.id ? 'border-sky-500/60 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}>
            <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-200 truncate">{intel.title}</span><NexusBadge tone={intel.stratum === 'COMMAND_ASSESSED' ? 'danger' : intel.stratum === 'OPERATIONAL' ? 'warning' : intel.stratum === 'SHARED_COMMONS' ? 'active' : 'neutral'}>{intel.stratum}</NexusBadge></div>
            <div className="mt-1 text-[11px] text-zinc-500">{intel.type} · {intel.ttl.stale ? 'stale' : `${intel.ttl.remainingSeconds}s`}</div>
          </button>
        ))}
      </section>
      <IntelDetailPanel intel={selectedIntel} comments={selectedIntelComments} onAddComment={addIntelComment} onCreateIntelDraft={(kind, intelId) => createDraftFromMap(kind, { intelId })} />
    </>
  );

  const logisticsTab = (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Logistics</h4><NexusBadge tone={availabilityTone(logisticsAvailability)}>{availabilityLabel(logisticsAvailability)}</NexusBadge></div>
      {logisticsOverlay.lanes.slice(0, 6).map((lane) => (
        <div key={lane.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
          <div className="flex items-center justify-between"><span className="text-zinc-200 truncate">{lane.label}</span><NexusBadge tone={logisticsLaneTone(lane)}>{lane.stale ? 'STALE' : lane.laneKind}</NexusBadge></div>
          <div className="mt-1 text-zinc-500">{lane.fromNodeId} → {lane.toNodeId}</div>
        </div>
      ))}
    </section>
  );

  const evidenceTab = (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Evidence</h4><NexusBadge tone="neutral">{mapInference.confidenceScore}%</NexusBadge></div>
      <AIFeatureToggle
        label="Map AI Sync"
        description="Enable or disable AI context sync for this profile."
      />
      {mapInference.factors.map((factor) => <div key={factor.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]"><span className="text-zinc-200 uppercase">{factor.id}</span> <span className="text-zinc-500">{factor.score}</span><div className="text-zinc-400">{factor.rationale}</div></div>)}
      <div className="flex items-center justify-between"><NexusButton size="sm" intent="subtle" onClick={requestAiInference} disabled={!aiEnabled || aiInferenceLoading}>{aiInferenceLoading ? 'AI Sync...' : aiEnabled ? 'AI Context Sync' : 'AI Context Sync Disabled'}</NexusButton><span className="text-[10px] text-zinc-500">Z{mapInference.evidence.zoneSignals}/C{mapInference.evidence.commsSignals}/I{mapInference.evidence.intelSignals}</span></div>
      {aiInferenceError ? <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-[11px] text-red-300">{aiInferenceError}</div> : null}
      {aiInferenceText ? <div className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1.5 text-[11px] text-zinc-300 whitespace-pre-wrap">{aiInferenceText}</div> : null}
      {!selectedZone ? <div className="text-xs text-zinc-500">Select a zone to inspect contributing signals.</div> : <div className="space-y-1.5">{selectedZone.signals.slice(0, 6).map((signal) => <div key={`${selectedZone.id}:${signal.sourceRef.kind}:${signal.sourceRef.id}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]"><div className="flex items-center justify-between"><span className="text-zinc-200">{signal.type}</span><span className="text-zinc-500">{signalWeightLabel(signal, nowMs)}</span></div><div className="text-zinc-500">{signal.sourceRef.kind}:{signal.sourceRef.id}</div></div>)}</div>}
    </section>
  );

  const actionsTab = (
    <>
      <MapActionQueue recommendations={localCommandSurface.recommendedMacros} alerts={commandSurfaceAlerts} busyMacroId={busyMacroId} executionMessage={macroExecutionMessage} executionError={macroExecutionError} onExecuteMacro={(macroId) => void executeMacro(macroId)} />
      <IntentDraftPanel draft={activeDraft} operations={operations} focusOperationId={focusOperationId} onPatchPayload={(patch) => { if (!activeDraft) return; updateDraft(activeDraft.id, { payload: patch }); setDraftVersion((prev) => prev + 1); }} onConfirm={confirmActiveDraft} onCancel={() => { if (!activeDraft) return; cancelDraft(activeDraft.id); setDraftVersion((prev) => prev + 1); }} />
      {draftError ? <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-xs text-red-300">{draftError}</div> : null}
    </>
  );

  const timelineTab = (
    <MapTimelineReplay timeline={timeline} windowMinutes={replayWindowMinutes} offsetMinutes={replayOffsetMinutes} onChangeWindowMinutes={setReplayWindowMinutes} onChangeOffsetMinutes={setReplayOffsetMinutes} />
  );

  const dockTabs: MapDockTab[] = [
    { id: 'SUMMARY', label: 'Summary', count: mapInference.commandRiskScore, content: summaryTab },
    { id: 'COMMS', label: 'Comms', count: commsOverlay.nets.length, content: commsTab },
    { id: 'INTEL', label: 'Intel', count: visibleIntel.length, content: intelTab },
    { id: 'LOGISTICS', label: 'Logistics', count: logisticsOverlay.lanes.length, content: logisticsTab },
    { id: 'EVIDENCE', label: 'Evidence', count: mapInference.factors.length, content: evidenceTab },
    { id: 'ACTIONS', label: 'Actions', count: localCommandSurface.recommendedMacros.length, content: actionsTab },
    { id: 'TIMELINE', label: 'Timeline', count: timeline.visibleEntries.length, content: timelineTab },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      <div
        className={`flex-1 min-h-0 grid gap-2 ${
          compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[17rem_minmax(0,1fr)_22rem]'
        }`}
      >
        <aside className={compact ? 'min-h-0 order-2' : 'min-h-0 order-1'}>
          <MapCommandStrip
            mode={mapMode}
            viewMode={mapViewMode}
            layers={layers}
            activeLayerCount={activeLayerCount}
            hasAnyOverlay={hasAnyOverlay}
            riskScore={mapInference.commandRiskScore}
            showStations={showStations}
            showLagrange={showLagrange}
            showOmMarkers={showOmMarkers}
            reducedMotion={reducedMotion}
            scopeIsGlobal={scopeIsGlobal}
            commandSurfaceV2Enabled={commandSurfaceV2Enabled}
            rosterItems={mapRosterItems}
            onToggleLayer={toggleLayer}
            onChangeMode={applyMapMode}
            onChangeViewMode={setMapViewMode}
            onToggleStations={() => setShowStations((prev) => !prev)}
            onToggleLagrange={() => setShowLagrange((prev) => !prev)}
            onToggleOmMarkers={() => setShowOmMarkers((prev) => !prev)}
            onOpenMapFocus={onOpenMapFocus}
          />
        </aside>

        <section className={compact ? 'min-h-0 order-1' : 'min-h-0 order-2'}>
          <MapStageCanvas
            layerEnabled={layerEnabled}
            opsOverlay={stageOpsOverlay}
            controlZones={stageControlZones}
            visibleCommsLinks={stageCommsLinks}
            commsOverlay={commsOverlay}
            commsAnchors={commsAnchors}
            visibleCommsCallouts={stageCommsCallouts}
            logisticsOverlay={stageLogisticsOverlay}
            visibleMapNodes={stageVisibleNodes}
            presence={stagePresence}
            visibleIntel={stageIntel}
            mapViewMode={mapViewMode}
            selectedNodeId={selectedNode?.id}
            selectedNodeLabel={selectedNode?.label}
            activeRadial={activeRadial}
            radialItems={radialItems}
            hasAnyOverlay={hasAnyOverlay}
            operationId={scopedCommsOpId}
            actorId={actorId}
            onClearRadial={() => setActiveRadial(null)}
            onSelectZone={setSelectedZoneId}
            onSelectIntel={setSelectedIntelId}
            onSetActiveRadial={setActiveRadial}
          />
        </section>

        <aside className={compact ? 'min-h-0 order-3' : 'min-h-0 order-3'}>
          <MapDock mode={mapMode} activeDockId={activeDockId} tabs={dockTabs} onChangeDock={setActiveDockId} />
        </aside>
      </div>
      <div className="text-[10px] text-zinc-500 nexus-console-text px-1">Shortcuts: 1/2/3 modes, . actions, Shift+C critical callout, [ ] replay scrub in FULL mode.</div>
    </div>
  );
}