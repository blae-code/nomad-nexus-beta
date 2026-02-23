import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, Radio, RefreshCcw } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import type { CommsGraphEdge, CommsGraphNode, CommsGraphSnapshot } from '../../services/commsGraphService';
import { buildCommsChannelHealth } from '../../services/commsIncidentService';
import { DEFAULT_ACQUISITION_MODE, buildCaptureMetadata, toCaptureMetadataRecord } from '../../services/dataAcquisitionPolicyService';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { NexusBadge, NexusButton, DegradedStateCard } from '../primitives';
import { PanelLoadingState } from '../loading';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import RadialMenu, { type RadialMenuItem } from '../map/RadialMenu';
import { tokenAssets } from '../tokens';
import {
  channelStatusTokenIcon,
  operatorStatusTone,
  operatorStatusTokenIcon,
  roleTokenIcon,
  topologyNodeTokenIcon,
  vehicleStatusTone,
  vehicleStatusTokenIcon,
} from './commsTokenSemantics';
import { buildSchemaTree, buildCompactChannelCards } from './commsFleetSchemaRuntime';
import {
  appendOrderDispatch,
  buildDeliveryStats,
  buildDeliverySurface,
  buildPagedOrders,
  createOrderDispatch,
} from './commsOrderRuntime';

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}

interface TopologyBridgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'active' | 'degraded';
  createdAtMs: number;
}

const HEALTH_PAGE_SIZE = 5;
const ORDER_FEED_PREVIEW_SIZE = 3;
const MAX_ORDER_HISTORY = 24;

function nodeFill(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(179,90,47,0.24)';
  if (node.type === 'team') return 'rgba(130,110,94,0.22)';
  return 'rgba(110,110,110,0.22)';
}

function nodeBorder(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(179,90,47,0.7)';
  if (node.type === 'team') return 'rgba(160,130,110,0.58)';
  return 'rgba(150,150,150,0.5)';
}

function clampPct(value: number): number {
  return Math.max(3, Math.min(97, value));
}

function extractChannelId(node: CommsGraphNode | null | undefined): string {
  if (!node) return '';
  const explicit = String((node.meta as any)?.channelId || '').trim();
  if (explicit) return explicit;
  if (node.id.startsWith('channel:')) return node.id.replace('channel:', '');
  return '';
}

function formatAge(nowMs: number, createdAtMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - createdAtMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function deliveryTone(status: string): 'warning' | 'active' | 'ok' {
  if (status === 'QUEUED') return 'warning';
  if (status === 'PERSISTED') return 'active';
  return 'ok';
}

function recommendationForDiscipline(discipline: string): { label: string; action: 'REROUTE' | 'RESTRICT' | 'CHECKIN'; detail: string } {
  if (discipline === 'SATURATED') {
    return {
      label: 'Reroute traffic now',
      action: 'REROUTE',
      detail: 'Reduce lane pressure immediately and keep command lane clear.',
    };
  }
  if (discipline === 'BUSY') {
    return {
      label: 'Restrict non-essential chatter',
      action: 'RESTRICT',
      detail: 'Hold discretionary chatter and preserve tactical bandwidth.',
    };
  }
  return {
    label: 'Run check-in sweep',
    action: 'CHECKIN',
    detail: 'Confirm voice readiness and lane health before next push.',
  };
}

export default function CommsNetworkConsole({
  variantId = 'CQB-01',
  opId,
  roster = [],
  events = [],
  actorId = '',
  onCreateMacroEvent,
}: CommsNetworkConsoleProps) {
  const voiceNet = useVoiceNet() as any;
  const [snapshot, setSnapshot] = useState<CommsGraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [bridgeDraftSourceId, setBridgeDraftSourceId] = useState('');
  const [bridgeEdges, setBridgeEdges] = useState<TopologyBridgeEdge[]>([]);
  const [nodePositionOverrides, setNodePositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [schemaChannelPage, setSchemaChannelPage] = useState(0);
  const [compactCardPage, setCompactCardPage] = useState(0);
  const [healthPage, setHealthPage] = useState(0);
  const [directiveDispatches, setDirectiveDispatches] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const topologyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    nodeId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await buildCommsGraphSnapshot({
        variantId,
        opId,
        includeUserNodes: showUsers,
        roster,
      });
      setSnapshot(next);
    } catch (err: any) {
      setError(err?.message || 'Failed to load comms graph.');
    } finally {
      setLoading(false);
    }
  }, [variantId, opId, showUsers, roster]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  useEffect(() => {
    if (!bridgeDraftSourceId) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setBridgeDraftSourceId('');
      setFeedback('Bridge targeting cancelled.');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridgeDraftSourceId]);

  const nodes = snapshot?.nodes || [];
  const edges = snapshot?.edges || [];
  const channels = snapshot?.channels || [];

  useEffect(() => {
    if (!nodes.length) {
      setNodePositionOverrides({});
      setBridgeEdges([]);
      setSelectedNodeId('');
      setBridgeDraftSourceId('');
      return;
    }

    setNodePositionOverrides((prev) => {
      let changed = false;
      const next: Record<string, { x: number; y: number }> = {};
      for (const node of nodes) {
        const prior = prev[node.id];
        const resolvedX = clampPct(prior?.x ?? node.x);
        const resolvedY = clampPct(prior?.y ?? node.y);
        next[node.id] = { x: resolvedX, y: resolvedY };
        if (!prior || prior.x !== resolvedX || prior.y !== resolvedY) changed = true;
      }
      for (const key of Object.keys(prev)) {
        if (!next[key]) changed = true;
      }
      return changed ? next : prev;
    });

    setBridgeEdges((prev) => {
      const nodeIds = new Set(nodes.map((node) => node.id));
      const filtered = prev.filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [nodes]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const override = nodePositionOverrides[node.id];
        if (!override) return node;
        return { ...node, x: override.x, y: override.y };
      }),
    [nodes, nodePositionOverrides]
  );

  const renderedEdges = useMemo(
    () => [
      ...edges,
      ...bridgeEdges.map((edge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: 'monitoring' as const,
        intensity: edge.status === 'degraded' ? 0.52 : 0.9,
        dashed: edge.status === 'degraded',
      })),
    ],
    [edges, bridgeEdges]
  );

  const nodeMap = useMemo(
    () =>
      displayNodes.reduce<Record<string, CommsGraphNode>>((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [displayNodes]
  );

  const channelHealth = useMemo(() => buildCommsChannelHealth({ channels }), [channels]);
  const healthPageCount = Math.max(1, Math.ceil(channelHealth.length / HEALTH_PAGE_SIZE));
  const visibleHealth = useMemo(
    () => channelHealth.slice(healthPage * HEALTH_PAGE_SIZE, healthPage * HEALTH_PAGE_SIZE + HEALTH_PAGE_SIZE),
    [channelHealth, healthPage]
  );

  const voiceParticipants = useMemo(
    () => (Array.isArray(voiceNet?.participants) ? voiceNet.participants : []),
    [voiceNet?.participants]
  );

  const { schemaTree, schemaChannelPageCount } = useMemo(
    () =>
      buildSchemaTree({
        channels,
        edges,
        roster,
        voiceParticipants,
        schemaChannelPage,
      }),
    [channels, edges, roster, voiceParticipants, schemaChannelPage]
  );

  const compactCardsState = useMemo(
    () => buildCompactChannelCards({ schemaTree, page: compactCardPage }),
    [schemaTree, compactCardPage]
  );

  const compactCards = compactCardsState.cards;
  const compactCardPageCount = compactCardsState.pageCount;

  useEffect(() => {
    setSchemaChannelPage((current) => Math.min(current, schemaChannelPageCount - 1));
  }, [schemaChannelPageCount]);

  useEffect(() => {
    setCompactCardPage((current) => Math.min(current, compactCardPageCount - 1));
  }, [compactCardPageCount]);

  useEffect(() => {
    setHealthPage((current) => Math.min(current, healthPageCount - 1));
  }, [healthPageCount]);

  useEffect(() => {
    if (!displayNodes.length) {
      setSelectedNodeId('');
      return;
    }
    if (selectedNodeId && displayNodes.some((node) => node.id === selectedNodeId)) return;
    const firstChannel = displayNodes.find((node) => node.type === 'channel');
    setSelectedNodeId(firstChannel?.id || displayNodes[0].id);
  }, [displayNodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => displayNodes.find((node) => node.id === selectedNodeId) || null,
    [displayNodes, selectedNodeId]
  );

  const bridgedChannelIds = useMemo(() => {
    const result = new Set<string>();
    for (const edge of bridgeEdges) {
      const sourceId = extractChannelId(nodeMap[edge.sourceId]);
      const targetId = extractChannelId(nodeMap[edge.targetId]);
      if (sourceId) result.add(sourceId);
      if (targetId) result.add(targetId);
    }
    return result;
  }, [bridgeEdges, nodeMap]);

  const deliverySurface = useMemo(
    () => buildDeliverySurface({ dispatches: directiveDispatches, events, incidents: [], nowMs }),
    [directiveDispatches, events, nowMs]
  );
  const deliveryStats = useMemo(() => buildDeliveryStats(deliverySurface), [deliverySurface]);
  const feedPage = useMemo(
    () => buildPagedOrders(deliverySurface, 0, ORDER_FEED_PREVIEW_SIZE),
    [deliverySurface]
  );

  const selectedChannelHealth = useMemo(() => {
    const selectedChannelId = extractChannelId(selectedNode);
    if (!selectedChannelId) return null;
    return channelHealth.find((entry) => entry.channelId === selectedChannelId) || null;
  }, [selectedNode, channelHealth]);

  const recommendation = useMemo(
    () => recommendationForDiscipline(selectedChannelHealth?.discipline || 'CLEAR'),
    [selectedChannelHealth?.discipline]
  );

  const emitMacro = useCallback(
    (eventType: CqbEventType, payload: Record<string, unknown>, successMessage: string) => {
      if (onCreateMacroEvent) onCreateMacroEvent(eventType, payload);
      setFeedback(onCreateMacroEvent ? successMessage : `${successMessage} (preview)`);
    },
    [onCreateMacroEvent]
  );

  const dispatchChannelOrder = useCallback(
    (
      action: 'REROUTE' | 'RESTRICT' | 'CHECKIN' | 'BRIDGE',
      channelId: string,
      options?: { targetChannelId?: string; sourceNodeId?: string; targetNodeId?: string }
    ) => {
      if (!channelId) return;

      const mapByAction: Record<
        'REROUTE' | 'RESTRICT' | 'CHECKIN' | 'BRIDGE',
        { eventType: CqbEventType; directive: string; success: string }
      > = {
        REROUTE: { eventType: 'MOVE_OUT', directive: 'REROUTE_TRAFFIC', success: 'Reroute directive sent' },
        RESTRICT: { eventType: 'HOLD', directive: 'RESTRICT_NON_ESSENTIAL', success: 'Restriction directive sent' },
        CHECKIN: { eventType: 'SELF_CHECK', directive: 'CHECK_IN_REQUEST', success: 'Check-in request broadcast' },
        BRIDGE: { eventType: 'MOVE_OUT', directive: 'BRIDGE_NETS', success: 'Bridge order issued' },
      };

      const descriptor = mapByAction[action];
      const dispatch = createOrderDispatch({
        channelId,
        laneId: `lane:${channelId}`,
        directive: descriptor.directive,
        eventType: descriptor.eventType,
        nowMs,
      });
      setDirectiveDispatches((prev) => appendOrderDispatch(prev, dispatch, MAX_ORDER_HISTORY));

      emitMacro(
        descriptor.eventType,
        {
          channelId,
          dispatchId: dispatch.dispatchId,
          directive: descriptor.directive,
          source: 'comms-network-console',
          actorId,
          ...(options?.targetChannelId
            ? {
                targetChannelId: options.targetChannelId,
                sourceNodeId: options.sourceNodeId || null,
                targetNodeId: options.targetNodeId || null,
              }
            : {}),
          ...toCaptureMetadataRecord(
            buildCaptureMetadata({
              mode: DEFAULT_ACQUISITION_MODE,
              source: 'RADIAL_ACTION',
              commandSource: 'comms_topology',
              confirmed: true,
            })
          ),
        },
        descriptor.success
      );

      if (action === 'BRIDGE' && options?.targetChannelId) {
        setFeedback(`Bridge ${channelId} -> ${options.targetChannelId} active`);
      }
    },
    [actorId, emitMacro, nowMs]
  );

  const applyBridgeOrder = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return;
      const sourceNode = nodeMap[sourceNodeId];
      const targetNode = nodeMap[targetNodeId];
      if (!sourceNode || !targetNode) return;
      if (sourceNode.type !== 'channel' || targetNode.type !== 'channel') {
        setFeedback('Bridge actions require two channel nodes.');
        return;
      }
      const sourceChannelId = extractChannelId(sourceNode);
      const targetChannelId = extractChannelId(targetNode);
      if (!sourceChannelId || !targetChannelId) return;

      const bridgeId = `bridge:${sourceNodeId}->${targetNodeId}`;
      setBridgeEdges((prev) => {
        const filtered = prev.filter((edge) => edge.id !== bridgeId);
        return [{ id: bridgeId, sourceId: sourceNodeId, targetId: targetNodeId, status: 'active', createdAtMs: Date.now() }, ...filtered].slice(0, 18);
      });
      setBridgeDraftSourceId('');
      dispatchChannelOrder('BRIDGE', sourceChannelId, { targetChannelId, sourceNodeId, targetNodeId });
    },
    [dispatchChannelOrder, nodeMap]
  );

  const updateNodeFromClientPoint = useCallback((nodeId: string, clientX: number, clientY: number) => {
    const host = topologyRef.current;
    if (!host || !nodeId) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clampPct(((clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((clientY - rect.top) / rect.height) * 100);
    setNodePositionOverrides((prev) => ({ ...prev, [nodeId]: { x, y } }));
  }, []);

  const handleNodePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    if (event.button !== 0) return;
    dragRef.current = {
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setSelectedNodeId(nodeId);
    setRadialOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleNodePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      const current = dragRef.current;
      if (!current || current.nodeId !== nodeId || current.pointerId !== event.pointerId) return;
      const movedX = Math.abs(event.clientX - current.startX);
      const movedY = Math.abs(event.clientY - current.startY);
      if (movedX > 2 || movedY > 2) {
        current.moved = true;
        updateNodeFromClientPoint(nodeId, event.clientX, event.clientY);
      }
    },
    [updateNodeFromClientPoint]
  );

  const handleNodePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
      const current = dragRef.current;
      if (!current || current.nodeId !== nodeId || current.pointerId !== event.pointerId) return;
      if (!current.moved) {
        if (bridgeDraftSourceId) applyBridgeOrder(bridgeDraftSourceId, nodeId);
        else setSelectedNodeId(nodeId);
      }
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [applyBridgeOrder, bridgeDraftSourceId]
  );

  const handleNodeContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.preventDefault();
    const host = topologyRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = clampPct(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((event.clientY - rect.top) / rect.height) * 100);
    setSelectedNodeId(nodeId);
    setRadialAnchor({ x, y });
    setRadialOpen(true);
  }, []);

  const radialItems = useMemo<RadialMenuItem[]>(() => {
    if (!selectedNode) return [];
    const channelId = extractChannelId(selectedNode);
    const canCommandChannel = selectedNode.type === 'channel' && Boolean(channelId);

    const items: RadialMenuItem[] = [
      {
        id: 'reroute',
        label: 'Reroute',
        icon: 'depart',
        tone: 'standard',
        disabled: !canCommandChannel,
        onSelect: () => {
          if (!channelId) return;
          dispatchChannelOrder('REROUTE', channelId);
          setRadialOpen(false);
        },
      },
      {
        id: 'restrict',
        label: 'Restrict',
        icon: 'challenge',
        tone: 'warning',
        disabled: !canCommandChannel,
        onSelect: () => {
          if (!channelId) return;
          dispatchChannelOrder('RESTRICT', channelId);
          setRadialOpen(false);
        },
      },
      {
        id: 'checkin',
        label: 'Check-In',
        icon: 'endorse',
        tone: 'standard',
        disabled: !canCommandChannel,
        onSelect: () => {
          if (!channelId) return;
          dispatchChannelOrder('CHECKIN', channelId);
          setRadialOpen(false);
        },
      },
      {
        id: 'bridge',
        label: bridgeDraftSourceId === selectedNode.id ? 'Cancel Bridge' : 'Bridge Target',
        icon: 'link-op',
        tone: bridgeDraftSourceId === selectedNode.id ? 'danger' : 'standard',
        disabled: selectedNode.type !== 'channel',
        onSelect: () => {
          if (selectedNode.type !== 'channel') return;
          if (bridgeDraftSourceId === selectedNode.id) {
            setBridgeDraftSourceId('');
            setFeedback('Bridge targeting cancelled.');
          } else {
            setBridgeDraftSourceId(selectedNode.id);
            setFeedback(`Select destination channel for ${selectedNode.label}.`);
          }
          setRadialOpen(false);
        },
      },
    ];

    return items;
  }, [bridgeDraftSourceId, dispatchChannelOrder, selectedNode]);

  if (loading) {
    return <PanelLoadingState label="Loading comms graph..." />;
  }

  if (error || !snapshot) {
    return <DegradedStateCard state="OFFLINE" reason={error || 'Comms graph data unavailable.'} actionLabel="Retry" onAction={loadGraph} />;
  }

  return (
    <div className="relative h-full min-h-0 grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Topology</h3>
          <p className="text-xs text-zinc-500 truncate">Select unit, right-click radial command, issue order, verify tactical echo.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NexusButton size="sm" intent={showMonitoring ? 'primary' : 'subtle'} onClick={() => setShowMonitoring((prev) => !prev)}>
            Monitoring
          </NexusButton>
          <NexusButton size="sm" intent={showUsers ? 'primary' : 'subtle'} onClick={() => setShowUsers((prev) => !prev)}>
            Users
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={loadGraph}>
            <RefreshCcw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </NexusButton>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
        <NexusBadge tone="active">Channels {channels.length}</NexusBadge>
        <NexusBadge tone="neutral">Nodes {nodes.length}</NexusBadge>
        <NexusBadge tone="neutral">Edges {renderedEdges.length}</NexusBadge>
        <NexusBadge tone={bridgeDraftSourceId ? 'warning' : 'neutral'}>Bridge {bridgeDraftSourceId ? 'ARMED' : 'IDLE'}</NexusBadge>
        <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : 'warning'}>Delivery {deliveryStats.confidencePct}%</NexusBadge>
        <NexusBadge tone="neutral">Cards {compactCardsState.total}</NexusBadge>
      </div>

      <div className="min-h-0 grid gap-2 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-h-0 flex flex-col gap-2">
          <div
            ref={topologyRef}
            className="flex-1 min-h-[240px] rounded border border-zinc-800 bg-zinc-950/65 p-2 relative overflow-hidden"
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => {
              if (event.target === event.currentTarget) setRadialOpen(false);
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(179,90,47,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(179,90,47,0.18) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {renderedEdges.map((edge: CommsGraphEdge) => {
                const source = nodeMap[edge.sourceId];
                const target = nodeMap[edge.targetId];
                if (!source || !target) return null;

                const isBridgeEdge = edge.id.startsWith('bridge:');
                const isMonitoring = edge.type === 'monitoring';
                const visible = isBridgeEdge ? true : isMonitoring ? showMonitoring : true;
                const width = isBridgeEdge ? 2.2 : 1 + edge.intensity * 2.1;
                const opacity = visible ? (isBridgeEdge ? 0.95 : 0.3 + edge.intensity * 0.7) : 0;
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isBridgeEdge ? 'rgba(251,146,60,0.9)' : isMonitoring ? 'rgba(180,150,120,0.62)' : 'rgba(179,90,47,0.72)'}
                    strokeWidth={width}
                    strokeDasharray={isBridgeEdge ? '3.2 1.2' : isMonitoring ? '2.5 2.5' : undefined}
                    style={{ opacity }}
                  />
                );
              })}
            </svg>

            {displayNodes.map((node) => {
              const isUser = node.type === 'user';
              const visible = isUser ? showUsers : true;
              if (!visible) return null;

              const isSelected = node.id === selectedNodeId;
              const isBridgeSource = node.id === bridgeDraftSourceId;
              const isBridgeTarget = Boolean(bridgeDraftSourceId && bridgeDraftSourceId !== node.id && node.type === 'channel');
              const glow = node.intensity > 0 ? 8 + node.intensity * 18 : 0;
              const sizePx = Math.round(26 + node.size * 0.6);

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    data-comms-node="true"
                    data-node-id={node.id}
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    onPointerMove={(event) => handleNodePointerMove(event, node.id)}
                    onPointerUp={(event) => handleNodePointerUp(event, node.id)}
                    onPointerCancel={() => {
                      dragRef.current = null;
                    }}
                    onContextMenu={(event) => handleNodeContextMenu(event, node.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (bridgeDraftSourceId) applyBridgeOrder(bridgeDraftSourceId, node.id);
                        else setSelectedNodeId(node.id);
                      }
                      if (event.key.toLowerCase() === 'r') {
                        event.preventDefault();
                        setRadialAnchor({ x: node.x, y: node.y });
                        setSelectedNodeId(node.id);
                        setRadialOpen(true);
                      }
                    }}
                    className="rounded-md border px-2 py-1 text-[10px] text-zinc-100 text-center whitespace-nowrap cursor-grab active:cursor-grabbing outline-none focus-visible:ring-1 focus-visible:ring-orange-300/70"
                    style={{
                      minWidth: `${sizePx}px`,
                      background: nodeFill(node),
                      borderColor: isBridgeSource
                        ? 'rgba(251,191,36,0.95)'
                        : isSelected
                          ? 'rgba(251,146,60,0.9)'
                          : isBridgeTarget
                            ? 'rgba(250,204,21,0.65)'
                            : nodeBorder(node),
                      boxShadow: glow > 0 ? `0 0 ${glow}px rgba(179,90,47,0.42)` : 'none',
                    }}
                    title={`${node.label}${node.type === 'channel' ? ` · activity ${Math.round(node.intensity * 100)}%` : ''}`}
                  >
                    <div className="font-semibold uppercase tracking-wide inline-flex items-center justify-center gap-1">
                      <img src={topologyNodeTokenIcon(node.type)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                      <span>{node.label}</span>
                    </div>
                    {node.type === 'channel' ? <div className="text-[9px] text-zinc-300">{Math.round(node.intensity * 100)}%</div> : null}
                  </div>
                </div>
              );
            })}

            {bridgeDraftSourceId ? (
              <div className="absolute left-2 top-2 rounded border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                Bridge target active. Select destination channel.
              </div>
            ) : null}

            {selectedNode ? (
              <div className="absolute right-2 top-2 rounded border border-zinc-700 bg-zinc-950/85 px-2 py-1 text-[10px] text-zinc-300 max-w-[220px] truncate">
                Selected: {selectedNode.label}
              </div>
            ) : null}

            <RadialMenu
              open={radialOpen}
              title={selectedNode ? `${selectedNode.label} Command` : 'Node Command'}
              anchor={radialAnchor}
              items={radialItems}
              onClose={() => setRadialOpen(false)}
            />
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-400" />
                Channel Health
              </div>
              <div className="flex items-center gap-1.5">
                <NexusButton size="sm" intent="subtle" onClick={() => setHealthPage((prev) => Math.max(0, prev - 1))} disabled={healthPage === 0}>
                  Prev
                </NexusButton>
                <NexusBadge tone="neutral">
                  {healthPage + 1}/{healthPageCount}
                </NexusBadge>
                <NexusButton size="sm" intent="subtle" onClick={() => setHealthPage((prev) => Math.min(healthPageCount - 1, prev + 1))} disabled={healthPage >= healthPageCount - 1}>
                  Next
                </NexusButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visibleHealth.map((entry) => (
                <div key={entry.channelId} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200 truncate">{entry.label}</span>
                    <div className="flex items-center gap-1">
                      {bridgedChannelIds.has(entry.channelId) ? <NexusBadge tone="active">BR</NexusBadge> : null}
                      <img src={channelStatusTokenIcon(entry.discipline)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                      <NexusBadge tone={entry.discipline === 'SATURATED' ? 'danger' : entry.discipline === 'BUSY' ? 'warning' : 'ok'}>
                        {entry.discipline}
                      </NexusBadge>
                    </div>
                  </div>
                  <div className="mt-1 text-zinc-500">Q {entry.qualityPct}% · {entry.latencyMs}ms · M {entry.membershipCount}</div>
                </div>
              ))}
              {visibleHealth.length === 0 ? (
                <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px] text-zinc-500 md:col-span-2">
                  No channels in current graph snapshot.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="min-h-0 rounded border border-zinc-800 bg-zinc-900/40 p-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-orange-300">Tactical Recommendation</div>
              <div className="text-sm font-semibold text-zinc-100 mt-0.5">{recommendation.label}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{recommendation.detail}</div>
            </div>
            <NexusButton
              size="sm"
              intent="primary"
              className="shrink-0"
              onClick={() => {
                const channelId = extractChannelId(selectedNode);
                if (!channelId) return;
                dispatchChannelOrder(recommendation.action, channelId);
              }}
              disabled={!extractChannelId(selectedNode)}
            >
              Execute
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </NexusButton>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-zinc-300 uppercase tracking-wide">Comms Channel Cards</div>
              <div className="flex items-center gap-1.5">
                <NexusButton size="sm" intent="subtle" onClick={() => setSchemaChannelPage((prev) => Math.max(0, prev - 1))} disabled={schemaChannelPage === 0}>
                  Lane Prev
                </NexusButton>
                <NexusBadge tone="neutral">{schemaChannelPage + 1}/{schemaChannelPageCount}</NexusBadge>
                <NexusButton size="sm" intent="subtle" onClick={() => setSchemaChannelPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))} disabled={schemaChannelPage >= schemaChannelPageCount - 1}>
                  Lane Next
                </NexusButton>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <NexusButton size="sm" intent="subtle" onClick={() => setCompactCardPage((prev) => Math.max(0, prev - 1))} disabled={compactCardPage === 0}>
                Card Prev
              </NexusButton>
              <NexusBadge tone="neutral">{compactCardPage + 1}/{compactCardPageCount}</NexusBadge>
              <NexusButton size="sm" intent="subtle" onClick={() => setCompactCardPage((prev) => Math.min(compactCardPageCount - 1, prev + 1))} disabled={compactCardPage >= compactCardPageCount - 1}>
                Card Next
              </NexusButton>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {compactCards.map((card) => (
                <article key={card.id} className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={tokenAssets.comms.vehicle} alt="" className="w-4 h-4 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{card.vehicleLabel}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">{card.wingLabel} · {card.squadLabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <img src={vehicleStatusTokenIcon(card.vehicleStatus)} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                      <NexusBadge tone={vehicleStatusTone(card.vehicleStatus)}>{card.vehicleStatus}</NexusBadge>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <img src={tokenAssets.comms.channel} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                      <span className="text-[9px] text-zinc-300 truncate">{card.channelLabel}</span>
                      {bridgedChannelIds.has(card.channelId) ? <NexusBadge tone="active">BR</NexusBadge> : null}
                    </div>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-wide shrink-0">Crew {card.crewCount}</span>
                  </div>

                  <div className="mt-0.5 text-[8px] text-zinc-500 truncate">{card.channelStatus}</div>

                  <div className="mt-1 grid grid-cols-1 gap-0.5">
                    {card.operators.length > 0 ? (
                      card.operators.map((operator) => (
                        <div key={operator.id} className="flex items-center justify-between gap-1 rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <img src={roleTokenIcon(operator.role)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            <span className="text-[9px] text-zinc-200 truncate">{operator.callsign}</span>
                            <span className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">{operator.role}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <img src={operatorStatusTokenIcon(operator.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            <NexusBadge tone={operatorStatusTone(operator.status)}>{operator.status}</NexusBadge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5 text-[9px] text-zinc-500">No operators assigned.</div>
                    )}
                  </div>
                </article>
              ))}
              {compactCards.length === 0 ? (
                <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2 text-[10px] text-zinc-500">
                  No compact cards available for this lane page.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {feedback ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5">
          <div className="text-[10px] text-orange-300 inline-flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {feedback}
          </div>
        </div>
      ) : null}
    </div>
  );
}