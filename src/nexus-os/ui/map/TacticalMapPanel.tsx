import React, { useEffect, useMemo, useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import type { LocationEstimate, VisibilityScope } from '../../schemas/coreSchemas';
import type { IntelStratum, IntentDraftKind } from '../../schemas/intelSchemas';
import type { ControlSignal, ControlZone, MapLayerState, TacticalLayerId } from '../../schemas/mapSchemas';
import type { Operation } from '../../schemas/opSchemas';
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
  type IntelRenderable,
} from '../../services/intelService';
import {
  cancelDraft,
  confirmDraft,
  createDraft,
  listDrafts,
  subscribeIntentDrafts,
  updateDraft,
} from '../../services/intentDraftService';
import { useRenderProfiler } from '../../diagnostics';
import { AnimatedMount, transitionStyle, useReducedMotion } from '../motion';
import { DegradedStateCard, NexusBadge, NexusButton, RustPulseIndicator } from '../primitives';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import {
  buildMapLogisticsOverlay,
  type MapLogisticsLane,
} from '../../services/mapLogisticsOverlayService';
import IntelDetailPanel from './IntelDetailPanel';
import IntentDraftPanel from './IntentDraftPanel';
import RadialMenu, { type RadialMenuItem } from './RadialMenu';
import { TACTICAL_MAP_EDGES, TACTICAL_MAP_NODE_BY_ID, TACTICAL_MAP_NODES, findMapNodeForLocation } from './mapBoard';

interface TacticalMapPanelProps extends Partial<CqbPanelSharedProps> {
  locationEstimates?: LocationEstimate[];
  controlSignals?: ControlSignal[];
  viewerScope?: VisibilityScope;
  onOpenMapFocus?: () => void;
  compact?: boolean;
}

interface RenderablePresence {
  id: string;
  nodeId: string;
  subjectId: string;
  displayState: 'DECLARED' | 'INFERRED' | 'STALE';
  confidenceBand: 'LOW' | 'MED' | 'HIGH';
  confidence: number;
  ageSeconds: number;
  ttlRemainingSeconds: number;
  sourceType: string;
}

interface MapRadialState {
  type: 'node' | 'intel' | 'zone';
  title: string;
  anchor: { x: number; y: number };
  nodeId?: string;
  intelId?: string;
  zoneId?: string;
}

interface OpsOverlayNode {
  id: string;
  title: string;
  nodeId: string;
  isFocus: boolean;
  posture: Operation['posture'];
  status: Operation['status'];
}

interface CommsOverlayState {
  loading: boolean;
  error: string | null;
  overlay: MapCommsOverlay;
}

const DEFAULT_LAYER_STATE: Readonly<MapLayerState[]> = Object.freeze([
  { id: 'presence', enabled: true },
  { id: 'controlZones', enabled: true },
  { id: 'ops', enabled: true },
  { id: 'intel', enabled: true },
  { id: 'comms', enabled: false },
  { id: 'logistics', enabled: false },
]);

const DEFAULT_VISIBLE_STRATA: Readonly<Record<IntelStratum, boolean>> = Object.freeze({
  PERSONAL: true,
  SHARED_COMMONS: true,
  OPERATIONAL: false,
  COMMAND_ASSESSED: false,
});

function formatAge(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}m ${remainder}s`;
}

function stateTone(state: RenderablePresence['displayState']): 'ok' | 'warning' | 'neutral' {
  if (state === 'DECLARED') return 'ok';
  if (state === 'INFERRED') return 'warning';
  return 'neutral';
}

function stateColor(state: RenderablePresence['displayState']): string {
  if (state === 'DECLARED') return 'rgba(118, 201, 140, 0.86)';
  if (state === 'INFERRED') return 'rgba(179, 138, 82, 0.85)';
  return 'rgba(135, 128, 122, 0.72)';
}

function confidenceColor(confidenceBand: RenderablePresence['confidenceBand']): string {
  if (confidenceBand === 'HIGH') return 'rgba(118, 201, 140, 0.9)';
  if (confidenceBand === 'MED') return 'rgba(201, 161, 94, 0.85)';
  return 'rgba(189, 104, 87, 0.85)';
}

function layerLabel(id: TacticalLayerId): string {
  if (id === 'controlZones') return 'Control';
  if (id === 'ops') return 'Ops';
  if (id === 'intel') return 'Intel';
  if (id === 'comms') return 'Comms';
  if (id === 'logistics') return 'Logistics';
  return 'Presence';
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

function signalWeightLabel(signal: ControlSignal, nowMs: number): string {
  const decayed = applyTTLDecay(signal, nowMs);
  if (decayed <= 0) return 'STALE';
  return `${Math.round(decayed * 100)}%`;
}

function stratumTone(stratum: IntelStratum): 'neutral' | 'active' | 'warning' | 'danger' {
  if (stratum === 'COMMAND_ASSESSED') return 'danger';
  if (stratum === 'OPERATIONAL') return 'warning';
  if (stratum === 'SHARED_COMMONS') return 'active';
  return 'neutral';
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

function intelTooltip(intel: IntelRenderable): string {
  return `${intel.title} | ${intel.type} | ${intel.stratum} | ${intel.confidence} | ttl ${intel.ttl.remainingSeconds}s`;
}

function keyForIntel(intel: IntelRenderable): string {
  return `${intel.id}:${intel.updatedAt}`;
}

function commsPriorityRank(priority: CommsPriority): number {
  if (priority === 'CRITICAL') return 3;
  if (priority === 'HIGH') return 2;
  return 1;
}

function commsPriorityColor(priority: CommsPriority): string {
  if (priority === 'CRITICAL') return 'rgba(214, 83, 64, 0.92)';
  if (priority === 'HIGH') return 'rgba(216, 146, 87, 0.9)';
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

function logisticsLaneColor(lane: MapLogisticsLane): string {
  if (lane.stale) return 'rgba(126, 119, 112, 0.45)';
  if (lane.laneKind === 'EXTRACT') return 'rgba(118, 201, 140, 0.88)';
  if (lane.laneKind === 'HOLD') return 'rgba(201, 161, 94, 0.86)';
  if (lane.laneKind === 'AVOID') return 'rgba(214, 83, 64, 0.9)';
  if (lane.laneKind === 'ROUTE_HYPOTHESIS') return 'rgba(94, 158, 178, 0.82)';
  return 'rgba(216, 146, 87, 0.88)';
}

function logisticsLaneTone(lane: MapLogisticsLane): 'ok' | 'warning' | 'neutral' {
  if (lane.stale) return 'neutral';
  if (lane.laneKind === 'AVOID') return 'warning';
  if (lane.laneKind === 'EXTRACT') return 'ok';
  return 'warning';
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

export default function TacticalMapPanel({
  locationEstimates = [],
  controlSignals = [],
  viewerScope = 'ORG',
  onOpenMapFocus,
  compact = false,
  actorId = 'ce-warden',
  opId,
  operations = [],
  focusOperationId,
}: TacticalMapPanelProps) {
  useRenderProfiler('TacticalMapPanel');
  const reducedMotion = useReducedMotion();
  const [layers, setLayers] = useState<MapLayerState[]>([...DEFAULT_LAYER_STATE]);
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
  const [aiInferenceText, setAiInferenceText] = useState<string>('');
  const [aiInferenceError, setAiInferenceError] = useState<string | null>(null);
  const [commsState, setCommsState] = useState<CommsOverlayState>(() => ({
    loading: true,
    error: null,
    overlay: createEmptyMapCommsOverlay(focusOperationId || opId || ''),
  }));

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeIntel = subscribeIntelObjects(() => {
      setIntelVersion((prev) => prev + 1);
    });
    const unsubscribeDrafts = subscribeIntentDrafts(() => {
      setDraftVersion((prev) => prev + 1);
    });
    return () => {
      unsubscribeIntel();
      unsubscribeDrafts();
    };
  }, []);

  const scopedCommsOpId = focusOperationId || opId || '';
  const operationMapSignature = useMemo(
    () => (operations || [])
      .map((entry) => `${entry.id}:${entry.ao?.nodeId || ''}:${entry.updatedAt || ''}`)
      .sort()
      .join('|'),
    [operations]
  );

  useEffect(() => {
    let active = true;
    const loadCommsOverlay = async () => {
      setCommsState((prev) => {
        const scopeChanged = prev.overlay.scopedOpId !== scopedCommsOpId;
        return {
          loading: true,
          error: null,
          overlay: scopeChanged ? createEmptyMapCommsOverlay(scopedCommsOpId) : prev.overlay,
        };
      });
      try {
        const response: any = await invokeMemberFunction('updateCommsConsole', {
          action: 'get_comms_topology_snapshot',
          eventId: scopedCommsOpId || undefined,
          includeGlobal: !scopedCommsOpId,
          limit: 160,
        });
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
        setCommsState({ loading: false, error: null, overlay });
      } catch (error: any) {
        if (!active) return;
        setCommsState((prev) => ({
          loading: false,
          error: error?.message || 'Comms topology unavailable.',
          overlay: prev.overlay.nets.length > 0 ? prev.overlay : createEmptyMapCommsOverlay(scopedCommsOpId),
        }));
      }
    };

    loadCommsOverlay();
    const timer = setInterval(loadCommsOverlay, 20_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [scopedCommsOpId, opId, focusOperationId, operationMapSignature]);

  const presence = useMemo(() => mapPresence(locationEstimates, viewerScope), [locationEstimates, viewerScope]);

  const controlZones = useMemo(() => {
    try {
      return computeControlZones(controlSignals, nowMs);
    } catch (error) {
      console.warn('[NexusOS][Map] Control zone computation failed:', error);
      return [];
    }
  }, [controlSignals, nowMs]);

  const intelObjects = useMemo(() => {
    return listIntelObjects(
      {
        viewerId: actorId,
        includeScopes: ['PERSONAL', 'ORG', 'OP'],
        activeOpId: opId,
        includeRetired: false,
        includeStale: true,
      },
      nowMs
    );
  }, [intelVersion, actorId, opId, nowMs]);

  const activeDraft = useMemo(() => {
    const drafts = listDrafts({ createdBy: actorId, status: 'DRAFT' });
    return drafts[0] || null;
  }, [draftVersion, actorId]);

  const selectedZone = useMemo<ControlZone | null>(() => {
    if (!controlZones.length) return null;
    if (!selectedZoneId) return controlZones[0];
    return controlZones.find((zone) => zone.id === selectedZoneId) || controlZones[0];
  }, [controlZones, selectedZoneId]);

  const selectedIntel = useMemo<IntelRenderable | null>(() => {
    if (!intelObjects.length) return null;
    if (!selectedIntelId) return intelObjects[0];
    return intelObjects.find((entry) => entry.id === selectedIntelId) || intelObjects[0];
  }, [intelObjects, selectedIntelId]);

  const selectedIntelComments = useMemo(
    () => (selectedIntel ? listIntelComments(selectedIntel.id) : []),
    [selectedIntel, intelVersion]
  );

  const layerEnabled = (id: TacticalLayerId) => layers.find((entry) => entry.id === id)?.enabled === true;

  const opsOverlay = useMemo<OpsOverlayNode[]>(() => {
    return (operations || [])
      .map((operation) => ({
        id: operation.id,
        title: operation.name,
        nodeId: operation.ao?.nodeId || '',
        isFocus: operation.id === focusOperationId,
        posture: operation.posture,
        status: operation.status,
      }))
      .filter((entry) => Boolean(entry.nodeId && TACTICAL_MAP_NODE_BY_ID[entry.nodeId]));
  }, [operations, focusOperationId]);
  const commsOverlay = commsState.overlay;
  const logisticsOverlay = useMemo(
    () =>
      buildMapLogisticsOverlay({
        opId,
        focusOperationId,
        operations,
        mapNodes: TACTICAL_MAP_NODES,
        nowMs,
      }),
    [opId, focusOperationId, operations, nowMs]
  );

  const visibleCommsCallouts = useMemo(
    () => commsOverlay.callouts.filter((callout) => commsPriorityRank(callout.priority) >= commsPriorityRank(commsPriorityFloor)),
    [commsOverlay.callouts, commsPriorityFloor]
  );

  const visibleCommsLinks = useMemo(
    () => (showCommsLinks ? commsOverlay.links : []),
    [showCommsLinks, commsOverlay.links]
  );

  const commsAnchors = useMemo(() => {
    const byNetId: Record<string, { x: number; y: number; nodeId: string }> = {};
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
        byNetId[net.id] = {
          x: anchorNode.x + Math.cos(angle) * orbitRadius,
          y: anchorNode.y + Math.sin(angle) * orbitRadius,
          nodeId,
        };
      });
    }
    return byNetId;
  }, [commsOverlay.nets]);

  const visibleMapNodes = useMemo(
    () => TACTICAL_MAP_NODES.filter((node) => {
      if (node.category === 'station') return showStations;
      if (node.category === 'lagrange') return showLagrange;
      if (node.category === 'orbital-marker') return showOmMarkers;
      return true;
    }),
    [showStations, showLagrange, showOmMarkers]
  );

  const visibleIntel = useMemo(() => {
    if (!layerEnabled('intel')) return [] as IntelRenderable[];
    return intelObjects.filter((intel) => visibleStrata[intel.stratum]);
  }, [intelObjects, visibleStrata, layers]);

  const mapInference = useMemo(
    () => computeMapInference({
      controlZones,
      commsOverlay,
      intelObjects: visibleIntel,
      operations,
      focusOperationId: focusOperationId || opId || '',
      nowMs,
    }),
    [controlZones, commsOverlay, visibleIntel, operations, focusOperationId, opId, nowMs]
  );

  const hasPresence = layerEnabled('presence') && presence.length > 0;
  const hasControl = layerEnabled('controlZones') && controlZones.length > 0;
  const hasIntel = layerEnabled('intel') && visibleIntel.length > 0;
  const hasOps = layerEnabled('ops') && opsOverlay.length > 0;
  const hasComms = layerEnabled('comms') && (commsOverlay.nets.length > 0 || visibleCommsCallouts.length > 0 || visibleCommsLinks.length > 0);
  const hasLogistics = layerEnabled('logistics') && logisticsOverlay.lanes.length > 0;
  const hasAnyOverlay = hasPresence || hasControl || hasIntel || hasOps || hasComms || hasLogistics;
  const activeLayerCount = layers.filter((entry) => entry.enabled).length;
  const presenceStaleCount = presence.filter((entry) => entry.displayState === 'STALE').length;
  const intelStaleCount = visibleIntel.filter((entry) => entry.ttl.stale).length;
  const commsStaleCount = visibleCommsCallouts.filter((entry) => entry.stale).length;
  const contestedZones = controlZones.filter((zone) => zone.contestationLevel >= 0.45).length;
  const presenceAvailability = resolveAvailabilityState({
    count: layerEnabled('presence') ? presence.length : undefined,
    staleCount: presenceStaleCount,
  });
  const intelAvailability = resolveAvailabilityState({
    count: layerEnabled('intel') ? visibleIntel.length : undefined,
    staleCount: intelStaleCount,
  });
  const controlAvailability = resolveAvailabilityState({
    count: layerEnabled('controlZones') ? controlZones.length : undefined,
    hasConflict: contestedZones > 0,
  });
  const commsAvailability = resolveAvailabilityState({
    loading: commsState.loading,
    error: commsState.error,
    count: commsOverlay.nets.length + visibleCommsCallouts.length,
    staleCount: commsStaleCount,
  });
  const logisticsAvailability = resolveAvailabilityState({
    count: layerEnabled('logistics') ? logisticsOverlay.lanes.length : undefined,
    staleCount: logisticsOverlay.lanes.filter((lane) => lane.stale).length,
  });

  const toggleLayer = (id: TacticalLayerId) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, enabled: !layer.enabled } : layer)));
  };

  const toggleStratum = (stratum: IntelStratum) => {
    setVisibleStrata((prev) => ({ ...prev, [stratum]: !prev[stratum] }));
  };

  const requestAiInference = async () => {
    setAiInferenceError(null);
    setAiInferenceLoading(true);
    try {
      const response: any = await invokeMemberFunction('commsAssistant', {
        action: 'ask_comms',
        data: {
          eventId: scopedCommsOpId || null,
          query: buildMapAiPrompt(mapInference),
        },
      });
      const answer =
        response?.data?.answer ||
        response?.data?.response?.answer ||
        response?.data?.summary ||
        response?.data?.response ||
        '';
      setAiInferenceText(String(answer || '').trim() || 'No AI estimate returned for current scoped records.');
    } catch (error: any) {
      setAiInferenceError(error?.message || 'AI estimate unavailable.');
    } finally {
      setAiInferenceLoading(false);
    }
  };

  const createDraftFromMap = (
    kind: IntentDraftKind,
    target: { nodeId?: string; intelId?: string; zoneId?: string },
    payload: Record<string, unknown> = {}
  ) => {
    setDraftError(null);
    createDraft({
      kind,
      target,
      payload: {
        confidence: 'MED',
        opId: focusOperationId || opId || '',
        opIds: focusOperationId || opId || '',
        ...payload,
      },
      createdBy: actorId,
    });
    setDraftVersion((prev) => prev + 1);
    setActiveRadial(null);
  };

  const addIntelComment = async (intelId: string, body: string) => {
    await addComment(intelId, { by: actorId, body });
    setIntelVersion((prev) => prev + 1);
  };

  const confirmActiveDraft = () => {
    if (!activeDraft) return;
    try {
      const result = confirmDraft(activeDraft.id, Date.now());
      if (result.createdEventStub) {
        console.info('[NexusOS][Map][DraftConfirmedEvent]', result.createdEventStub);
      }
      setDraftError(null);
      setDraftVersion((prev) => prev + 1);
      setIntelVersion((prev) => prev + 1);
    } catch (error: any) {
      setDraftError(error?.message || 'Failed to confirm draft');
    }
  };

  const cancelActiveDraft = () => {
    if (!activeDraft) return;
    setDraftError(null);
    cancelDraft(activeDraft.id);
    setDraftVersion((prev) => prev + 1);
  };

  const patchActiveDraftPayload = (patch: Record<string, unknown>) => {
    if (!activeDraft) return;
    setDraftError(null);
    updateDraft(activeDraft.id, { payload: patch });
    setDraftVersion((prev) => prev + 1);
  };

  const createNodeRadialItems = (nodeId: string): RadialMenuItem[] => [
    {
      id: 'declare-departing',
      label: 'Declare Departing',
      icon: 'D',
      shortcut: '1',
      onSelect: () => createDraftFromMap('DECLARE_DEPARTURE', { nodeId }, { title: 'Departing', notes: `Departing ${nodeId}` }),
    },
    {
      id: 'declare-arriving',
      label: 'Declare Arriving',
      icon: 'A',
      shortcut: '2',
      onSelect: () => createDraftFromMap('DECLARE_ARRIVAL', { nodeId }, { title: 'Arriving', notes: `Arriving at ${nodeId}` }),
    },
    {
      id: 'declare-holding',
      label: 'Declare Holding',
      icon: 'H',
      shortcut: '3',
      onSelect: () => createDraftFromMap('DECLARE_HOLD', { nodeId }, { title: 'Holding', notes: `Holding at ${nodeId}` }),
    },
    {
      id: 'report-contact',
      label: 'Report Contact',
      icon: 'C',
      shortcut: '4',
      onSelect: () => createDraftFromMap('REPORT_CONTACT', { nodeId }, { title: 'Contact', notes: `Contact near ${nodeId}` }),
    },
    {
      id: 'request-sitrep',
      label: 'Request SITREP',
      icon: 'S',
      shortcut: '5',
      onSelect: () => createDraftFromMap('REQUEST_SITREP', { nodeId }, { title: 'SITREP Request', notes: `SITREP requested for ${nodeId}` }),
    },
    {
      id: 'drop-intel-pin',
      label: 'Drop Intel Pin',
      icon: 'P',
      shortcut: '6',
      onSelect: () => createDraftFromMap('DROP_INTEL', { nodeId }, { intelType: 'PIN', title: 'Intel Pin', body: '' }),
    },
    {
      id: 'place-marker',
      label: 'Place Marker',
      icon: 'M',
      shortcut: '7',
      onSelect: () => createDraftFromMap('PLACE_MARKER', { nodeId }, { intelType: 'MARKER', title: 'Intent Marker', body: '' }),
    },
  ];

  const createIntelRadialItems = (intelId: string): RadialMenuItem[] => [
    {
      id: 'endorse-intel',
      label: 'Endorse',
      icon: 'E',
      shortcut: '1',
      onSelect: () => createDraftFromMap('ENDORSE_INTEL', { intelId }, { note: '' }),
    },
    {
      id: 'challenge-intel',
      label: 'Challenge',
      icon: '!',
      shortcut: '2',
      onSelect: () => createDraftFromMap('CHALLENGE_INTEL', { intelId }, { note: '' }),
    },
    {
      id: 'promote-intel',
      label: 'Promote',
      icon: 'P',
      shortcut: '3',
      onSelect: () => createDraftFromMap('PROMOTE_INTEL', { intelId }, { toStratum: 'SHARED_COMMONS', reason: '' }),
    },
    {
      id: 'link-op',
      label: 'Link to Op',
      icon: 'L',
      shortcut: '4',
      onSelect: () => createDraftFromMap('LINK_INTEL_TO_OP', { intelId }, { opIds: focusOperationId || opId || '' }),
    },
    {
      id: 'retire-intel',
      label: 'Retire',
      icon: 'R',
      shortcut: '5',
      onSelect: () => createDraftFromMap('RETIRE_INTEL', { intelId }, { reason: '' }),
    },
  ];

  const createZoneRadialItems = (zoneId: string, nodeId?: string): RadialMenuItem[] => [
    {
      id: 'attach-intel',
      label: 'Attach Intel',
      icon: 'I',
      shortcut: '1',
      onSelect: () => createDraftFromMap('ATTACH_INTEL', { zoneId, nodeId }, { intelType: 'NOTE', title: 'Zone Intel', body: '' }),
    },
    {
      id: 'request-patrol',
      label: 'Request Patrol',
      icon: 'P',
      shortcut: '2',
      onSelect: () => createDraftFromMap('REQUEST_PATROL', { zoneId, nodeId }, { notes: 'Patrol requested' }),
    },
    {
      id: 'mark-avoid',
      label: 'Mark Avoid',
      icon: 'A',
      shortcut: '3',
      onSelect: () => createDraftFromMap('MARK_AVOID', { zoneId, nodeId }, { notes: 'Avoid zone until reassessed' }),
    },
  ];

  const radialItems = useMemo(() => {
    if (!activeRadial) return [] as RadialMenuItem[];
    if (activeRadial.type === 'node' && activeRadial.nodeId) {
      return createNodeRadialItems(activeRadial.nodeId);
    }
    if (activeRadial.type === 'intel' && activeRadial.intelId) {
      return createIntelRadialItems(activeRadial.intelId);
    }
    if (activeRadial.type === 'zone' && activeRadial.zoneId) {
      return createZoneRadialItems(activeRadial.zoneId, activeRadial.nodeId);
    }
    return [] as RadialMenuItem[];
  }, [activeRadial, actorId, opId, focusOperationId]);

  if (!Array.isArray(layers) || layers.length === 0) {
    return <DegradedStateCard state="LOCKED" reason="Layer state failed to initialize for tactical map." />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5">
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 space-y-2 nexus-terminal-panel nexus-map-toolbar">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">Tactical Map</h3>
            <NexusBadge tone={hasAnyOverlay ? 'active' : 'neutral'}>{hasAnyOverlay ? 'LIVE OVERLAYS' : 'BASELINE'}</NexusBadge>
            <NexusBadge tone="neutral">LAYERS {activeLayerCount}/{layers.length}</NexusBadge>
            <NexusBadge tone={mapInference.commandRiskScore >= 70 ? 'danger' : mapInference.commandRiskScore >= 45 ? 'warning' : 'ok'}>
              RISK {mapInference.commandRiskScore}
            </NexusBadge>
          </div>
          {onOpenMapFocus ? (
            <NexusButton size="sm" intent="subtle" onClick={onOpenMapFocus}>
              Open Map Focus
            </NexusButton>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {layers.map((layer) => (
            <NexusButton
              key={layer.id}
              size="sm"
              intent={layer.enabled ? 'primary' : 'subtle'}
              className="nexus-command-capsule"
              data-open={layer.enabled ? 'true' : 'false'}
              onClick={() => toggleLayer(layer.id)}
              title={`${layerLabel(layer.id)} layer toggle`}
              style={transitionStyle({
                preset: 'toggle',
                reducedMotion,
                properties: 'opacity, background-color, border-color',
              })}
            >
              {layerLabel(layer.id)}
            </NexusButton>
          ))}
          <div className="h-5 w-px bg-zinc-700/70" />
          <NexusButton size="sm" intent={showStations ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showStations ? 'true' : 'false'} onClick={() => setShowStations((prev) => !prev)} title="Toggle stations">
            Stations
          </NexusButton>
          <NexusButton size="sm" intent={showLagrange ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showLagrange ? 'true' : 'false'} onClick={() => setShowLagrange((prev) => !prev)} title="Toggle Lagrange points">
            Lagrange
          </NexusButton>
          <NexusButton size="sm" intent={showOmMarkers ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showOmMarkers ? 'true' : 'false'} onClick={() => setShowOmMarkers((prev) => !prev)} title="Toggle orbital marker ring">
            OM
          </NexusButton>
        </div>
      </section>

      <div className={`flex-1 min-h-0 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-12'}`}>
        <div className={compact ? 'min-h-0' : 'xl:col-span-8 min-h-0'}>
          <div
            className="h-full min-h-[280px] rounded border border-zinc-800 bg-zinc-950/60 relative overflow-hidden nexus-map-stage"
            onClick={() => setActiveRadial(null)}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
              <defs>
                <pattern id="zone-contested-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(201,152,96,0.3)" strokeWidth="1" />
                </pattern>
              </defs>

              <rect x="0" y="0" width="100" height="100" fill="rgba(8, 14, 21, 0.9)" />

              {TACTICAL_MAP_EDGES.map((edge) => {
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
                    stroke={edge.risk === 'high' ? 'rgba(214,83,64,0.56)' : edge.risk === 'medium' ? 'rgba(196,154,94,0.5)' : 'rgba(92,138,174,0.36)'}
                    strokeWidth={1.1}
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
                        <text
                          x={anchorNode.x}
                          y={anchorNode.y - anchorNode.radius - (entry.isFocus ? 2.9 : 1.9)}
                          textAnchor="middle"
                          style={{
                            fill: entry.isFocus ? 'rgba(220,236,248,0.9)' : 'rgba(146,170,188,0.64)',
                            fontSize: entry.isFocus ? '1.9px' : '1.5px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px',
                          }}
                        >
                          {entry.isFocus ? 'FOCUS AO' : 'AO'}
                        </text>
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
                          setSelectedZoneId(zone.id);
                          setActiveRadial({
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
                          setSelectedZoneId(zone.id);
                          setActiveRadial({
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
                        stroke={isDegraded ? 'rgba(216,146,87,0.78)' : 'rgba(89,172,198,0.74)'}
                        strokeWidth={isDegraded ? 1.05 : 0.95}
                        strokeDasharray={isDegraded ? '2 2' : '4 2'}
                        strokeDashoffset={isDegraded ? `${Math.floor(nowMs / 220) % 6}` : `${-Math.floor(nowMs / 280) % 8}`}
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
                        ? 'rgba(216,146,87,0.9)'
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
                        <text
                          x={anchor.x}
                          y={anchor.y - 2.35}
                          textAnchor="middle"
                          style={{
                            fill: 'rgba(205,224,240,0.86)',
                            fontSize: '1.25px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {net.label.slice(0, 8)}
                        </text>
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
                          strokeDashoffset={`${-Math.floor(nowMs / 230) % 8}`}
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
                      setActiveRadial({
                        type: 'node',
                        title: node.label,
                        anchor: { x: node.x, y: node.y },
                        nodeId: node.id,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      setActiveRadial({
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
                          setSelectedIntelId(intel.id);
                          setActiveRadial({
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
                          setSelectedIntelId(intel.id);
                          setActiveRadial({
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
            </svg>

            <RadialMenu
              open={Boolean(activeRadial)}
              title={activeRadial?.title || 'Actions'}
              anchor={activeRadial?.anchor || { x: 50, y: 50 }}
              items={radialItems}
              onClose={() => setActiveRadial(null)}
            />

            {!hasAnyOverlay ? (
              <AnimatedMount show className="absolute inset-x-3 bottom-3">
                <div className="rounded border border-zinc-700 bg-zinc-950/72 px-3 py-2 text-xs text-zinc-400 nexus-command-capsule-grid">
                  No active overlays. Baseline system board is rendered and ready for scoped data.
                </div>
              </AnimatedMount>
            ) : null}
          </div>
        </div>

        <div className={compact ? 'min-h-0' : 'xl:col-span-4 min-h-0 overflow-auto pr-1'}>
          <div className="space-y-3 nexus-map-sidebar">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Presence</h4>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={availabilityTone(presenceAvailability)}>{availabilityLabel(presenceAvailability)}</NexusBadge>
                  <NexusBadge tone={hasPresence ? 'ok' : 'neutral'}>{presence.length}</NexusBadge>
                </div>
              </div>
              {presenceAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(presenceAvailability)}</div>
              ) : null}
              {layerEnabled('presence') && presence.length === 0 ? (
                <div className="text-xs text-zinc-500">No scoped location estimates.</div>
              ) : null}
              {layerEnabled('presence')
                ? presence.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-200 truncate">{entry.subjectId}</span>
                        <NexusBadge tone={stateTone(entry.displayState)}>{entry.displayState}</NexusBadge>
                      </div>
                      <div className="mt-1 text-zinc-500 flex items-center justify-between gap-2">
                        <span>{entry.sourceType}</span>
                        <span>
                          {entry.ttlRemainingSeconds > 0 ? `${entry.ttlRemainingSeconds}s ttl` : 'stale'} | {formatAge(entry.ageSeconds)}
                        </span>
                      </div>
                      <div className="mt-1 text-zinc-500 flex items-center justify-between gap-2">
                        <span>conf {Math.round(entry.confidence * 100)}%</span>
                        <span>{entry.confidenceBand}</span>
                      </div>
                    </div>
                  ))
                : null}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Intel Layer</h4>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={availabilityTone(intelAvailability)}>{availabilityLabel(intelAvailability)}</NexusBadge>
                  <NexusBadge tone={hasIntel ? 'active' : 'neutral'}>{visibleIntel.length}</NexusBadge>
                </div>
              </div>
              {intelAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(intelAvailability)}</div>
              ) : null}
              <div className="flex items-center gap-2 flex-wrap">
                {(Object.keys(visibleStrata) as IntelStratum[]).map((stratum) => (
                  <NexusButton
                    key={stratum}
                    size="sm"
                    intent={visibleStrata[stratum] ? 'primary' : 'subtle'}
                    className="text-[10px]"
                    onClick={() => toggleStratum(stratum)}
                    title={`Toggle ${stratum}`}
                  >
                    {stratum.replace('_', ' ')}
                  </NexusButton>
                ))}
              </div>
              {visibleIntel.slice(0, 4).map((intel) => (
                <button
                  key={intel.id}
                  type="button"
                  onClick={() => setSelectedIntelId(intel.id)}
                  className={`w-full text-left rounded border px-2 py-1.5 ${selectedIntel?.id === intel.id ? 'border-sky-500/60 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-zinc-200 truncate">{intel.title}</span>
                    <NexusBadge tone={stratumTone(intel.stratum)}>{intel.stratum}</NexusBadge>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500 flex items-center justify-between gap-2">
                    <span>{intel.type}</span>
                    <span>{intel.ttl.stale ? 'stale' : `${intel.ttl.remainingSeconds}s`}</span>
                  </div>
                </button>
              ))}
              {layerEnabled('intel') && visibleIntel.length === 0 ? (
                <div className="text-xs text-zinc-500">No visible intel objects. Use node radial to drop a pin.</div>
              ) : null}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Control Zones</h4>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={availabilityTone(controlAvailability)}>{availabilityLabel(controlAvailability)}</NexusBadge>
                  <NexusBadge tone={hasControl ? 'warning' : 'neutral'}>{controlZones.length}</NexusBadge>
                </div>
              </div>
              {controlAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(controlAvailability)}</div>
              ) : null}
              {layerEnabled('controlZones') && controlZones.length === 0 ? (
                <div className="text-xs text-zinc-500">
                  No active control claims. Control remains unresolved until explicit signals arrive.
                </div>
              ) : null}
              {layerEnabled('controlZones')
                ? controlZones.slice(0, 5).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`w-full text-left rounded border px-2 py-1.5 ${selectedZone?.id === zone.id ? 'border-sky-500/60 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-zinc-200 truncate">{zone.geometryHint.nodeId || zone.id}</span>
                        <NexusBadge tone={zone.contestationLevel >= 0.45 ? 'danger' : 'warning'}>
                          {Math.round(zone.contestationLevel * 100)}% contested
                        </NexusBadge>
                      </div>
                    </button>
                  ))
                : null}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Comms Layer</h4>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={availabilityTone(commsAvailability)}>{availabilityLabel(commsAvailability)}</NexusBadge>
                  <NexusBadge tone={hasComms ? 'active' : 'neutral'}>{commsOverlay.nets.length}</NexusBadge>
                </div>
              </div>
              {commsAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(commsAvailability, commsState.error || undefined)}</div>
              ) : null}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['STANDARD', 'HIGH', 'CRITICAL'] as CommsPriority[]).map((entry) => (
                  <NexusButton
                    key={entry}
                    size="sm"
                    intent={commsPriorityFloor === entry ? 'primary' : 'subtle'}
                    className="text-[10px]"
                    onClick={() => setCommsPriorityFloor(entry)}
                    title={`Minimum callout priority ${entry}`}
                  >
                    {entry === 'STANDARD' ? 'STD+' : entry}
                  </NexusButton>
                ))}
                <NexusButton
                  size="sm"
                  intent={showCommsLinks ? 'primary' : 'subtle'}
                  className="text-[10px]"
                  onClick={() => setShowCommsLinks((prev) => !prev)}
                  title="Toggle comms bridge lines"
                >
                  Links
                </NexusButton>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Nets <span className="text-zinc-200">{commsOverlay.nets.length}</span>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Links <span className="text-zinc-200">{visibleCommsLinks.length}</span>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Calls <span className="text-zinc-200">{visibleCommsCallouts.length}</span>
                </div>
              </div>
              {commsOverlay.nets.slice(0, 4).map((net) => (
                <div key={net.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200 truncate">{net.label}</span>
                    <NexusBadge tone={commsQualityTone(net.quality)}>{net.quality}</NexusBadge>
                  </div>
                  <div className="mt-1 text-zinc-500 flex items-center justify-between gap-2">
                    <span>{net.discipline}</span>
                    <span>P {net.participants} | TX {net.speaking}</span>
                  </div>
                </div>
              ))}
              {layerEnabled('comms') && commsOverlay.nets.length === 0 && !commsState.loading ? (
                <div className="text-xs text-zinc-500">
                  No scoped nets visible. {scopedCommsOpId ? 'Current operation has no exposed voice topology.' : 'Awaiting comms topology.'}
                </div>
              ) : null}
              {visibleCommsCallouts.slice(0, 4).map((callout) => (
                <div key={callout.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" style={{ color: commsPriorityColor(callout.priority) }}>{callout.priority}</span>
                    <NexusBadge tone={commsPriorityTone(callout.priority)}>
                      {callout.stale ? 'STALE' : `${formatAge(callout.ageSeconds)} ago`}
                    </NexusBadge>
                  </div>
                  <div className="mt-1 text-zinc-300 line-clamp-2">{callout.message || 'Priority callout'}</div>
                </div>
              ))}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Logistics Layer</h4>
                <div className="flex items-center gap-1">
                  <NexusBadge tone={availabilityTone(logisticsAvailability)}>{availabilityLabel(logisticsAvailability)}</NexusBadge>
                  <NexusBadge tone={hasLogistics ? 'warning' : 'neutral'}>{logisticsOverlay.lanes.length}</NexusBadge>
                </div>
              </div>
              {logisticsAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(logisticsAvailability)}</div>
              ) : null}
              {layerEnabled('logistics') && logisticsOverlay.lanes.length === 0 ? (
                <div className="text-xs text-zinc-500">
                  No scoped logistics corridors. Confirm movement drafts/events to surface active lanes.
                </div>
              ) : null}
              {logisticsOverlay.lanes.slice(0, 5).map((lane) => (
                <div key={lane.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200 truncate">{lane.label}</span>
                    <NexusBadge tone={logisticsLaneTone(lane)}>
                      {lane.stale ? 'STALE' : lane.laneKind}
                    </NexusBadge>
                  </div>
                  <div className="mt-1 text-zinc-500 flex items-center justify-between gap-2">
                    <span>{lane.fromNodeId} → {lane.toNodeId}</span>
                    <span>{lane.stale ? `${formatAge(lane.ageSeconds)} old` : `${Math.round(lane.confidence * 100)}% conf`}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Command Estimate</h4>
                <NexusBadge tone={mapInference.commandRiskScore >= 70 ? 'danger' : mapInference.commandRiskScore >= 45 ? 'warning' : 'ok'}>
                  Risk {mapInference.commandRiskScore}
                </NexusBadge>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Confidence <span className="text-zinc-200">{mapInference.confidenceScore}</span>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Load <span className="text-zinc-200">{mapInference.projectedLoadBand}</span>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Contested <span className="text-zinc-200">{mapInference.contestedZoneCount}</span>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-400">
                  Degraded Nets <span className="text-zinc-200">{mapInference.degradedNetCount}</span>
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                {mapInference.recommendations.slice(0, 3).map((entry, index) => (
                  <div key={`${index}:${entry.slice(0, 12)}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-300">
                    {entry}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={requestAiInference}
                  disabled={aiInferenceLoading}
                  title="Request AI estimate from scoped records"
                >
                  {aiInferenceLoading ? 'AI Sync...' : 'AI Context Sync'}
                </NexusButton>
                <span className="text-[10px] text-zinc-500">Evidence Z{mapInference.evidence.zoneSignals}/C{mapInference.evidence.commsSignals}/I{mapInference.evidence.intelSignals}</span>
              </div>
              {aiInferenceError ? (
                <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-[11px] text-red-300">{aiInferenceError}</div>
              ) : null}
              {aiInferenceText ? (
                <div className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1.5 text-[11px] text-zinc-300">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">AI Estimate (Scoped Records Only)</div>
                  <div className="whitespace-pre-wrap">{aiInferenceText}</div>
                </div>
              ) : null}
            </section>

            <IntelDetailPanel
              intel={selectedIntel}
              comments={selectedIntelComments}
              onAddComment={addIntelComment}
              onCreateIntelDraft={(kind, intelId) => createDraftFromMap(kind, { intelId })}
            />

            <IntentDraftPanel
              draft={activeDraft}
              operations={operations || []}
              focusOperationId={focusOperationId}
              onPatchPayload={patchActiveDraftPayload}
              onConfirm={confirmActiveDraft}
              onCancel={cancelActiveDraft}
            />
            {draftError ? (
              <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-xs text-red-300">
                {draftError}
              </div>
            ) : null}

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Layer Hooks</h4>
                <NexusBadge tone="neutral">MVP</NexusBadge>
              </div>
              <div className="space-y-1 text-[11px] text-zinc-500">
                <div className="flex items-center justify-between gap-2">
                  <span>Ops overlay</span>
                  <span>{hasOps ? `${opsOverlay.length} AO` : 'none'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Comms overlay</span>
                  <span>{commsOverlay.nets.length || 'none'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Logistics overlay</span>
                  <span>{logisticsOverlay.lanes.length || 'none'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Map nodes</span>
                  <span>{visibleMapNodes.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Station/Lagrange/OM</span>
                  <span>{showStations ? 'S' : '-'} {showLagrange ? 'L' : '-'} {showOmMarkers ? 'OM' : '-'}</span>
                </div>
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Zone Signals</h4>
                <RustPulseIndicator active={Boolean(selectedZone?.signals?.length)} />
              </div>
              {!selectedZone ? (
                <div className="text-xs text-zinc-500">Select a zone to inspect contributing signals.</div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                  {selectedZone.signals.map((signal) => (
                    <div key={`${selectedZone.id}:${signal.sourceRef.kind}:${signal.sourceRef.id}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-200 truncate">{signal.type}</span>
                        <span className={signalWeightLabel(signal, nowMs) === 'STALE' ? 'text-zinc-600' : 'text-zinc-400'}>
                          {signalWeightLabel(signal, nowMs)}
                        </span>
                      </div>
                      <div className="text-zinc-500 mt-0.5 truncate">
                        {signal.sourceRef.kind}:{signal.sourceRef.id}
                      </div>
                      <div className="text-zinc-500 mt-0.5 flex items-center justify-between gap-2">
                        <span>conf {Math.round(signal.confidence * 100)}%</span>
                        <span>{formatAge((nowMs - new Date(signal.occurredAt).getTime()) / 1000)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
