import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Radio, RefreshCcw, UserCheck } from 'lucide-react';
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
import type { CqbEventType } from '../../schemas/coreSchemas';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import { PanelLoadingState } from '../loading';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}

const LIST_PAGE_SIZE = 5;
const VOICE_LIST_PAGE_SIZE = 4;

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
      nodes.reduce<Record<string, CommsGraphNode>>((acc, node) => {
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
  const activeVoiceNetId = String(voiceNet.activeNetId || voiceNet.transmitNetId || '').trim();
  const activeVoiceDiscipline = activeVoiceNetId ? (voiceNet.disciplineModeByNet?.[activeVoiceNetId] || 'PTT') : 'PTT';
  const secureModeEnabled = Boolean(activeVoiceNetId && voiceNet.secureModeByNet?.[activeVoiceNetId]?.enabled);

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
    if (!incidents.length) {
      setSelectedIncidentId('');
      return;
    }
    const exists = incidents.some((incident) => incident.id === selectedIncidentId);
    if (exists) return;
    const firstUnresolved = incidents.find((incident) => incident.status !== 'RESOLVED');
    setSelectedIncidentId(firstUnresolved?.id || incidents[0].id);
  }, [incidents, selectedIncidentId]);

  const emitMacro = useCallback(
    (eventType: CqbEventType, payload: Record<string, unknown>, successMessage: string) => {
      if (onCreateMacroEvent) onCreateMacroEvent(eventType, payload);
      setFeedback(onCreateMacroEvent ? successMessage : `${successMessage} (preview)`);
    },
    [onCreateMacroEvent]
  );

  const transitionIncident = useCallback(
    (nextStatus: 'ACKED' | 'ASSIGNED' | 'RESOLVED') => {
      if (!selectedIncident) return;
      if (!canTransitionIncidentStatus(selectedIncident.status, nextStatus)) return;

      setIncidentStatusById((prev) => ({ ...prev, [selectedIncident.id]: nextStatus }));
      const scopedChannelId = selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : undefined;
      emitMacro(
        INCIDENT_EVENT_BY_STATUS[nextStatus],
        {
          channelId: scopedChannelId,
          incidentId: selectedIncident.id,
          priority: selectedIncident.priority,
          incidentStatus: nextStatus,
          source: 'comms-network-console',
          actorId,
        },
        `Incident ${nextStatus.toLowerCase()}`
      );
    },
    [selectedIncident, emitMacro, actorId]
  );

  const dispatchDirective = useCallback(
    (directive: 'REROUTE' | 'RESTRICT' | 'CHECKIN') => {
      const fallbackChannelId = channelHealth[0]?.channelId;
      const incidentChannelId = selectedIncident?.channelId && selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : '';
      const channelId = incidentChannelId || fallbackChannelId || '';
      if (!channelId) return;

      if (directive === 'REROUTE') {
        emitMacro(
          'MOVE_OUT',
          {
            channelId,
            directive: 'REROUTE_TRAFFIC',
            incidentId: selectedIncident?.id || null,
            source: 'comms-network-console',
            actorId,
          },
          'Reroute directive sent'
        );
        return;
      }

      if (directive === 'RESTRICT') {
        emitMacro(
          'HOLD',
          {
            channelId,
            directive: 'RESTRICT_NON_ESSENTIAL',
            incidentId: selectedIncident?.id || null,
            source: 'comms-network-console',
            actorId,
          },
          'Net restriction directive sent'
        );
        return;
      }

      emitMacro(
        'SELF_CHECK',
        {
          channelId,
          directive: 'CHECK_IN_REQUEST',
          incidentId: selectedIncident?.id || null,
          source: 'comms-network-console',
          actorId,
        },
        'Check-in request broadcast'
      );
    },
    [channelHealth, selectedIncident, emitMacro, actorId]
  );

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

  const setVoiceDiscipline = useCallback(
    async (mode: string) => {
      try {
        const response = await voiceNet.setDisciplineMode?.(mode, activeVoiceNetId || undefined);
        if (response?.success === false) {
          setFeedback('Unable to update discipline mode.');
          return;
        }
        setFeedback(`Discipline: ${mode}`);
      } catch (err: any) {
        setFeedback(err?.message || 'Unable to update discipline mode.');
      }
    },
    [voiceNet, activeVoiceNetId]
  );

  const requestVoiceTransmit = useCallback(async () => {
    try {
      const response = await voiceNet.requestToSpeak?.({ netId: activeVoiceNetId || undefined, reason: 'Comms command request' });
      if (response?.success === false) {
        setFeedback('Request-to-speak denied.');
        return;
      }
      setFeedback('Request-to-speak submitted.');
    } catch (err: any) {
      setFeedback(err?.message || 'Request-to-speak failed.');
    }
  }, [voiceNet, activeVoiceNetId]);

  const triggerVoicePriority = useCallback(async () => {
    try {
      const response = await voiceNet.triggerPriorityOverride?.({
        netId: activeVoiceNetId || undefined,
        priority: 'CRITICAL',
        message: 'Priority override from Comms command console',
      });
      if (response?.success === false) {
        setFeedback('Priority override failed.');
        return;
      }
      setFeedback('Priority override sent.');
    } catch (err: any) {
      setFeedback(err?.message || 'Priority override failed.');
    }
  }, [voiceNet, activeVoiceNetId]);

  const toggleSecureMode = useCallback(async () => {
    if (!activeVoiceNetId) {
      setFeedback('Set an active transmit lane first.');
      return;
    }
    try {
      await voiceNet.setSecureMode?.({
        netId: activeVoiceNetId,
        enabled: !secureModeEnabled,
      });
      setFeedback(secureModeEnabled ? 'Secure mode disabled.' : 'Secure mode enabled.');
    } catch (err: any) {
      setFeedback(err?.message || 'Secure mode update failed.');
    }
  }, [voiceNet, activeVoiceNetId, secureModeEnabled]);

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
        <NexusBadge tone={incidents.some((incident) => incident.priority === 'CRITICAL' && incident.status !== 'RESOLVED') ? 'danger' : 'neutral'}>
          Open Incidents {incidents.filter((incident) => incident.status !== 'RESOLVED').length}
        </NexusBadge>
      </div>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            Voice Control Plane
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <NexusBadge tone={voiceNet.connectionState === 'CONNECTED' ? 'ok' : voiceNet.connectionState === 'ERROR' ? 'danger' : 'warning'}>
              {voiceNet.connectionState || 'IDLE'}
            </NexusBadge>
            <NexusBadge tone={activeVoiceNetId ? 'active' : 'neutral'}>{activeVoiceNetId || 'NO TX'}</NexusBadge>
            <NexusBadge tone={secureModeEnabled ? 'warning' : 'neutral'}>{secureModeEnabled ? 'SECURE' : 'OPEN'}</NexusBadge>
          </div>
        </div>

        <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
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
                          TX
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

          <div className="flex flex-wrap items-start justify-end gap-1.5">
            <NexusButton
              size="sm"
              intent={voiceNet.pttActive ? 'primary' : 'subtle'}
              className="text-[10px] h-7 px-2"
              onMouseDown={() => voiceNet.startPTT?.()}
              onMouseUp={() => voiceNet.stopPTT?.()}
              onMouseLeave={() => voiceNet.stopPTT?.()}
              onTouchStart={() => voiceNet.startPTT?.()}
              onTouchEnd={() => voiceNet.stopPTT?.()}
              onTouchCancel={() => voiceNet.stopPTT?.()}
            >
              PTT
            </NexusButton>
            <NexusButton size="sm" intent={voiceNet.micEnabled ? 'subtle' : 'danger'} className="text-[10px] h-7 px-2" onClick={() => voiceNet.setMicEnabled?.(!voiceNet.micEnabled)}>
              {voiceNet.micEnabled ? 'Mic On' : 'Mic Off'}
            </NexusButton>
            <NexusButton size="sm" intent={activeVoiceDiscipline === 'OPEN' ? 'primary' : 'subtle'} className="text-[10px] h-7 px-2" onClick={() => setVoiceDiscipline('OPEN')}>
              Open
            </NexusButton>
            <NexusButton size="sm" intent={activeVoiceDiscipline === 'PTT' ? 'primary' : 'subtle'} className="text-[10px] h-7 px-2" onClick={() => setVoiceDiscipline('PTT')}>
              PTT Mode
            </NexusButton>
            <NexusButton size="sm" intent={activeVoiceDiscipline === 'REQUEST_TO_SPEAK' ? 'primary' : 'subtle'} className="text-[10px] h-7 px-2" onClick={() => setVoiceDiscipline('REQUEST_TO_SPEAK')}>
              Request Mode
            </NexusButton>
            <NexusButton size="sm" intent="subtle" className="text-[10px] h-7 px-2" onClick={requestVoiceTransmit}>
              Request TX
            </NexusButton>
            <NexusButton size="sm" intent="subtle" className="text-[10px] h-7 px-2" onClick={triggerVoicePriority}>
              Priority
            </NexusButton>
            <NexusButton size="sm" intent={secureModeEnabled ? 'primary' : 'subtle'} className="text-[10px] h-7 px-2" onClick={toggleSecureMode}>
              {secureModeEnabled ? 'Secure On' : 'Secure Off'}
            </NexusButton>
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
            <div className="text-[11px] text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              Priority Queue
            </div>
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
          </div>

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
          </div>
        </div>
        {feedback ? <div className="mt-1 text-[10px] text-orange-300">{feedback}</div> : null}
      </div>
    </div>
  );
}
