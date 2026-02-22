import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Radio,
  RefreshCcw,
  Send,
  Signal,
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
  type CommsIncidentRecord,
  type CommsIncidentStatus,
} from '../../services/commsIncidentService';
import {
  buildCommsDirectiveThreads,
  buildCommsDisciplineAlerts,
  createDirectiveDispatchRecord,
  reconcileDirectiveDispatches,
  type CommsDirectiveThreadLane,
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

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}

const LIST_PAGE_SIZE = 5;
const VOICE_LIST_PAGE_SIZE = 4;
const THREAD_LIST_PAGE_SIZE = 5;

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

function incidentPriorityTone(priority: string): 'danger' | 'warning' | 'active' {
  if (priority === 'CRITICAL') return 'danger';
  if (priority === 'HIGH') return 'warning';
  return 'active';
}

function incidentStatusTone(status: CommsIncidentStatus): 'warning' | 'active' | 'ok' | 'neutral' {
  if (status === 'NEW') return 'warning';
  if (status === 'ACKED') return 'active';
  if (status === 'ASSIGNED') return 'ok';
  return 'neutral';
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

function directiveByThreadAction(action: CommsDirectiveThreadLane['nextAction']): 'REROUTE' | 'RESTRICT' | 'CHECKIN' {
  if (action === 'REROUTE') return 'REROUTE';
  if (action === 'RESTRICT') return 'RESTRICT';
  return 'CHECKIN';
}

export default function CommsNetworkConsole({
  variantId,
  opId,
  roster,
  events = [],
  actorId,
  onCreateMacroEvent,
}: CommsNetworkConsoleProps) {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const voiceNet = useVoiceNet() as any;
  const [snapshot, setSnapshot] = useState<CommsGraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [healthPage, setHealthPage] = useState(0);
  const [incidentPage, setIncidentPage] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentStatusById, setIncidentStatusById] = useState<Record<string, CommsIncidentStatus>>({});
  const [feedback, setFeedback] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [voicePage, setVoicePage] = useState(0);
  const [threadPage, setThreadPage] = useState(0);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [rightPanelView, setRightPanelView] = useState<'incidents' | 'threads'>('incidents');
  const [directiveDispatches, setDirectiveDispatches] = useState<DirectiveDispatchRecord[]>([]);

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

  const nodes = snapshot?.nodes || [];
  const edges = snapshot?.edges || [];
  const nodeMap = useMemo(
    () =>
      nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [nodes]
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
  const threadPageCount = Math.max(1, Math.ceil(directiveThreads.length / THREAD_LIST_PAGE_SIZE));
  const visibleThreads = useMemo(
    () =>
      directiveThreads.slice(
        threadPage * THREAD_LIST_PAGE_SIZE,
        threadPage * THREAD_LIST_PAGE_SIZE + THREAD_LIST_PAGE_SIZE
      ),
    [directiveThreads, threadPage]
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

  const healthPageCount = Math.max(1, Math.ceil(channelHealth.length / LIST_PAGE_SIZE));
  const visibleHealth = channelHealth.slice(healthPage * LIST_PAGE_SIZE, healthPage * LIST_PAGE_SIZE + LIST_PAGE_SIZE);
  const incidentPageCount = Math.max(1, Math.ceil(incidents.length / LIST_PAGE_SIZE));
  const visibleIncidents = incidents.slice(incidentPage * LIST_PAGE_SIZE, incidentPage * LIST_PAGE_SIZE + LIST_PAGE_SIZE);
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;

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
    setIncidentPage((prev) => Math.min(prev, incidentPageCount - 1));
  }, [incidentPageCount]);

  useEffect(() => {
    setVoicePage((prev) => Math.min(prev, voicePageCount - 1));
  }, [voicePageCount]);

  useEffect(() => {
    setThreadPage((prev) => Math.min(prev, threadPageCount - 1));
  }, [threadPageCount]);

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

  const executeThreadAction = useCallback(
    (lane: CommsDirectiveThreadLane) => {
      if (!lane) return;
      const directive = directiveByThreadAction(lane.nextAction);
      dispatchDirective(directive, { channelId: lane.channelId, laneId: lane.id });
    },
    [dispatchDirective]
  );

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

  if (loading) {
    return <PanelLoadingState label="Loading comms graph..." />;
  }

  if (error || !snapshot) {
    return <DegradedStateCard state="OFFLINE" reason={error || 'Comms graph data unavailable.'} actionLabel="Retry" onAction={loadGraph} />;
  }

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Command</h3>
          <p className="text-xs text-zinc-500 truncate">Template: {snapshot.templateId} · Deterministic incident flow</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        <NexusBadge tone="neutral">Edges {edges.length}</NexusBadge>
        <NexusBadge tone={criticalIncidentCount > 0 ? 'danger' : 'neutral'}>
          Open Incidents {unresolvedIncidentCount}
        </NexusBadge>
        <NexusBadge tone={disciplineAlerts.some((entry) => entry.severity === 'critical') ? 'danger' : disciplineAlerts.length > 0 ? 'warning' : 'neutral'}>
          Discipline Alerts {disciplineAlerts.length}
        </NexusBadge>
        <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : deliveryStats.confidencePct >= 40 ? 'warning' : 'danger'}>
          Delivery {deliveryStats.confidencePct}%
        </NexusBadge>
      </div>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="rounded border border-orange-500/35 bg-gradient-to-br from-orange-500/20 to-zinc-950/60 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-orange-300">
            Net Health
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">{Math.max(0, channels.length - degradedChannelCount)}/{channels.length}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">clear channels</div>
        </div>
        <div className="rounded border border-amber-500/30 bg-gradient-to-br from-amber-500/16 to-zinc-950/60 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-amber-300">
            Degraded
            <Signal className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">{degradedChannelCount}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">channels flagged</div>
        </div>
        <div className="rounded border border-red-500/30 bg-gradient-to-br from-red-500/16 to-zinc-950/60 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-red-300">
            Critical
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">{criticalIncidentCount}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">active incidents</div>
        </div>
        <div className="rounded border border-sky-500/30 bg-gradient-to-br from-sky-500/16 to-zinc-950/60 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-sky-300">
            Operators
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">{voiceParticipants.length}</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wide">voice participants</div>
        </div>
      </section>

      <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-orange-500/30 bg-gradient-to-r from-orange-500/14 via-zinc-900/55 to-zinc-950/70 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-orange-300">Command Intent</div>
              <div className="text-sm font-semibold text-zinc-100 mt-0.5">{commandRecommendation.label}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{commandRecommendation.detail}</div>
            </div>
            <NexusButton size="sm" intent="primary" className="shrink-0" onClick={executeRecommendation}>
              Execute
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </NexusButton>
          </div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400">Live Speaker Activity</div>
            <NexusBadge tone={activeSpeakers.length > 0 ? 'warning' : 'neutral'}>
              <Zap className="w-3 h-3 mr-1" />
              {activeSpeakers.length}
            </NexusBadge>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {activeSpeakers.length > 0 ? (
              activeSpeakers.map((participant: any, index: number) => (
                <div key={`speaker:${participant.id || participant.callsign || index}`} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1">
                  <div className="text-[10px] text-zinc-200 truncate">{participant.callsign || participant.name || participant.id || 'Operator'}</div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{participant.state || 'Speaking'}</div>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1.5 text-[10px] text-zinc-500">
                No active speakers detected.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2">
        {disciplineAlerts.length > 0 ? (
          <div className="mb-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {disciplineAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{alert.title}</div>
                  <NexusBadge tone={disciplineAlertTone(alert.severity)}>{alert.severity}</NexusBadge>
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">{alert.detail}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            Voice Situational Matrix
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <NexusBadge tone={voiceNet.connectionState === 'CONNECTED' ? 'ok' : voiceNet.connectionState === 'ERROR' ? 'danger' : 'warning'}>
              {voiceNet.connectionState || 'IDLE'}
            </NexusBadge>
            <NexusBadge tone={activeVoiceNetId ? 'active' : 'neutral'}>{activeVoiceNetId || 'NO TX'}</NexusBadge>
            <NexusBadge tone="neutral">Monitored {monitoredVoiceSet.size}</NexusBadge>
          </div>
        </div>

        <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {visibleVoiceNets.map((net: any) => {
              const netId = String(net?.id || net?.code || '').trim();
              const isMonitored = monitoredVoiceSet.has(netId);
              const isTransmit = netId === String(voiceNet.transmitNetId || '');
              return (
                <div key={netId} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-zinc-200 truncate">{net?.code || netId}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{net?.label || net?.name || 'Voice lane'}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isTransmit ? <NexusBadge tone="active">TX</NexusBadge> : null}
                      {isMonitored ? <NexusBadge tone="ok">MON</NexusBadge> : null}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {isMonitored ? (
                      <>
                        <NexusButton size="sm" intent="subtle" className="text-[10px] h-6 px-2" onClick={() => setTransmitVoiceNet(netId)}>
                          Route TX
                        </NexusButton>
                        <NexusButton size="sm" intent="subtle" className="text-[10px] h-6 px-2" onClick={() => leaveVoiceNet(netId)}>
                          Leave
                        </NexusButton>
                      </>
                    ) : (
                      <>
                        <NexusButton size="sm" intent="subtle" className="text-[10px] h-6 px-2" onClick={() => joinVoiceNet(netId, false)}>
                          Join
                        </NexusButton>
                        <NexusButton size="sm" intent="subtle" className="text-[10px] h-6 px-2" onClick={() => joinVoiceNet(netId, true)}>
                          Monitor
                        </NexusButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {visibleVoiceNets.length === 0 ? (
              <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500 md:col-span-2">
                No voice nets available in current scope.
              </div>
            ) : null}
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Persistent Rail Controls</div>
            <div className="mt-1.5 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2 text-zinc-300">
                <span>Mic</span>
                <NexusBadge tone={voiceNet.micEnabled ? 'ok' : 'danger'}>{voiceNet.micEnabled ? 'LIVE' : 'MUTED'}</NexusBadge>
              </div>
              <div className="flex items-center justify-between gap-2 text-zinc-300">
                <span>PTT</span>
                <NexusBadge tone={voiceNet.pttActive ? 'warning' : 'neutral'}>{voiceNet.pttActive ? 'TX' : 'IDLE'}</NexusBadge>
              </div>
              <div className="flex items-center justify-between gap-2 text-zinc-300">
                <span>Discipline</span>
                <NexusBadge tone="neutral">{activeVoiceDiscipline}</NexusBadge>
              </div>
              <div className="flex items-center justify-between gap-2 text-zinc-300">
                <span>Secure</span>
                <NexusBadge tone={secureModeEnabled ? 'warning' : 'neutral'}>{secureModeEnabled ? 'ON' : 'OFF'}</NexusBadge>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 leading-snug">
              Full mic, PTT, discipline, and roster control remains in the persistent right voice rail across all focus modes.
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1.5">
          <NexusButton size="sm" intent="subtle" onClick={() => setVoicePage((prev) => Math.max(0, prev - 1))} disabled={voicePage === 0}>
            Prev
          </NexusButton>
          <NexusBadge tone="neutral">
            {voicePage + 1}/{voicePageCount}
          </NexusBadge>
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() => setVoicePage((prev) => Math.min(voicePageCount - 1, prev + 1))}
            disabled={voicePage >= voicePageCount - 1}
          >
            Next
          </NexusButton>
        </div>
      </section>

      <div className="min-h-0 grid gap-3 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)]">
        <section className="min-h-0 flex flex-col gap-2">
          <div className="flex-1 min-h-[220px] rounded border border-zinc-800 bg-zinc-950/65 p-2 relative overflow-hidden">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {edges.map((edge: CommsGraphEdge) => {
                const source = nodeMap[edge.sourceId];
                const target = nodeMap[edge.targetId];
                if (!source || !target) return null;

                const isMonitoring = edge.type === 'monitoring';
                const visible = isMonitoring ? showMonitoring : true;
                const width = 1 + edge.intensity * 2.2;
                const opacity = visible ? 0.3 + edge.intensity * 0.7 : 0;
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isMonitoring ? 'rgba(180,150,120,0.62)' : 'rgba(179,90,47,0.72)'}
                    strokeWidth={width}
                    strokeDasharray={isMonitoring ? '2.5 2.5' : undefined}
                    style={{
                      opacity,
                      transition: `opacity ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                    }}
                  />
                );
              })}
            </svg>

            {nodes.map((node, index) => {
              const isUser = node.type === 'user';
              const visible = isUser ? showUsers : true;
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
                      className="rounded-md border px-2 py-1 text-[10px] text-zinc-100 text-center whitespace-nowrap"
                      style={{
                        minWidth: `${sizePx}px`,
                        background: nodeFill(node),
                        borderColor: nodeBorder(node),
                        boxShadow: glow > 0 ? `0 0 ${glow}px rgba(179,90,47,0.42)` : 'none',
                      }}
                      title={`${node.label}${node.type === 'channel' ? ` · activity ${Math.round(node.intensity * 100)}%` : ''}`}
                    >
                      <div className="font-semibold uppercase tracking-wide">{node.label}</div>
                      {node.type === 'channel' ? <div className="text-[9px] text-zinc-300">{Math.round(node.intensity * 100)}%</div> : null}
                    </div>
                  </div>
                </AnimatedMount>
              );
            })}
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
                    <NexusBadge tone={entry.discipline === 'SATURATED' ? 'danger' : entry.discipline === 'BUSY' ? 'warning' : 'ok'}>
                      {entry.discipline}
                    </NexusBadge>
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
            <div className="flex items-center gap-1.5">
              <NexusButton size="sm" intent={rightPanelView === 'incidents' ? 'primary' : 'subtle'} onClick={() => setRightPanelView('incidents')}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Priority Queue
              </NexusButton>
              <NexusButton size="sm" intent={rightPanelView === 'threads' ? 'primary' : 'subtle'} onClick={() => setRightPanelView('threads')}>
                <ClipboardList className="w-3.5 h-3.5 mr-1" />
                Mission Threads
              </NexusButton>
            </div>
            {rightPanelView === 'incidents' ? (
              <div className="flex items-center gap-1.5">
                <NexusButton size="sm" intent="subtle" onClick={() => setIncidentPage((prev) => Math.max(0, prev - 1))} disabled={incidentPage === 0}>
                  Prev
                </NexusButton>
                <NexusBadge tone="neutral">
                  {incidentPage + 1}/{incidentPageCount}
                </NexusBadge>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setIncidentPage((prev) => Math.min(incidentPageCount - 1, prev + 1))}
                  disabled={incidentPage >= incidentPageCount - 1}
                >
                  Next
                </NexusButton>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <NexusButton size="sm" intent="subtle" onClick={() => setThreadPage((prev) => Math.max(0, prev - 1))} disabled={threadPage === 0}>
                  Prev
                </NexusButton>
                <NexusBadge tone="neutral">
                  {threadPage + 1}/{threadPageCount}
                </NexusBadge>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => setThreadPage((prev) => Math.min(threadPageCount - 1, prev + 1))}
                  disabled={threadPage >= threadPageCount - 1}
                >
                  Next
                </NexusButton>
              </div>
            )}
          </div>

          {rightPanelView === 'incidents' ? (
            <>
              <div className="grid grid-cols-1 gap-1.5">
                {visibleIncidents.map((incident) => {
                  const active = incident.id === selectedIncidentId;
                  return (
                    <button
                      key={incident.id}
                      type="button"
                      className={`text-left rounded border px-2 py-1.5 transition-colors ${
                        active ? 'border-orange-500/60 bg-orange-500/10' : 'border-zinc-800 bg-zinc-950/55 hover:border-zinc-700'
                      }`}
                      onClick={() => setSelectedIncidentId(incident.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-200 truncate">{incident.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <NexusBadge tone={incidentPriorityTone(incident.priority)}>{incident.priority}</NexusBadge>
                          <NexusBadge tone={incidentStatusTone(incident.status)}>{incident.status}</NexusBadge>
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-500 truncate">{incident.detail}</div>
                    </button>
                  );
                })}
                {visibleIncidents.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500">
                    No priority incidents in scope.
                  </div>
                ) : null}
              </div>

              {selectedIncident ? (
                <div className="mt-auto rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-zinc-200 truncate">{selectedIncident.title}</div>
                    <span className="text-[10px] text-zinc-500">{formatAge(nowMs, selectedIncident.createdAtMs)} ago</span>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">{selectedIncident.detail}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">Recommended: {selectedIncident.recommendedAction}</div>
                </div>
              ) : (
                <div className="mt-auto rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500">
                  Select an incident to issue deterministic actions.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-1.5">
                {visibleThreads.map((lane) => {
                  const active = lane.id === selectedThreadId;
                  return (
                    <button
                      key={lane.id}
                      type="button"
                      className={`text-left rounded border px-2 py-1.5 transition-colors ${
                        active ? 'border-orange-500/60 bg-orange-500/10' : 'border-zinc-800 bg-zinc-950/55 hover:border-zinc-700'
                      }`}
                      onClick={() => setSelectedThreadId(lane.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-200 truncate uppercase tracking-wide">{lane.label}</span>
                        <NexusBadge tone={lane.criticalCount > 0 ? 'danger' : lane.unresolvedCount > 0 ? 'warning' : 'neutral'}>
                          {lane.nextAction}
                        </NexusBadge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <NexusBadge tone="neutral">Q {lane.qualityPct}%</NexusBadge>
                        <NexusBadge tone="neutral">Inc {lane.unresolvedCount}</NexusBadge>
                        <NexusBadge tone={lane.criticalCount > 0 ? 'danger' : 'neutral'}>Crit {lane.criticalCount}</NexusBadge>
                        <NexusBadge tone="active">Dir {lane.directiveVolume}</NexusBadge>
                      </div>
                    </button>
                  );
                })}
                {visibleThreads.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500">
                    No mission thread lanes in scope.
                  </div>
                ) : null}
              </div>

              {selectedThread ? (
                <div className="mt-auto rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-zinc-200 uppercase tracking-wide truncate">{selectedThread.label}</div>
                    <span className="text-[10px] text-zinc-500">{formatAge(nowMs, selectedThread.lastActivityMs)} ago</span>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500">
                    Next lane action: {selectedThread.nextAction} · unresolved {selectedThread.unresolvedCount}
                  </div>
                  <div className="mt-1.5">
                    <NexusButton size="sm" intent="primary" onClick={() => executeThreadAction(selectedThread)}>
                      Execute Lane Action
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </NexusButton>
                  </div>
                </div>
              ) : (
                <div className="mt-auto rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500">
                  Select a lane to issue mission-thread directives.
                </div>
              )}
            </>
          )}
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
        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5">
          {deliverySurface.slice(0, 4).map((dispatch) => (
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
            <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[10px] text-zinc-500 md:col-span-2 xl:col-span-4">
              No directives dispatched yet in this session.
            </div>
          ) : null}
        </div>
        {feedback ? <div className="mt-1 text-[10px] text-orange-300">{feedback}</div> : null}
      </div>
    </div>
  );
}