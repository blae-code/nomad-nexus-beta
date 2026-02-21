import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Mic,
  MicOff,
  Plus,
  Radio,
  Send,
  Settings,
  Signal,
  UserCheck,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
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
  type CommsDirectiveThreadLane,
  type DirectiveDeliveryState,
  type DirectiveDispatchRecord,
} from '../../services/commsFocusDirectiveService';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { NexusBadge, NexusButton } from '../primitives';

const PAGE_SIZE = 5;
const QUICK_NET_PAGE_SIZE = 4;
const DISCIPLINE_MODES = [
  { id: 'OPEN', label: 'Open' },
  { id: 'PTT', label: 'PTT' },
  { id: 'REQUEST_TO_SPEAK', label: 'Req' },
  { id: 'COMMAND_ONLY', label: 'Cmd' },
];

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

function deliveryTone(status: DirectiveDeliveryState): 'warning' | 'active' | 'ok' {
  if (status === 'QUEUED') return 'warning';
  if (status === 'PERSISTED') return 'active';
  return 'ok';
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

const INCIDENT_EVENT_BY_STATUS: Record<'ACKED' | 'ASSIGNED' | 'RESOLVED', CqbEventType> = {
  ACKED: 'ROGER',
  ASSIGNED: 'WILCO',
  RESOLVED: 'CLEAR_COMMS',
};

export default function VoiceCommsRail({
  voiceNets = [],
  activeNetId,
  transmitNetId = '',
  monitoredNetIds = [],
  participants = [],
  connectionState = 'IDLE',
  micEnabled = true,
  pttActive = false,
  disciplineMode = 'PTT',
  isExpanded = true,
  onToggleExpand,
  onJoinNet,
  onMonitorNet,
  onSetTransmitNet,
  onLeaveNet,
  onSetMicEnabled,
  onStartPTT,
  onStopPTT,
  onSetDisciplineMode,
  onRequestToSpeak,
  focusMode = '',
  events = [],
  channels = [],
  actorId = '',
  onCreateMacroEvent,
}) {
  const { user } = useAuth();
  const [displayMode, setDisplayMode] = useState('standard');
  const [selectedTab, setSelectedTab] = useState('nets');
  const [quickPage, setQuickPage] = useState(0);
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [incidentPage, setIncidentPage] = useState(0);
  const [threadPage, setThreadPage] = useState(0);
  const [healthPage, setHealthPage] = useState(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentStatusById, setIncidentStatusById] = useState<Record<string, CommsIncidentStatus>>({});
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [directiveDispatches, setDirectiveDispatches] = useState<DirectiveDispatchRecord[]>([]);
  const [feedback, setFeedback] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const isCommsFocus = String(focusMode || '').toLowerCase() === 'comms';
  const quickPageSize = isCommsFocus ? 3 : QUICK_NET_PAGE_SIZE;

  const monitoredSet = useMemo(
    () => new Set((Array.isArray(monitoredNetIds) ? monitoredNetIds : []).map((id) => String(id || ''))),
    [monitoredNetIds]
  );

  const netIdentity = (entry) => String(entry?.id || entry?.code || '').trim();
  const isMonitoredNet = (entryId) => monitoredSet.has(String(entryId || ''));

  const activeNet = useMemo(() => {
    const preferred = String(activeNetId || '').trim();
    const transmit = String(transmitNetId || '').trim();
    return (
      voiceNets.find((entry) => netIdentity(entry) === preferred) ||
      voiceNets.find((entry) => netIdentity(entry) === transmit) ||
      voiceNets[0] ||
      null
    );
  }, [voiceNets, activeNetId, transmitNetId]);

  const quickNets = useMemo(() => {
    if (!activeNet) return voiceNets;
    return [activeNet, ...voiceNets.filter((entry) => netIdentity(entry) !== netIdentity(activeNet))];
  }, [voiceNets, activeNet]);

  const quickPageCount = Math.max(1, Math.ceil(quickNets.length / quickPageSize));
  const netsPageCount = Math.max(1, Math.ceil(voiceNets.length / PAGE_SIZE));
  const rosterPageCount = Math.max(1, Math.ceil(participants.length / PAGE_SIZE));

  const channelHealth = useMemo(() => buildCommsChannelHealth({ channels }), [channels]);
  const incidentCandidates = useMemo(
    () => buildCommsIncidentCandidates({ channelHealth, events, nowMs }),
    [channelHealth, events, nowMs]
  );
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
  const activeSpeakers = useMemo(
    () => participants.filter((participant: any) => isParticipantSpeaking(participant)).slice(0, 4),
    [participants]
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
  const directiveThreads = useMemo(
    () => buildCommsDirectiveThreads({ channelHealth, incidents, events, nowMs }),
    [channelHealth, incidents, events, nowMs]
  );
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

  const incidentPageCount = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
  const threadPageCount = Math.max(1, Math.ceil(directiveThreads.length / PAGE_SIZE));
  const healthPageCount = Math.max(1, Math.ceil(channelHealth.length / PAGE_SIZE));

  useEffect(() => {
    setQuickPage((current) => Math.min(current, quickPageCount - 1));
  }, [quickPageCount]);

  useEffect(() => {
    setNetsPage((current) => Math.min(current, netsPageCount - 1));
  }, [netsPageCount]);

  useEffect(() => {
    setRosterPage((current) => Math.min(current, rosterPageCount - 1));
  }, [rosterPageCount]);

  useEffect(() => {
    setIncidentPage((current) => Math.min(current, incidentPageCount - 1));
  }, [incidentPageCount]);

  useEffect(() => {
    setThreadPage((current) => Math.min(current, threadPageCount - 1));
  }, [threadPageCount]);

  useEffect(() => {
    setHealthPage((current) => Math.min(current, healthPageCount - 1));
  }, [healthPageCount]);

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
    setIncidentStatusById((prev) => normalizeIncidentStatusById(incidentCandidates, prev));
  }, [incidentCandidates]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    setDisplayMode((current) => {
      if (isCommsFocus) return 'standard';
      if (current === 'standard') return 'command';
      return current;
    });
  }, [isCommsFocus]);

  const quickVisibleNets = useMemo(
    () => quickNets.slice(quickPage * quickPageSize, quickPage * quickPageSize + quickPageSize),
    [quickNets, quickPage, quickPageSize]
  );

  const pagedNets = useMemo(
    () => voiceNets.slice(netsPage * PAGE_SIZE, netsPage * PAGE_SIZE + PAGE_SIZE),
    [voiceNets, netsPage]
  );

  const pagedParticipants = useMemo(
    () => participants.slice(rosterPage * PAGE_SIZE, rosterPage * PAGE_SIZE + PAGE_SIZE),
    [participants, rosterPage]
  );

  const visibleIncidents = useMemo(
    () => incidents.slice(incidentPage * PAGE_SIZE, incidentPage * PAGE_SIZE + PAGE_SIZE),
    [incidents, incidentPage]
  );

  const visibleThreads = useMemo(
    () => directiveThreads.slice(threadPage * PAGE_SIZE, threadPage * PAGE_SIZE + PAGE_SIZE),
    [directiveThreads, threadPage]
  );

  const visibleHealth = useMemo(
    () => channelHealth.slice(healthPage * PAGE_SIZE, healthPage * PAGE_SIZE + PAGE_SIZE),
    [channelHealth, healthPage]
  );

  const speakingParticipants = useMemo(
    () => participants.filter((participant) => isParticipantSpeaking(participant)).slice(0, 3),
    [participants]
  );

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;
  const selectedThread = directiveThreads.find((lane) => lane.id === selectedThreadId) || null;

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
          source: 'voice-comms-rail',
          actorId,
          ...(input.payload || {}),
        },
        input.successMessage
      );
    },
    [emitMacro, nowMs, actorId, onCreateMacroEvent]
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
    (directive: 'REROUTE' | 'RESTRICT' | 'CHECKIN') => {
      const channelId = channelHealth[0]?.channelId || '';
      if (!channelId) return;

      if (directive === 'REROUTE') {
        emitDirectiveMacro({
          eventType: 'MOVE_OUT',
          channelId,
          directive: 'REROUTE_TRAFFIC',
          successMessage: 'Reroute directive sent',
        });
        return;
      }

      if (directive === 'RESTRICT') {
        emitDirectiveMacro({
          eventType: 'HOLD',
          channelId,
          directive: 'RESTRICT_NON_ESSENTIAL',
          successMessage: 'Net restriction directive sent',
        });
        return;
      }

      emitDirectiveMacro({
        eventType: 'SELF_CHECK',
        channelId,
        directive: 'CHECK_IN_REQUEST',
        successMessage: 'Check-in request broadcast',
      });
    },
    [channelHealth, emitDirectiveMacro]
  );

  const connectionTone =
    connectionState === 'CONNECTED'
      ? 'text-green-400'
      : connectionState === 'ERROR'
        ? 'text-red-400'
        : 'text-zinc-500';

  const renderPTTButton = () => (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onStartPTT?.();
      }}
      onMouseUp={(event) => {
        event.preventDefault();
        onStopPTT?.();
      }}
      onMouseLeave={() => onStopPTT?.()}
      onTouchStart={() => onStartPTT?.()}
      onTouchEnd={() => onStopPTT?.()}
      onTouchCancel={() => onStopPTT?.()}
      className={`h-6 text-[9px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
        pttActive ? 'bg-orange-500/25 hover:bg-orange-500/35 text-orange-200' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
      }`}
      title="Hold to transmit"
    >
      <Volume2 className="w-3 h-3" />
      {pttActive ? 'TX' : 'PTT'}
    </button>
  );

  const renderGlobalControlCluster = () => (
    <div className="px-2 py-1.5 rounded border border-zinc-700/40 bg-zinc-900/40 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide">
        <span className="text-zinc-500">Voice Controls</span>
        <span className="text-zinc-600">{participants.length} online</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onSetMicEnabled?.(!micEnabled)}
          className={`h-6 text-[9px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
            micEnabled ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
          }`}
          title={micEnabled ? 'Mute microphone' : 'Enable microphone'}
        >
          {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </button>
        {renderPTTButton()}
        <button
          type="button"
          onClick={() => onRequestToSpeak?.()}
          className="h-6 text-[9px] px-2 rounded border border-zinc-700 text-zinc-400 hover:border-orange-500/40 transition-colors flex items-center justify-center gap-1"
          title="Request transmit privilege"
        >
          <Zap className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-wide">
        <span className={`px-1.5 py-0.5 rounded border ${String(transmitNetId || '') ? 'border-green-500/40 text-green-300 bg-green-500/20' : 'border-zinc-700 text-zinc-500'}`}>
          {String(transmitNetId || '') ? `TX ${transmitNetId}` : 'TX NONE'}
        </span>
        <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500">MON {monitoredSet.size}</span>
      </div>
      {speakingParticipants.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap">
          {speakingParticipants.map((participant) => (
            <span
              key={participant.id || participant.userId || participant.clientId || participant.callsign}
              className="px-1.5 py-0.5 rounded border border-orange-500/35 bg-orange-500/15 text-orange-200 text-[8px] uppercase tracking-wide"
            >
              {participant.callsign || participant.name || participant.id}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderQuickNetCard = (net) => {
    const id = netIdentity(net);
    const isActive = activeNet && netIdentity(activeNet) === id;
    const isTransmit = String(transmitNetId || '') === id;
    const isMonitored = isMonitoredNet(id);

    return (
      <div
        key={id}
        className={`w-full px-2 py-1.5 rounded border text-[10px] ${
          isActive ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-zinc-900/40 border-zinc-700/40 text-zinc-400'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold uppercase tracking-wider truncate">{net.code || net.id || net.name}</div>
            <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{net.label || net.description || 'Voice lane'}</div>
          </div>
          <div className="flex items-center gap-1">
            {isTransmit ? <span className="px-1 py-0.5 rounded border border-green-500/40 bg-green-500/20 text-green-300 text-[8px]">TX</span> : null}
            {isMonitored ? <span className="px-1 py-0.5 rounded border border-blue-500/40 bg-blue-500/20 text-blue-300 text-[8px]">MON</span> : null}
          </div>
        </div>
        <div className="flex gap-1 mt-1.5">
          {isMonitored ? (
            <>
              <button
                type="button"
                onClick={() => onSetTransmitNet?.(id)}
                className="flex-1 h-5 rounded border border-zinc-700 text-[9px] hover:border-green-500/40"
              >
                TX
              </button>
              <button
                type="button"
                onClick={() => onLeaveNet?.(id)}
                className="flex-1 h-5 rounded border border-zinc-700 text-[9px] hover:border-red-500/40"
              >
                Leave
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onJoinNet?.(id)}
                className="flex-1 h-5 rounded border border-zinc-700 text-[9px] hover:border-green-500/40"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => onMonitorNet?.(id)}
                className="flex-1 h-5 rounded border border-zinc-700 text-[9px] hover:border-blue-500/40"
              >
                Monitor
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`nx-voice-rail flex flex-col h-full bg-zinc-950/80 border-l border-zinc-700/40 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'w-full' : 'w-12'}`}>
      <div className="px-2 py-1.5 nx-voice-header border-b border-zinc-700/40 bg-zinc-900/20 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <Radio className="w-3.5 h-3.5 text-green-500" />
                <h3 className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider truncate">Voice Command</h3>
                <span className={`text-[8px] font-mono uppercase ${connectionTone}`}>{connectionState}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode((prev) => prev === 'standard' ? 'command' : 'standard')}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-zinc-700 text-zinc-400 hover:text-zinc-300"
                  title={`Switch to ${displayMode === 'standard' ? 'command' : 'standard'} mode`}
                >
                  {displayMode === 'standard' ? 'Std' : 'Cmd'}
                </button>
                <button type="button" onClick={onToggleExpand} className="p-0.5 text-zinc-500 hover:text-green-500 transition-colors" title="Collapse">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={onToggleExpand} className="w-full flex items-center justify-center text-zinc-500 hover:text-green-500 transition-colors" title="Expand">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded ? (
        <div className="px-2 py-2 flex-1 min-h-0 overflow-y-auto space-y-2">
          {renderGlobalControlCluster()}

          {displayMode === 'standard' ? (
            <>
              {activeNet ? (
                <div className="px-2 py-2 rounded border border-green-500/30 bg-green-500/10">
                  <div className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Active Net</div>
                  <div className="text-[11px] font-bold text-green-300 mt-1 truncate">{activeNet.code || activeNet.id || activeNet.name}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5 truncate">{activeNet.label || 'Voice lane active'}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <span className={`px-1.5 py-0.5 rounded border ${String(transmitNetId || '') === netIdentity(activeNet) ? 'border-green-500/40 text-green-300 bg-green-500/20' : 'border-zinc-700 text-zinc-500'}`}>TX</span>
                    <span className={`px-1.5 py-0.5 rounded border ${isMonitoredNet(netIdentity(activeNet)) ? 'border-blue-500/40 text-blue-300 bg-blue-500/20' : 'border-zinc-700 text-zinc-500'}`}>MON</span>
                    <span className="text-zinc-500">{participants.length} online</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">Voice Lanes</div>
                {quickVisibleNets.length > 0 ? quickVisibleNets.map(renderQuickNetCard) : (
                  <div className="text-[9px] text-zinc-600 text-center py-4">No voice nets available</div>
                )}
              </div>

              {quickPageCount > 1 ? (
                <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setQuickPage((prev) => Math.max(0, prev - 1))}
                    disabled={quickPage === 0}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                  >
                    Prev
                  </button>
                  <span>{quickPage + 1}/{quickPageCount}</span>
                  <button
                    type="button"
                    onClick={() => setQuickPage((prev) => Math.min(quickPageCount - 1, prev + 1))}
                    disabled={quickPage >= quickPageCount - 1}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex border border-zinc-700/40 bg-zinc-900/40 rounded">
                <button
                  type="button"
                  onClick={() => setSelectedTab('nets')}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    selectedTab === 'nets' ? 'text-green-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Radio className="w-3 h-3 inline mr-1" />
                  Nets
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('health')}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    selectedTab === 'health' ? 'text-green-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Activity className="w-3 h-3 inline mr-1" />
                  Health
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('incidents')}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    selectedTab === 'incidents' ? 'text-green-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Queue
                </button>
              </div>

              {selectedTab === 'nets' ? (
                <>
                  {activeNet ? (
                    <div className="px-2 py-2 rounded border border-green-500/30 bg-green-500/10">
                      <div className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Active Net</div>
                      <div className="text-[11px] font-bold text-green-300 mt-1">{activeNet.code || activeNet.id || activeNet.name}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{activeNet.label || 'Voice lane active'}</div>
                      <div className="flex gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => onSetMicEnabled?.(!micEnabled)}
                          className={`flex-1 h-6 text-[9px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
                            micEnabled ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
                          }`}
                        >
                          {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        </button>
                        {renderPTTButton()}
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {DISCIPLINE_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => onSetDisciplineMode?.(mode.id)}
                            className={`h-6 text-[9px] px-1 rounded border transition-colors ${
                              disciplineMode === mode.id
                                ? 'border-green-500/40 bg-green-500/20 text-green-300'
                                : 'border-zinc-700 bg-zinc-900/60 text-zinc-500 hover:border-zinc-500'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {voiceNets.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">Available Nets</div>
                      {pagedNets.map(renderQuickNetCard)}

                      {netsPageCount > 1 ? (
                        <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                          <button
                            type="button"
                            onClick={() => setNetsPage((prev) => Math.max(0, prev - 1))}
                            disabled={netsPage === 0}
                            className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                          >
                            Prev
                          </button>
                          <span>{netsPage + 1}/{netsPageCount}</span>
                          <button
                            type="button"
                            onClick={() => setNetsPage((prev) => Math.min(netsPageCount - 1, prev + 1))}
                            disabled={netsPage >= netsPageCount - 1}
                            className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                          >
                            Next
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-[9px] text-zinc-600 text-center py-4">No voice nets available</div>
                  )}
                </>
              ) : selectedTab === 'health' ? (
                <>
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">
                      Channel Health ({degradedChannelCount} degraded)
                    </div>
                    {visibleHealth.map((entry) => (
                      <div key={entry.channelId} className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[10px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-200 truncate">{entry.label}</span>
                          <NexusBadge tone={entry.discipline === 'SATURATED' ? 'danger' : entry.discipline === 'BUSY' ? 'warning' : 'ok'}>
                            {entry.discipline}
                          </NexusBadge>
                        </div>
                        <div className="mt-1 text-[9px] text-zinc-500">Q {entry.qualityPct}% · {entry.latencyMs}ms</div>
                      </div>
                    ))}
                    {visibleHealth.length === 0 ? (
                      <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">
                        No channel health data available.
                      </div>
                    ) : null}
                  </div>

                  {healthPageCount > 1 ? (
                    <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setHealthPage((prev) => Math.max(0, prev - 1))}
                        disabled={healthPage === 0}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Prev
                      </button>
                      <span>{healthPage + 1}/{healthPageCount}</span>
                      <button
                        type="button"
                        onClick={() => setHealthPage((prev) => Math.min(healthPageCount - 1, prev + 1))}
                        disabled={healthPage >= healthPageCount - 1}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}

                  {disciplineAlerts.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">Discipline Alerts</div>
                      {disciplineAlerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[9px] text-zinc-200 uppercase tracking-wide truncate">{alert.title}</div>
                            <NexusBadge tone={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'neutral'}>
                              {alert.severity}
                            </NexusBadge>
                          </div>
                          <div className="mt-0.5 text-[9px] text-zinc-500">{alert.detail}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 flex items-center justify-between">
                      <span>Priority Queue ({unresolvedIncidentCount})</span>
                      {criticalIncidentCount > 0 ? <NexusBadge tone="danger">{criticalIncidentCount} CRIT</NexusBadge> : null}
                    </div>
                    {visibleIncidents.map((incident) => {
                      const active = incident.id === selectedIncidentId;
                      return (
                        <button
                          key={incident.id}
                          type="button"
                          className={`w-full text-left rounded border px-2 py-1.5 transition-colors ${
                            active ? 'border-orange-500/60 bg-orange-500/10' : 'border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600'
                          }`}
                          onClick={() => setSelectedIncidentId(incident.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-200 truncate">{incident.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <NexusBadge tone={incidentPriorityTone(incident.priority)}>{incident.priority.slice(0, 3)}</NexusBadge>
                              <NexusBadge tone={incidentStatusTone(incident.status)}>{incident.status}</NexusBadge>
                            </div>
                          </div>
                          <div className="mt-1 text-[9px] text-zinc-500 truncate">{incident.detail}</div>
                        </button>
                      );
                    })}
                    {visibleIncidents.length === 0 ? (
                      <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">
                        No priority incidents in scope.
                      </div>
                    ) : null}
                  </div>

                  {incidentPageCount > 1 ? (
                    <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setIncidentPage((prev) => Math.max(0, prev - 1))}
                        disabled={incidentPage === 0}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                      >
                        Prev
                      </button>
                      <span>{incidentPage + 1}/{incidentPageCount}</span>
                      <button
                        type="button"
                        onClick={() => setIncidentPage((prev) => Math.min(incidentPageCount - 1, prev + 1))}
                        disabled={incidentPage >= incidentPageCount - 1}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}

                  {selectedIncident ? (
                    <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] text-zinc-200 truncate">{selectedIncident.title}</div>
                        <span className="text-[9px] text-zinc-500">{formatAge(nowMs, selectedIncident.createdAtMs)} ago</span>
                      </div>
                      <div className="mt-1 text-[9px] text-zinc-500">{selectedIncident.detail}</div>
                      <div className="mt-2 flex gap-1">
                        <NexusButton
                          size="sm"
                          intent={canTransitionIncidentStatus(selectedIncident.status, 'ACKED') ? 'primary' : 'subtle'}
                          onClick={() => transitionIncident('ACKED')}
                          disabled={!canTransitionIncidentStatus(selectedIncident.status, 'ACKED')}
                          className="flex-1 text-[9px] h-6"
                        >
                          Ack
                        </NexusButton>
                        <NexusButton
                          size="sm"
                          intent={canTransitionIncidentStatus(selectedIncident.status, 'ASSIGNED') ? 'primary' : 'subtle'}
                          onClick={() => transitionIncident('ASSIGNED')}
                          disabled={!canTransitionIncidentStatus(selectedIncident.status, 'ASSIGNED')}
                          className="flex-1 text-[9px] h-6"
                        >
                          Assign
                        </NexusButton>
                        <NexusButton
                          size="sm"
                          intent={canTransitionIncidentStatus(selectedIncident.status, 'RESOLVED') ? 'primary' : 'subtle'}
                          onClick={() => transitionIncident('RESOLVED')}
                          disabled={!canTransitionIncidentStatus(selectedIncident.status, 'RESOLVED')}
                          className="flex-1 text-[9px] h-6"
                        >
                          Resolve
                        </NexusButton>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-2">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Comms Directives</div>
                    <div className="flex flex-col gap-1">
                      <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('REROUTE')} className="text-[9px] h-6">
                        Reroute Net
                      </NexusButton>
                      <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('RESTRICT')} className="text-[9px] h-6">
                        Restrict Net
                      </NexusButton>
                      <NexusButton size="sm" intent="subtle" onClick={() => dispatchDirective('CHECKIN')} className="text-[9px] h-6">
                        Broadcast Check-In
                      </NexusButton>
                    </div>
                  </div>

                  {deliverySurface.length > 0 ? (
                    <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-2">
                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Recent Dispatches</div>
                      <div className="space-y-1">
                        {deliverySurface.slice(0, 3).map((dispatch) => (
                          <div key={dispatch.dispatchId} className="text-[9px] flex items-center justify-between gap-1">
                            <span className="text-zinc-300 truncate">{dispatch.directive}</span>
                            <NexusBadge tone={deliveryTone(dispatch.status)}>{dispatch.status}</NexusBadge>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[8px]">
                        <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : 'warning'}>
                          Confidence {deliveryStats.confidencePct}%
                        </NexusBadge>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {selectedTab === 'roster' && participants.length > 0 ? (
                <>
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">Participants ({participants.length})</div>
                    {pagedParticipants.map((participant) => (
                      <div key={participant.id || participant.userId || participant.clientId || participant.callsign} className="px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-700/40 hover:border-green-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-300 truncate">{participant.callsign || participant.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-zinc-500 uppercase">{participant.isSpeaking ? 'TALK' : participant.state || 'READY'}</span>
                            <div className={`w-2 h-2 rounded-full ${participant.isSpeaking ? 'bg-orange-500' : 'bg-green-500'}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rosterPageCount > 1 ? (
                    <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setRosterPage((prev) => Math.max(0, prev - 1))}
                        disabled={rosterPage === 0}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Prev
                      </button>
                      <span>{rosterPage + 1}/{rosterPageCount}</span>
                      <button
                        type="button"
                        onClick={() => setRosterPage((prev) => Math.min(rosterPageCount - 1, prev + 1))}
                        disabled={rosterPage >= rosterPageCount - 1}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}

          {feedback ? (
            <div className="px-2 py-1.5 rounded border border-orange-500/40 bg-orange-500/10 text-[9px] text-orange-300">
              {feedback}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}