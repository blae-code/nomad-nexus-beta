import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Radio,
  RefreshCcw,
  Send,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import type { CommsGraphEdge, CommsGraphNode, CommsGraphSnapshot } from '../../services/commsGraphService';
import {
  buildCommsChannelHealth,
  buildCommsIncidentCandidates,
  canTransitionIncidentStatus,
  normalizeIncidentStatusById,
  sortCommsIncidents,
  type CommsIncidentStatus,
} from '../../services/commsIncidentService';
import {
  buildCommsDirectiveThreads,
  buildCommsDisciplineAlerts,
  createDirectiveDispatchRecord,
  reconcileDirectiveDispatches,
  type DirectiveDeliveryState,
  type DisciplineAlert,
  type DirectiveDispatchRecord,
} from '../../services/commsFocusDirectiveService';
import { DEFAULT_ACQUISITION_MODE, buildCaptureMetadata, toCaptureMetadataRecord } from '../../services/dataAcquisitionPolicyService';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import { PanelLoadingState } from '../loading';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import RadialMenu, { type RadialMenuItem } from '../map/RadialMenu';
import { getTokenAssetUrl, tokenAssets, tokenCatalog } from '../tokens';
import {
  channelStatusTokenIcon,
  operatorStatusTone,
  operatorStatusTokenIcon,
  resolveSquadLabel,
  roleTokenIcon,
  topologyNodeTokenIcon,
  vehicleStatusTone,
  vehicleStatusTokenIcon,
  wingLabelByElement,
  wingTokenIcon,
  squadTokenIcon,
} from './commsTokenSemantics';

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}
interface TopologyBridgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'active' | 'degraded';
  createdAtMs: number;
}

const LIST_PAGE_SIZE = 5;
const VOICE_LIST_PAGE_SIZE = 4;
const ORDER_LIST_PAGE_SIZE = 5;
const SCHEMA_CHANNEL_PAGE_SIZE = 5;
const CREW_CARD_PAGE_SIZE = 4;

const INCIDENT_EVENT_BY_STATUS: Record<'ACKED' | 'ASSIGNED' | 'RESOLVED', CqbEventType> = {
  ACKED: 'ROGER',
  ASSIGNED: 'WILCO',
  RESOLVED: 'CLEAR_COMMS',
};

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

function formatAge(nowMs: number, createdAtMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - createdAtMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function isParticipantSpeaking(participant: any): boolean {
  if (participant?.isSpeaking) return true;
  const state = String(participant?.state || '').toUpperCase();
  return state.includes('TALK') || state.includes('TX') || state.includes('SPEAK');
}

function disciplineAlertTone(severity: DisciplineAlert['severity']): 'danger' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'neutral';
}

function deliveryTone(status: DirectiveDeliveryState): 'warning' | 'active' | 'ok' {
  if (status === 'QUEUED') return 'warning';
  if (status === 'PERSISTED') return 'active';
  return 'ok';
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

function toToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isMutedParticipant(participant: any): boolean {
  if (participant?.muted === true) return true;
  return String(participant?.state || '').toUpperCase().includes('MUTE');
}

function resolveVehicleBucket(member: { role: string; element: string; callsign: string }, channelId: string): { id: string; label: string } {
  const roleToken = toToken(member.role);
  if (member.element === 'ACE' || roleToken.includes('pilot') || roleToken.includes('gunship')) {
    return {
      id: `${channelId}:vehicle:flight`,
      label: 'Flight Element',
    };
  }
  if (roleToken.includes('medic') || roleToken.includes('medical')) {
    return {
      id: `${channelId}:vehicle:medevac`,
      label: 'Medevac Platform',
    };
  }
  if (member.element === 'CE' || roleToken.includes('lead') || roleToken.includes('signal') || roleToken.includes('command')) {
    return {
      id: `${channelId}:vehicle:c2`,
      label: 'Command Relay',
    };
  }
  return {
    id: `${channelId}:vehicle:assault`,
    label: 'Assault Transport',
  };
}

function operatorStatusPriority(status: string): number {
  if (status === 'TX') return 0;
  if (status === 'ON-NET') return 1;
  if (status === 'MUTED') return 2;
  return 3;
}

export default function CommsNetworkConsole({
  variantId = 'CQB-01',
  opId,
  roster = [],
  events = [],
  actorId = '',
  onCreateMacroEvent,
}: CommsNetworkConsoleProps) {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const voiceNet = useVoiceNet() as any;
  const [snapshot, setSnapshot] = useState<CommsGraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [healthPage, setHealthPage] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentStatusById, setIncidentStatusById] = useState<Record<string, CommsIncidentStatus>>({});
  const [feedback, setFeedback] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [voicePage, setVoicePage] = useState(0);
  const [schemaChannelPage, setSchemaChannelPage] = useState(0);
  const [crewCardPage, setCrewCardPage] = useState(0);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [rightPanelView, setRightPanelView] = useState<'cards' | 'schema'>('cards');
  const [showTokenAtlas, setShowTokenAtlas] = useState(false);
  const [directiveDispatches, setDirectiveDispatches] = useState<DirectiveDispatchRecord[]>([]);
  const [ordersPage, setOrdersPage] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [bridgeDraftSourceId, setBridgeDraftSourceId] = useState('');
  const [bridgeEdges, setBridgeEdges] = useState<TopologyBridgeEdge[]>([]);
  const [schemaExpandedById, setSchemaExpandedById] = useState<Record<string, boolean>>({
    'fleet:redscar': true,
    'wing:CE': true,
    'squad:CE:Command Cell': true,
  });
  const [nodePositionOverrides, setNodePositionOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
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
      setFeedback('Bridge target mode cleared.');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridgeDraftSourceId]);

  const nodes = snapshot?.nodes || [];
  const edges = snapshot?.edges || [];

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
        if (prev[node.id]) {
          next[node.id] = prev[node.id];
          continue;
        }
        next[node.id] = { x: node.x, y: node.y };
        changed = true;
      }
      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
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
        return {
          ...node,
          x: override.x,
          y: override.y,
        };
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

  const channels = snapshot?.channels || [];
  const channelHealth = useMemo(() => buildCommsChannelHealth({ channels }), [channels]);

  const incidentCandidates = useMemo(
    () => buildCommsIncidentCandidates({ channelHealth, events, nowMs }),
    [channelHealth, events, nowMs]
  );

  useEffect(() => {
    setIncidentStatusById((prev) => normalizeIncidentStatusById(incidentCandidates, prev));
  }, [incidentCandidates]);

  const incidents = useMemo(
    () => sortCommsIncidents(incidentCandidates, incidentStatusById),
    [incidentCandidates, incidentStatusById]
  );
  const degradedChannelCount = useMemo(
    () => channelHealth.filter((entry) => entry.discipline !== 'CLEAR').length,
    [channelHealth]
  );
  const unresolvedIncidentCount = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED').length,
    [incidents]
  );
  const criticalIncidentCount = useMemo(
    () => incidents.filter((incident) => incident.priority === 'CRITICAL' && incident.status !== 'RESOLVED').length,
    [incidents]
  );
  const directiveThreads = useMemo(
    () => buildCommsDirectiveThreads({ channelHealth, incidents, events, nowMs }),
    [channelHealth, incidents, events, nowMs]
  );
  const selectedThread = directiveThreads.find((lane) => lane.id === selectedThreadId) || null;
  const deliverySurface = useMemo(
    () =>
      reconcileDirectiveDispatches({
        dispatches: directiveDispatches,
        events,
        incidents,
        nowMs,
      }),
    [directiveDispatches, events, incidents, nowMs]
  );
  const deliveryStats = useMemo(() => {
    const total = deliverySurface.length;
    const queued = deliverySurface.filter((entry) => entry.status === 'QUEUED').length;
    const persisted = deliverySurface.filter((entry) => entry.status === 'PERSISTED').length;
    const acked = deliverySurface.filter((entry) => entry.status === 'ACKED').length;
    const confidencePct = total > 0 ? Math.round((acked / total) * 100) : 100;
    return { total, queued, persisted, acked, confidencePct };
  }, [deliverySurface]);
  const ordersPageCount = Math.max(1, Math.ceil(deliverySurface.length / ORDER_LIST_PAGE_SIZE));
  const visibleOrders = useMemo(
    () => deliverySurface.slice(ordersPage * ORDER_LIST_PAGE_SIZE, ordersPage * ORDER_LIST_PAGE_SIZE + ORDER_LIST_PAGE_SIZE),
    [deliverySurface, ordersPage]
  );

  const healthPageCount = Math.max(1, Math.ceil(channelHealth.length / LIST_PAGE_SIZE));
  const visibleHealth = channelHealth.slice(healthPage * LIST_PAGE_SIZE, healthPage * LIST_PAGE_SIZE + LIST_PAGE_SIZE);
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;
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

  const voiceRuntimeUser = useMemo(() => {
    const profile = user?.member_profile_data || {};
    const resolvedId = profile.id || user?.member_profile_id || user?.id || actorId || '';
    if (!resolvedId) return null;
    const roles = Array.isArray(profile.roles)
      ? profile.roles
      : Array.isArray(user?.roles)
        ? user.roles
        : [];
    return {
      ...profile,
      id: resolvedId,
      callsign: profile.callsign || user?.callsign || resolvedId,
      rank: profile.rank || user?.rank || '',
      roles,
      membership: profile.membership || profile.tier || 'MEMBER',
    };
  }, [user, actorId]);

  const voiceNets = useMemo(() => (Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : []), [voiceNet.voiceNets]);
  const voicePageCount = Math.max(1, Math.ceil(voiceNets.length / VOICE_LIST_PAGE_SIZE));
  const visibleVoiceNets = voiceNets.slice(voicePage * VOICE_LIST_PAGE_SIZE, voicePage * VOICE_LIST_PAGE_SIZE + VOICE_LIST_PAGE_SIZE);
  const monitoredVoiceSet = useMemo(
    () => new Set((Array.isArray(voiceNet.monitoredNetIds) ? voiceNet.monitoredNetIds : []).map((id: unknown) => String(id || ''))),
    [voiceNet.monitoredNetIds]
  );
  const voiceParticipants = useMemo(
    () => (Array.isArray(voiceNet.participants) ? voiceNet.participants : []),
    [voiceNet.participants]
  );
  const activeSpeakers = useMemo(
    () => voiceParticipants.filter((participant: any) => isParticipantSpeaking(participant)).slice(0, 4),
    [voiceParticipants]
  );
  const disciplineAlerts = useMemo(
    () =>
      buildCommsDisciplineAlerts({
        events,
        incidents,
        nowMs,
        activeSpeakers: activeSpeakers.length,
        degradedChannelCount,
      }),
    [events, incidents, nowMs, activeSpeakers.length, degradedChannelCount]
  );
  const activeVoiceNetId = String(voiceNet.activeNetId || voiceNet.transmitNetId || '').trim();
  const activeVoiceDiscipline = activeVoiceNetId ? (voiceNet.disciplineModeByNet?.[activeVoiceNetId] || 'PTT') : 'PTT';
  const secureModeEnabled = Boolean(activeVoiceNetId && voiceNet.secureModeByNet?.[activeVoiceNetId]?.enabled);
  const channelHealthById = useMemo(
    () =>
      channelHealth.reduce<Record<string, (typeof channelHealth)[number]>>((acc, entry) => {
        acc[entry.channelId] = entry;
        return acc;
      }, {}),
    [channelHealth]
  );
  const participantByMemberId = useMemo(() => {
    const map = new Map<string, any>();
    for (const participant of voiceParticipants) {
      const id = String(participant?.memberProfileId || participant?.userId || participant?.id || '').trim();
      if (!id) continue;
      map.set(id, participant);
    }
    return map;
  }, [voiceParticipants]);
  const explicitChannelMembersById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.type !== 'membership') continue;
      if (!edge.sourceId.startsWith('user:') || !edge.targetId.startsWith('channel:')) continue;
      const memberId = edge.sourceId.replace('user:', '');
      const channelId = edge.targetId.replace('channel:', '');
      if (!memberId || !channelId) continue;
      const next = map.get(channelId) || [];
      if (!next.includes(memberId)) next.push(memberId);
      map.set(channelId, next);
    }
    return map;
  }, [edges]);
  const fallbackChannelMembersById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const channel of channels) {
      const token = toToken(`${channel.id} ${channel.label}`);
      const memberIds = roster
        .filter((member) => {
          const roleToken = toToken(member.role);
          if (token.includes('command') || token.includes('coord')) {
            return member.element === 'CE' || roleToken.includes('lead') || roleToken.includes('signal');
          }
          if (token.includes('log')) {
            return member.element === 'ACE' || roleToken.includes('logistic') || roleToken.includes('medic');
          }
          if (token.includes('alpha') || token.includes('bravo') || token.includes('squad')) {
            return member.element === 'GCE';
          }
          return true;
        })
        .map((member) => member.id);
      map.set(channel.id, memberIds);
    }
    return map;
  }, [channels, roster]);
  const schemaChannelPageCount = Math.max(1, Math.ceil(channels.length / SCHEMA_CHANNEL_PAGE_SIZE));
  const visibleSchemaChannels = useMemo(
    () =>
      channels.slice(
        schemaChannelPage * SCHEMA_CHANNEL_PAGE_SIZE,
        schemaChannelPage * SCHEMA_CHANNEL_PAGE_SIZE + SCHEMA_CHANNEL_PAGE_SIZE
      ),
    [channels, schemaChannelPage]
  );
  const schemaTree = useMemo(() => {
    const wings = [
      { id: 'CE', label: wingLabelByElement('CE') },
      { id: 'ACE', label: wingLabelByElement('ACE') },
      { id: 'GCE', label: wingLabelByElement('GCE') },
    ];
    return wings.map((wing) => {
      const squadByLabel = new Map<string, any>();
      for (const channel of visibleSchemaChannels) {
        const channelId = channel.id;
        const explicitIds = explicitChannelMembersById.get(channelId) || [];
        const fallbackIds = fallbackChannelMembersById.get(channelId) || [];
        const resolvedMemberIds = explicitIds.length > 0 ? explicitIds : fallbackIds;
        const channelMembers = roster.filter((member) => resolvedMemberIds.includes(member.id) && member.element === wing.id);
        if (!channelMembers.length && wing.id !== 'CE') continue;

        const squadLabel = resolveSquadLabel(channel.id, channel.label);
        const squadKey = `${wing.id}:${squadLabel}`;
        const squad =
          squadByLabel.get(squadKey) ||
          {
            id: squadKey,
            label: squadLabel,
            channels: [],
          };

        const vehiclesById = new Map<string, any>();
        for (const member of channelMembers) {
          const vehicle = resolveVehicleBucket(member, channel.id);
          const bucket =
            vehiclesById.get(vehicle.id) ||
            {
              id: vehicle.id,
              label: vehicle.label,
              operators: [],
            };
          const participant = participantByMemberId.get(member.id);
          const status = isParticipantSpeaking(participant)
            ? 'TX'
            : isMutedParticipant(participant)
              ? 'MUTED'
              : participant
                ? 'ON-NET'
                : 'OFF-NET';
          bucket.operators.push({
            id: member.id,
            callsign: member.callsign,
            role: member.role,
            status,
          });
          vehiclesById.set(vehicle.id, bucket);
        }

        const vehicles = [...vehiclesById.values()].map((vehicle) => {
          const txCount = vehicle.operators.filter((entry: any) => entry.status === 'TX').length;
          const mutedCount = vehicle.operators.filter((entry: any) => entry.status === 'MUTED').length;
          const channelState = channelHealthById[channelId];
          const basicStatus =
            channelState?.discipline === 'SATURATED'
              ? 'DEGRADED'
              : txCount > 0
                ? 'ACTIVE'
                : mutedCount > 0
                  ? 'MIXED'
                  : 'READY';
          return {
            ...vehicle,
            basicStatus,
            crewCount: vehicle.operators.length,
          };
        });
        const channelState = channelHealthById[channel.id];
        const channelStatus = channelState
          ? `${channelState.discipline} · Q${channelState.qualityPct}% · ${channelState.latencyMs}ms`
          : 'No health telemetry';
        squad.channels.push({
          id: channel.id,
          label: channel.label,
          status: channelStatus,
          membershipCount: channel.membershipCount,
          vehicles,
        });
        squadByLabel.set(squadKey, squad);
      }
      return {
        ...wing,
        squads: [...squadByLabel.values()],
      };
    });
  }, [
    visibleSchemaChannels,
    explicitChannelMembersById,
    fallbackChannelMembersById,
    roster,
    participantByMemberId,
    channelHealthById,
  ]);
  const crewCards = useMemo(() => {
    const cards: Array<{
      id: string;
      wingId: string;
      wingLabel: string;
      squadLabel: string;
      channelId: string;
      channelLabel: string;
      channelStatus: string;
      vehicleLabel: string;
      vehicleStatus: string;
      crewCount: number;
      operators: Array<{ id: string; callsign: string; role: string; status: string }>;
    }> = [];

    for (const wing of schemaTree) {
      for (const squad of wing.squads) {
        for (const channel of squad.channels) {
          if (!Array.isArray(channel.vehicles) || channel.vehicles.length === 0) {
            cards.push({
              id: `card:${wing.id}:${squad.id}:${channel.id}:empty`,
              wingId: wing.id,
              wingLabel: wing.label,
              squadLabel: squad.label,
              channelId: channel.id,
              channelLabel: channel.label,
              channelStatus: channel.status,
              vehicleLabel: 'Unassigned Platform',
              vehicleStatus: 'READY',
              crewCount: 0,
              operators: [],
            });
            continue;
          }

          for (const vehicle of channel.vehicles) {
            const sortedOperators = [...vehicle.operators].sort((a: any, b: any) => {
              const priorityDelta = operatorStatusPriority(a.status) - operatorStatusPriority(b.status);
              if (priorityDelta !== 0) return priorityDelta;
              return String(a.callsign || a.id).localeCompare(String(b.callsign || b.id));
            });
            cards.push({
              id: `card:${wing.id}:${squad.id}:${channel.id}:${vehicle.id}`,
              wingId: wing.id,
              wingLabel: wing.label,
              squadLabel: squad.label,
              channelId: channel.id,
              channelLabel: channel.label,
              channelStatus: channel.status,
              vehicleLabel: vehicle.label,
              vehicleStatus: vehicle.basicStatus,
              crewCount: Number(vehicle.crewCount || vehicle.operators.length || 0),
              operators: sortedOperators.slice(0, 3),
            });
          }
        }
      }
    }

    return cards.slice(0, 32);
  }, [schemaTree]);
  const crewCardPageCount = Math.max(1, Math.ceil(crewCards.length / CREW_CARD_PAGE_SIZE));
  const visibleCrewCards = useMemo(
    () =>
      crewCards.slice(
        crewCardPage * CREW_CARD_PAGE_SIZE,
        crewCardPage * CREW_CARD_PAGE_SIZE + CREW_CARD_PAGE_SIZE
      ),
    [crewCards, crewCardPage]
  );

  const commandRecommendation = useMemo(() => {
    if (selectedIncident) {
      if (selectedIncident.status === 'NEW') {
        return {
          label: 'Acknowledge Incident',
          detail: 'Confirm ownership before dispatching reroutes.',
          action: 'ACK' as const,
        };
      }
      if (selectedIncident.status === 'ACKED') {
        return {
          label: 'Assign Resolution Element',
          detail: 'Lock responsible team and begin mitigation.',
          action: 'ASSIGN' as const,
        };
      }
      if (selectedIncident.status === 'ASSIGNED') {
        return {
          label: 'Issue Reroute Directive',
          detail: 'Reduce traffic pressure while recovery executes.',
          action: 'REROUTE' as const,
        };
      }
      return {
        label: 'Incident Resolved',
        detail: 'Run check-in broadcast to confirm net stability.',
        action: 'CHECKIN' as const,
      };
    }

    if (criticalIncidentCount > 0) {
      return {
        label: 'Prioritize Critical Queue',
        detail: 'Select a critical incident and acknowledge immediately.',
        action: 'FOCUS_CRITICAL' as const,
      };
    }

    if (degradedChannelCount > 0) {
      return {
        label: 'Stabilize Degraded Lanes',
        detail: 'Issue restriction directive to protect command traffic.',
        action: 'RESTRICT' as const,
      };
    }

    return {
      label: 'Maintain Readiness',
      detail: 'Run periodic check-in to verify net discipline.',
      action: 'CHECKIN' as const,
    };
  }, [selectedIncident, criticalIncidentCount, degradedChannelCount]);

  useEffect(() => {
    setHealthPage((prev) => Math.min(prev, healthPageCount - 1));
  }, [healthPageCount]);

  useEffect(() => {
    setVoicePage((prev) => Math.min(prev, voicePageCount - 1));
  }, [voicePageCount]);

  useEffect(() => {
    setSchemaChannelPage((prev) => Math.min(prev, schemaChannelPageCount - 1));
  }, [schemaChannelPageCount]);

  useEffect(() => {
    setCrewCardPage((prev) => Math.min(prev, crewCardPageCount - 1));
  }, [crewCardPageCount]);

  useEffect(() => {
    setOrdersPage((prev) => Math.min(prev, ordersPageCount - 1));
  }, [ordersPageCount]);

  useEffect(() => {
    if (!incidents.length) {
      setSelectedIncidentId('');
      return;
    }
    const exists = incidents.some((incident) => incident.id === selectedIncidentId);
    if (exists) return;
    const firstUnresolved = incidents.find((incident) => incident.status !== 'RESOLVED');
    setSelectedIncidentId(firstUnresolved?.id || incidents[0].id);
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    if (!directiveThreads.length) {
      setSelectedThreadId('');
      return;
    }
    const exists = directiveThreads.some((lane) => lane.id === selectedThreadId);
    if (exists) return;
    setSelectedThreadId(directiveThreads[0].id);
  }, [directiveThreads, selectedThreadId]);

  useEffect(() => {
    if (!displayNodes.length) {
      setSelectedNodeId('');
      return;
    }
    if (selectedNodeId && displayNodes.some((node) => node.id === selectedNodeId)) return;
    const firstChannel = displayNodes.find((node) => node.type === 'channel');
    setSelectedNodeId(firstChannel?.id || displayNodes[0].id);
  }, [displayNodes, selectedNodeId]);

  const emitMacro = useCallback(
    (eventType: CqbEventType, payload: Record<string, unknown>, successMessage: string) => {
      if (onCreateMacroEvent) onCreateMacroEvent(eventType, payload);
      setFeedback(onCreateMacroEvent ? successMessage : `${successMessage} (preview)`);
    },
    [onCreateMacroEvent]
  );

  const emitDirectiveMacro = useCallback(
    (input: {
      eventType: CqbEventType;
      channelId: string;
      directive: string;
      successMessage: string;
      incidentId?: string;
      laneId?: string;
      payload?: Record<string, unknown>;
    }) => {
      const dispatch = createDirectiveDispatchRecord({
        channelId: input.channelId,
        laneId: input.laneId,
        directive: input.directive,
        eventType: input.eventType,
        incidentId: input.incidentId,
        nowMs,
      });
      setDirectiveDispatches((prev) => [dispatch, ...prev].slice(0, 18));
      emitMacro(
        input.eventType,
        {
          channelId: input.channelId,
          dispatchId: dispatch.dispatchId,
          directive: input.directive,
          laneId: input.laneId || dispatch.laneId,
          incidentId: input.incidentId || null,
          source: 'comms-network-console',
          actorId,
          ...toCaptureMetadataRecord(
            buildCaptureMetadata({
              mode: DEFAULT_ACQUISITION_MODE,
              source: 'OPERATOR_FORM',
              commandSource: 'comms_network_console',
              confirmed: true,
            })
          ),
          ...(input.payload || {}),
        },
        input.successMessage
      );
    },
    [emitMacro, nowMs, actorId]
  );

  const transitionIncident = useCallback(
    (nextStatus: 'ACKED' | 'ASSIGNED' | 'RESOLVED') => {
      if (!selectedIncident) return;
      if (!canTransitionIncidentStatus(selectedIncident.status, nextStatus)) return;

      setIncidentStatusById((prev) => ({ ...prev, [selectedIncident.id]: nextStatus }));
      const scopedChannelId = selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : undefined;
      emitDirectiveMacro({
        eventType: INCIDENT_EVENT_BY_STATUS[nextStatus],
        channelId: scopedChannelId || 'UNSCOPED',
        incidentId: selectedIncident.id,
        directive: `INCIDENT_${nextStatus}`,
        successMessage: `Incident ${nextStatus.toLowerCase()}`,
        payload: {
          priority: selectedIncident.priority,
          incidentStatus: nextStatus,
        },
      });
    },
    [selectedIncident, emitDirectiveMacro]
  );

  const dispatchDirective = useCallback(
    (
      directive: 'REROUTE' | 'RESTRICT' | 'CHECKIN',
      options?: { channelId?: string; laneId?: string; incidentId?: string }
    ) => {
      const fallbackChannelId = channelHealth[0]?.channelId;
      const incidentChannelId = selectedIncident?.channelId && selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : '';
      const threadChannelId = selectedThread?.channelId && selectedThread.channelId !== 'UNSCOPED' ? selectedThread.channelId : '';
      const channelId = options?.channelId || incidentChannelId || threadChannelId || fallbackChannelId || '';
      if (!channelId) return;
      const incidentId = options?.incidentId || selectedIncident?.id || '';
      const laneId = options?.laneId || selectedThread?.id || '';

      if (directive === 'REROUTE') {
        emitDirectiveMacro({
          eventType: 'MOVE_OUT',
          channelId,
          laneId,
          incidentId,
          directive: 'REROUTE_TRAFFIC',
          successMessage: 'Reroute directive sent',
        });
        return;
      }

      if (directive === 'RESTRICT') {
        emitDirectiveMacro({
          eventType: 'HOLD',
          channelId,
          laneId,
          incidentId,
          directive: 'RESTRICT_NON_ESSENTIAL',
          successMessage: 'Net restriction directive sent',
        });
        return;
      }

      emitDirectiveMacro({
        eventType: 'SELF_CHECK',
        channelId,
        laneId,
        incidentId,
        directive: 'CHECK_IN_REQUEST',
        successMessage: 'Check-in request broadcast',
      });
    },
    [channelHealth, selectedIncident, selectedThread, emitDirectiveMacro]
  );

  const createActionOrder = useCallback(() => {
    const channelId =
      (selectedIncident?.channelId && selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : '') ||
      (selectedThread?.channelId && selectedThread.channelId !== 'UNSCOPED' ? selectedThread.channelId : '') ||
      channelHealth[0]?.channelId ||
      '';
    if (!channelId) return;
    emitDirectiveMacro({
      eventType: 'MOVE_OUT',
      channelId,
      laneId: selectedThread?.id || '',
      incidentId: selectedIncident?.id || '',
      directive: 'CREATE_ACTION_ORDER',
      successMessage: 'Action order created',
      payload: {
        orderType: 'COMMS_STABILIZATION',
      },
    });
  }, [selectedIncident, selectedThread, channelHealth, emitDirectiveMacro]);

  const executeRecommendation = useCallback(() => {
    if (commandRecommendation.action === 'ACK') {
      transitionIncident('ACKED');
      return;
    }
    if (commandRecommendation.action === 'ASSIGN') {
      transitionIncident('ASSIGNED');
      return;
    }
    if (commandRecommendation.action === 'REROUTE') {
      dispatchDirective('REROUTE');
      return;
    }
    if (commandRecommendation.action === 'RESTRICT') {
      dispatchDirective('RESTRICT');
      return;
    }
    if (commandRecommendation.action === 'CHECKIN') {
      dispatchDirective('CHECKIN');
      return;
    }
    if (commandRecommendation.action === 'FOCUS_CRITICAL') {
      const critical = incidents.find((incident) => incident.priority === 'CRITICAL' && incident.status !== 'RESOLVED');
      if (critical) {
        setSelectedIncidentId(critical.id);
        setFeedback('Critical incident focused.');
      } else {
        setFeedback('No critical incident available.');
      }
    }
  }, [commandRecommendation, transitionIncident, dispatchDirective, incidents]);

  const joinVoiceNet = useCallback(
    async (netId: string, monitorOnly = false) => {
      if (!netId) return;
      if (!voiceRuntimeUser?.id) {
        setFeedback('Voice profile unavailable.');
        return;
      }
      try {
        const response = monitorOnly
          ? await (voiceNet.monitorNet?.(netId, voiceRuntimeUser) || voiceNet.joinNet?.(netId, voiceRuntimeUser, { monitorOnly: true }))
          : await voiceNet.joinNet?.(netId, voiceRuntimeUser);
        if (response?.requiresConfirmation) {
          setFeedback('Focused voice net requires confirmation.');
          return;
        }
        if (response?.success === false) {
          setFeedback(response?.error || 'Voice join failed.');
          return;
        }
        setFeedback(monitorOnly ? `Monitoring ${netId}` : `Joined ${netId}`);
      } catch (err: any) {
        setFeedback(err?.message || 'Voice join failed.');
      }
    },
    [voiceNet, voiceRuntimeUser]
  );

  const setTransmitVoiceNet = useCallback(
    async (netId: string) => {
      if (!netId) return;
      if (!voiceRuntimeUser?.id) {
        setFeedback('Voice profile unavailable.');
        return;
      }
      try {
        const response = await voiceNet.setTransmitNet?.(netId, voiceRuntimeUser);
        if (response?.success === false) {
          setFeedback(response?.error || 'Unable to set transmit net.');
          return;
        }
        setFeedback(`TX lane set: ${netId}`);
      } catch (err: any) {
        setFeedback(err?.message || 'Unable to set transmit net.');
      }
    },
    [voiceNet, voiceRuntimeUser]
  );

  const leaveVoiceNet = useCallback(
    async (netId: string) => {
      try {
        await voiceNet.leaveNet?.(netId);
        setFeedback(`Left ${netId}`);
      } catch (err: any) {
        setFeedback(err?.message || 'Unable to leave net.');
      }
    },
    [voiceNet]
  );

  const selectedNode = useMemo(
    () => displayNodes.find((node) => node.id === selectedNodeId) || null,
    [displayNodes, selectedNodeId]
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
      emitDirectiveMacro({
        eventType: 'MOVE_OUT',
        channelId: sourceChannelId,
        directive: 'BRIDGE_NETS',
        successMessage: `Bridge ${sourceNode.label} -> ${targetNode.label} established`,
        payload: {
          orderType: 'COMMS_BRIDGE',
          sourceChannelId,
          targetChannelId,
          targetNodeId,
        },
      });
      setBridgeDraftSourceId('');
    },
    [nodeMap, emitDirectiveMacro]
  );

  const updateNodeFromClientPoint = useCallback((nodeId: string, clientX: number, clientY: number) => {
    const host = topologyRef.current;
    if (!host || !nodeId) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clampPct(((clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((clientY - rect.top) / rect.height) * 100);
    setNodePositionOverrides((prev) => ({
      ...prev,
      [nodeId]: { x, y },
    }));
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

  const handleNodePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    const current = dragRef.current;
    if (!current || current.nodeId !== nodeId || current.pointerId !== event.pointerId) return;
    const movedX = Math.abs(event.clientX - current.startX);
    const movedY = Math.abs(event.clientY - current.startY);
    if (movedX > 2 || movedY > 2) {
      current.moved = true;
      updateNodeFromClientPoint(nodeId, event.clientX, event.clientY);
    }
  }, [updateNodeFromClientPoint]);

  const handleNodePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    const current = dragRef.current;
    if (!current || current.nodeId !== nodeId || current.pointerId !== event.pointerId) return;
    if (!current.moved) {
      if (bridgeDraftSourceId) {
        applyBridgeOrder(bridgeDraftSourceId, nodeId);
      } else {
        setSelectedNodeId(nodeId);
      }
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [applyBridgeOrder, bridgeDraftSourceId]);

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

  const cancelBridgeDraft = useCallback(() => {
    setBridgeDraftSourceId('');
    setFeedback('Bridge target mode cleared.');
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
          dispatchDirective('REROUTE', { channelId });
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
          dispatchDirective('RESTRICT', { channelId });
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
          dispatchDirective('CHECKIN', { channelId });
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
            setFeedback('Bridge target mode cleared.');
          } else {
            setBridgeDraftSourceId(selectedNode.id);
            setFeedback(`Target-select active from ${selectedNode.label}. Click another channel node to bridge.`);
          }
          setRadialOpen(false);
        },
      },
    ];

    if (bridgeDraftSourceId) {
      items.push({
        id: 'cancel-bridge',
        label: 'Abort Target',
        icon: 'attach-intel',
        tone: 'danger',
        onSelect: () => {
          cancelBridgeDraft();
          setRadialOpen(false);
        },
      });
    }

    return items;
  }, [selectedNode, bridgeDraftSourceId, dispatchDirective, cancelBridgeDraft]);

  const isSchemaExpanded = useCallback(
    (id: string, fallback = false) => {
      if (Object.prototype.hasOwnProperty.call(schemaExpandedById, id)) return Boolean(schemaExpandedById[id]);
      return fallback;
    },
    [schemaExpandedById]
  );

  const toggleSchemaExpanded = useCallback((id: string, fallback = false) => {
    setSchemaExpandedById((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, id) ? Boolean(prev[id]) : fallback;
      return {
        ...prev,
        [id]: !current,
      };
    });
  }, []);

  const tokenAtlasEntriesByFamily = useMemo(() => {
    const grouped = new Map<string, (typeof tokenCatalog.entries)[number][]>();
    for (const entry of tokenCatalog.entries) {
      const rows = grouped.get(entry.family) || [];
      rows.push(entry);
      grouped.set(entry.family, rows);
    }
    return [...grouped.entries()];
  }, []);

  if (loading) {
    return <PanelLoadingState label="Loading comms graph..." />;
  }

  if (error || !snapshot) {
    return <DegradedStateCard state="OFFLINE" reason={error || 'Comms graph data unavailable.'} actionLabel="Retry" onAction={loadGraph} />;
  }

  return (
    <div className="relative h-full min-h-0 grid grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Topology</h3>
          <p className="text-xs text-zinc-500 truncate">Template: {snapshot.templateId} · Drag nodes · Right-click radial command · Target-click bridge</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NexusButton size="sm" intent={showMonitoring ? 'primary' : 'subtle'} onClick={() => setShowMonitoring((prev) => !prev)}>
            Monitoring
          </NexusButton>
          <NexusButton size="sm" intent={showUsers ? 'primary' : 'subtle'} onClick={() => setShowUsers((prev) => !prev)}>
            Users
          </NexusButton>
          {import.meta.env.DEV ? (
            <NexusButton size="sm" intent={showTokenAtlas ? 'primary' : 'subtle'} onClick={() => setShowTokenAtlas((prev) => !prev)}>
              Tokens
            </NexusButton>
          ) : null}
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
        <NexusBadge tone={criticalIncidentCount > 0 ? 'danger' : 'neutral'}>
          Open Incidents {unresolvedIncidentCount}
        </NexusBadge>
        <NexusBadge tone={disciplineAlerts.some((entry) => entry.severity === 'critical') ? 'danger' : disciplineAlerts.length > 0 ? 'warning' : 'neutral'}>
          Discipline Alerts {disciplineAlerts.length}
        </NexusBadge>
        <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : deliveryStats.confidencePct >= 40 ? 'warning' : 'danger'}>
          Delivery {deliveryStats.confidencePct}%
        </NexusBadge>
        <NexusBadge tone={bridgeDraftSourceId ? 'warning' : 'neutral'}>
          Bridge Target {bridgeDraftSourceId ? 'ARMED' : 'IDLE'}
        </NexusBadge>
      </div>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-orange-300">Command Intent</div>
            <div className="text-sm font-semibold text-zinc-100 mt-0.5">{commandRecommendation.label}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{commandRecommendation.detail}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <NexusBadge tone={activeSpeakers.length > 0 ? 'warning' : 'neutral'}>
              <Zap className="w-3 h-3 mr-1" />
              TX {activeSpeakers.length}
            </NexusBadge>
            <NexusButton size="sm" intent="primary" className="shrink-0" onClick={executeRecommendation}>
              Execute
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </NexusButton>
          </div>
        </div>
      </section>

      <div className="min-h-0 grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-h-0 flex flex-col gap-2">
          <div
            ref={topologyRef}
            className="flex-1 min-h-[220px] rounded border border-zinc-800 bg-zinc-950/65 p-2 relative overflow-hidden"
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setRadialOpen(false);
              }
            }}
          >
            <div className="absolute inset-0 opacity-[0.18]" style={{
              backgroundImage:
                'linear-gradient(rgba(179,90,47,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(179,90,47,0.18) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }} />

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {renderedEdges.map((edge: CommsGraphEdge) => {
                const source = nodeMap[edge.sourceId];
                const target = nodeMap[edge.targetId];
                if (!source || !target) return null;

                const isBridgeEdge = edge.id.startsWith('bridge:');
                const isMonitoring = edge.type === 'monitoring';
                const visible = isBridgeEdge ? true : isMonitoring ? showMonitoring : true;
                const width = isBridgeEdge ? 2.2 : 1 + edge.intensity * 2.2;
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
                    style={{
                      opacity,
                      transition: `opacity ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                    }}
                  />
                );
              })}
            </svg>

            {displayNodes.map((node, index) => {
              const isUser = node.type === 'user';
              const visible = isUser ? showUsers : true;
              const isSelected = node.id === selectedNodeId;
              const isBridgeSource = node.id === bridgeDraftSourceId;
              const isBridgeTarget = Boolean(
                bridgeDraftSourceId &&
                bridgeDraftSourceId !== node.id &&
                node.type === 'channel'
              );
              const glow = node.intensity > 0 ? 8 + node.intensity * 18 : 0;
              const sizePx = Math.round(26 + node.size * 0.6);

              return (
                <AnimatedMount
                  key={node.id}
                  show={visible}
                  delayMs={index * 10}
                  durationMs={reducedMotion ? 0 : motionTokens.duration.fast}
                  className="absolute"
                >
                  <div
                    className="absolute"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: 'translate(-50%, -50%)',
                      transition: `box-shadow ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
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
                          if (bridgeDraftSourceId) {
                            applyBridgeOrder(bridgeDraftSourceId, node.id);
                          } else {
                            setSelectedNodeId(node.id);
                          }
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
                </AnimatedMount>
              );
            })}

            {bridgeDraftSourceId ? (
              <div className="absolute left-2 top-2 rounded border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                Bridge targeting active. Select destination channel.
              </div>
            ) : null}

            {selectedNode ? (
              <div className="absolute right-2 top-2 rounded border border-zinc-700 bg-zinc-950/85 px-2 py-1 text-[10px] text-zinc-300 max-w-[180px] truncate">
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
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setHealthPage((prev) => Math.min(healthPageCount - 1, prev + 1))}
                  disabled={healthPage >= healthPageCount - 1}
                >
                  Next
                </NexusButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visibleHealth.map((entry) => (
                <div key={entry.channelId} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200 truncate">{entry.label}</span>
                    <div className="flex items-center gap-1.5">
                      {bridgedChannelIds.has(entry.channelId) ? <NexusBadge tone="active">BRIDGED</NexusBadge> : null}
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <NexusButton size="sm" intent={rightPanelView === 'cards' ? 'primary' : 'subtle'} onClick={() => setRightPanelView('cards')}>
                <Users className="w-3.5 h-3.5 mr-1" />
                Crew Cards
              </NexusButton>
              <NexusButton size="sm" intent={rightPanelView === 'schema' ? 'primary' : 'subtle'} onClick={() => setRightPanelView('schema')}>
                <ClipboardList className="w-3.5 h-3.5 mr-1" />
                Fleet Schema
              </NexusButton>
            </div>
            {rightPanelView === 'cards' ? (
              <div className="flex items-center gap-1.5">
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setCrewCardPage((prev) => Math.max(0, prev - 1))}
                  disabled={crewCardPage === 0}
                >
                  Prev
                </NexusButton>
                <NexusBadge tone="neutral">
                  {crewCardPage + 1}/{crewCardPageCount}
                </NexusBadge>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setCrewCardPage((prev) => Math.min(crewCardPageCount - 1, prev + 1))}
                  disabled={crewCardPage >= crewCardPageCount - 1}
                >
                  Next
                </NexusButton>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setSchemaChannelPage((prev) => Math.max(0, prev - 1))}
                  disabled={schemaChannelPage === 0}
                >
                  Prev
                </NexusButton>
                <NexusBadge tone="neutral">
                  {schemaChannelPage + 1}/{schemaChannelPageCount}
                </NexusBadge>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setSchemaChannelPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))}
                  disabled={schemaChannelPage >= schemaChannelPageCount - 1}
                >
                  Next
                </NexusButton>
              </div>
            )}
          </div>

          {rightPanelView === 'cards' ? (
            <div className="min-h-0 rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5">
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-1.5">
                {visibleCrewCards.map((card) => (
                  <article key={card.id} className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img src={tokenAssets.comms.vehicle} alt="" className="w-4 h-4 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{card.vehicleLabel}</div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wide truncate inline-flex items-center gap-1">
                            <img src={wingTokenIcon(card.wingId, card.channelStatus)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            <img src={squadTokenIcon(card.squadLabel, card.channelStatus)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            <span>{card.wingLabel} · {card.squadLabel}</span>
                          </div>
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
                        <div className="rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5 text-[9px] text-zinc-500">
                          No operators assigned to voice lane.
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {visibleCrewCards.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2 text-[10px] text-zinc-500 2xl:col-span-2">
                    No crew cards available for this channel page.
                  </div>
                ) : null}
              </div>
            </div>
          ) : rightPanelView === 'schema' ? (
            <div className="min-h-0 rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5">
              <button
                type="button"
                className="w-full flex items-center gap-1 text-left rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1"
                onClick={() => toggleSchemaExpanded('fleet:redscar', true)}
              >
                {isSchemaExpanded('fleet:redscar', true) ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                <img src={tokenAssets.map.node.comms} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                <span className="text-[10px] text-zinc-200 uppercase tracking-wide">REDSCAR Fleet</span>
                <NexusBadge tone="neutral" className="ml-auto">
                  Wing {schemaTree.filter((wing) => wing.squads.length > 0).length}
                </NexusBadge>
              </button>

              {isSchemaExpanded('fleet:redscar', true) ? (
                <div className="space-y-1">
                  {schemaTree.map((wing) => {
                    if (!wing.squads.length) return null;
                    const wingKey = `wing:${wing.id}`;
                    return (
                      <div key={wing.id} className="pl-2">
                        <button
                          type="button"
                          className="w-full flex items-center gap-1 text-left rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1"
                          onClick={() => toggleSchemaExpanded(wingKey, wing.id === 'CE')}
                        >
                          {isSchemaExpanded(wingKey, wing.id === 'CE') ? (
                            <ChevronDown className="w-3 h-3 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-zinc-400" />
                          )}
                          <img src={wingTokenIcon(wing.id)} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                          <span className="text-[10px] text-zinc-200 uppercase tracking-wide">{wing.label}</span>
                          <NexusBadge tone="neutral" className="ml-auto">
                            Squad {wing.squads.length}
                          </NexusBadge>
                        </button>

                        {isSchemaExpanded(wingKey, wing.id === 'CE') ? (
                          <div className="space-y-1 pl-2">
                            {wing.squads.map((squad) => {
                              const squadKey = `squad:${squad.id}`;
                              return (
                                <div key={squad.id}>
                                  <button
                                    type="button"
                                    className="w-full flex items-center gap-1 text-left rounded border border-zinc-800 bg-zinc-900/25 px-2 py-1"
                                    onClick={() => toggleSchemaExpanded(squadKey, squad.label === 'Command Cell')}
                                  >
                                    {isSchemaExpanded(squadKey, squad.label === 'Command Cell') ? (
                                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                                    )}
                                    <img src={squadTokenIcon(squad.label)} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                    <span className="text-[10px] text-zinc-300 uppercase tracking-wide">{squad.label}</span>
                                    <span className="ml-auto text-[9px] text-zinc-500">Channel {squad.channels.length}</span>
                                  </button>

                                  {isSchemaExpanded(squadKey, squad.label === 'Command Cell') ? (
                                    <div className="space-y-1 pl-2">
                                      {squad.channels.map((channel: any) => {
                                        const channelKey = `channel:${wing.id}:${channel.id}`;
                                        return (
                                          <div key={channel.id}>
                                            <button
                                              type="button"
                                              className="w-full flex items-center gap-1 text-left rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1"
                                              onClick={() => toggleSchemaExpanded(channelKey, false)}
                                            >
                                              {isSchemaExpanded(channelKey, false) ? (
                                                <ChevronDown className="w-3 h-3 text-zinc-500" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 text-zinc-500" />
                                              )}
                                              <img src={tokenAssets.comms.channel} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                              <span className="text-[10px] text-zinc-200 truncate">{channel.label}</span>
                                              <NexusBadge tone={bridgedChannelIds.has(channel.id) ? 'active' : 'neutral'} className="ml-auto">
                                                {bridgedChannelIds.has(channel.id) ? 'BRIDGED' : 'LINK'}
                                              </NexusBadge>
                                            </button>
                                            <div className="pl-4 text-[9px] text-zinc-500 flex items-center gap-1.5">
                                              <img src={channelStatusTokenIcon(channel.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                              <span className="truncate">{channel.status}</span>
                                            </div>

                                            {isSchemaExpanded(channelKey, false) ? (
                                              <div className="space-y-1 pl-3 pt-0.5">
                                                {channel.vehicles.length > 0 ? (
                                                  channel.vehicles.map((vehicle: any) => {
                                                    const vehicleKey = `vehicle:${channel.id}:${vehicle.id}`;
                                                    return (
                                                      <div key={vehicle.id}>
                                                        <button
                                                          type="button"
                                                          className="w-full flex items-center gap-1 text-left rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1"
                                                          onClick={() => toggleSchemaExpanded(vehicleKey, true)}
                                                        >
                                                          {isSchemaExpanded(vehicleKey, true) ? (
                                                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                                                          ) : (
                                                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                                                          )}
                                                          <img src={tokenAssets.comms.vehicle} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                                          <span className="text-[10px] text-zinc-300">{vehicle.label}</span>
                                                          <img src={vehicleStatusTokenIcon(vehicle.basicStatus)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65 ml-auto" />
                                                          <NexusBadge tone={vehicleStatusTone(vehicle.basicStatus)}>
                                                            {vehicle.basicStatus}
                                                          </NexusBadge>
                                                        </button>

                                                        {isSchemaExpanded(vehicleKey, true) ? (
                                                          <div className="space-y-0.5 pl-4">
                                                            {vehicle.operators.map((operator: any) => (
                                                              <div key={operator.id} className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-950/45 px-2 py-0.5">
                                                                <div className="min-w-0 flex items-center gap-1.5">
                                                                  <img src={roleTokenIcon(operator.role)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65 shrink-0" />
                                                                  <div className="min-w-0">
                                                                    <div className="text-[9px] text-zinc-200 truncate">{operator.callsign}</div>
                                                                    <div className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">{operator.role}</div>
                                                                  </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                  <img src={operatorStatusTokenIcon(operator.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                                                  <NexusBadge tone={operatorStatusTone(operator.status)}>{operator.status}</NexusBadge>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    );
                                                  })
                                                ) : (
                                                  <div className="rounded border border-zinc-800 bg-zinc-950/45 px-2 py-1 text-[9px] text-zinc-500">
                                                    No vehicle crews scoped to this channel page.
                                                  </div>
                                                )}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <NexusButton
              size="sm"
              intent={selectedIncident && canTransitionIncidentStatus(selectedIncident.status, 'ACKED') ? 'primary' : 'subtle'}
              onClick={() => transitionIncident('ACKED')}
              disabled={!selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'ACKED')}
            >
              <Radio className="w-3.5 h-3.5 mr-1" />
              Ack
            </NexusButton>
            <NexusButton
              size="sm"
              intent={selectedIncident && canTransitionIncidentStatus(selectedIncident.status, 'ASSIGNED') ? 'primary' : 'subtle'}
              onClick={() => transitionIncident('ASSIGNED')}
              disabled={!selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'ASSIGNED')}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Assign
            </NexusButton>
            <NexusButton
              size="sm"
              intent={selectedIncident && canTransitionIncidentStatus(selectedIncident.status, 'RESOLVED') ? 'primary' : 'subtle'}
              onClick={() => transitionIncident('RESOLVED')}
              disabled={!selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'RESOLVED')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Resolve
            </NexusButton>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('REROUTE')}>
              Reroute Net
            </NexusButton>
            <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('RESTRICT')}>
              Restrict Net
            </NexusButton>
            <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('CHECKIN')}>
              Broadcast Check-In
            </NexusButton>
            <NexusButton size="sm" intent="subtle" onClick={createActionOrder}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Create Order
            </NexusButton>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <NexusBadge tone={deliveryStats.queued > 0 ? 'warning' : 'neutral'}>Queued {deliveryStats.queued}</NexusBadge>
            <NexusBadge tone={deliveryStats.persisted > 0 ? 'active' : 'neutral'}>Persisted {deliveryStats.persisted}</NexusBadge>
            <NexusBadge tone={deliveryStats.acked > 0 ? 'ok' : 'neutral'}>Acked {deliveryStats.acked}</NexusBadge>
            <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : deliveryStats.confidencePct >= 40 ? 'warning' : 'danger'}>
              Confidence {deliveryStats.confidencePct}%
            </NexusBadge>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Orders Feed</div>
          <div className="flex items-center gap-1.5">
            <NexusButton size="sm" intent="subtle" onClick={() => setOrdersPage((prev) => Math.max(0, prev - 1))} disabled={ordersPage === 0}>
              Prev
            </NexusButton>
            <NexusBadge tone="neutral">
              {ordersPage + 1}/{ordersPageCount}
            </NexusBadge>
            <NexusButton
              size="sm"
              intent="subtle"
              onClick={() => setOrdersPage((prev) => Math.min(ordersPageCount - 1, prev + 1))}
              disabled={ordersPage >= ordersPageCount - 1}
            >
              Next
            </NexusButton>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-1.5">
          {visibleOrders.map((dispatch) => (
            <div key={dispatch.dispatchId} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{dispatch.directive}</span>
                <NexusBadge tone={deliveryTone(dispatch.status)}>{dispatch.status}</NexusBadge>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-500 truncate">
                {dispatch.channelId} · {formatAge(nowMs, dispatch.issuedAtMs)} ago
              </div>
            </div>
          ))}
          {deliverySurface.length === 0 ? (
            <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[10px] text-zinc-500 md:col-span-2 xl:col-span-5">
              No directives dispatched yet in this session.
            </div>
          ) : null}
        </div>
        {feedback ? <div className="mt-1 text-[10px] text-orange-300">{feedback}</div> : null}
      </div>

      {import.meta.env.DEV && showTokenAtlas ? (
        <div className="absolute inset-0 z-40 bg-zinc-950/75 backdrop-blur-[1px] flex justify-end">
          <aside className="h-full w-[min(520px,92vw)] border-l border-zinc-700 bg-zinc-950/95 flex flex-col">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-zinc-100 uppercase tracking-wide">Token Atlas</div>
                <div className="text-[10px] text-zinc-500">{tokenCatalog.fileNames.length} assets mapped</div>
              </div>
              <NexusButton size="sm" intent="subtle" onClick={() => setShowTokenAtlas(false)}>
                Close
              </NexusButton>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2">
              {tokenAtlasEntriesByFamily.map(([family, entries]) => (
                <section key={family} className="rounded border border-zinc-800 bg-zinc-900/35 p-2">
                  <div className="text-[10px] text-zinc-300 uppercase tracking-wide mb-1">{family}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {entries.map((entry) => (
                      <div key={`${entry.family}:${entry.color}:${entry.variant}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <img
                            src={getTokenAssetUrl(entry.family, entry.color, { variant: entry.variant })}
                            alt=""
                            className="w-4 h-4 rounded-sm border border-zinc-800/70 bg-zinc-900/70"
                          />
                          <span className="text-[8px] text-zinc-300 uppercase truncate">{entry.color}</span>
                        </div>
                        <div className="text-[8px] text-zinc-500 uppercase truncate">{entry.variant}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
