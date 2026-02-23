import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Plus,
  Radio,
  Signal,
  Volume2,
} from 'lucide-react';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import { NexusBadge, NexusButton } from '../primitives';
import { tokenAssets } from '../tokens';
import {
  operatorStatusTone,
  operatorStatusTokenIcon,
  roleTokenIcon,
  squadTokenIcon,
  vehicleStatusTone,
  vehicleStatusTokenIcon,
  wingTokenIcon,
} from './commsTokenSemantics';
import {
  buildCompactChannelCards,
  buildSchemaTree,
  COMPACT_CHANNEL_CARD_PAGE_SIZE,
  SCHEMA_CHANNEL_PAGE_SIZE,
} from './commsFleetSchemaRuntime';

const PAGE_SIZE = 5;
const QUICK_NET_PAGE_SIZE = 4;
const DISCIPLINE_MODES = [
  { id: 'OPEN', label: 'Open' },
  { id: 'PTT', label: 'PTT' },
  { id: 'REQUEST_TO_SPEAK', label: 'Req' },
  { id: 'COMMAND_ONLY', label: 'Cmd' },
];

function isParticipantSpeaking(participant) {
  if (participant?.isSpeaking) return true;
  const state = String(participant?.state || '').toUpperCase();
  return state.includes('TALK') || state.includes('TX') || state.includes('SPEAK');
}

function participantStatusLabel(participant) {
  if (isParticipantSpeaking(participant)) return 'TX';
  if (participant?.muted || String(participant?.state || '').toUpperCase().includes('MUTE')) return 'MUTED';
  if (participant) return 'ON-NET';
  return 'OFF-NET';
}

function normalizeChannelRow(entry) {
  const id = String(entry?.id || entry?.code || '').trim();
  const label = String(entry?.label || entry?.name || entry?.code || id || 'Voice lane').trim();
  if (!id) return null;
  return {
    id,
    label,
    membershipCount: Number(entry?.membershipCount || entry?.member_count || 0),
    intensity: Number(entry?.intensity || 0),
  };
}

function channelRowsFromVoiceNets(voiceNets) {
  return (Array.isArray(voiceNets) ? voiceNets : [])
    .map((entry) => {
      const id = String(entry?.id || entry?.code || '').trim();
      if (!id) return null;
      return {
        id,
        label: String(entry?.label || entry?.name || entry?.code || id).trim(),
        membershipCount: 0,
        intensity: 0,
      };
    })
    .filter(Boolean);
}

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
  roster = [],
  graphChannels = [],
  graphEdges = [],
}) {
  const [selectedTab, setSelectedTab] = useState('nets');
  const [fleetView, setFleetView] = useState('cards');
  const [quickPage, setQuickPage] = useState(0);
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [schemaChannelPage, setSchemaChannelPage] = useState(0);
  const [fleetCardPage, setFleetCardPage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showNetCreator, setShowNetCreator] = useState(false);
  const [schemaExpandedById, setSchemaExpandedById] = useState({
    'fleet:redscar': true,
    'wing:CE': true,
  });

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

  const sourceChannels = useMemo(() => {
    const explicit = (Array.isArray(graphChannels) ? graphChannels : []).map(normalizeChannelRow).filter(Boolean);
    return explicit.length > 0 ? explicit : channelRowsFromVoiceNets(voiceNets);
  }, [graphChannels, voiceNets]);

  const sourceEdges = useMemo(() => (Array.isArray(graphEdges) ? graphEdges : []), [graphEdges]);

  const { schemaTree, schemaChannelPageCount } = useMemo(
    () =>
      buildSchemaTree({
        channels: sourceChannels,
        edges: sourceEdges,
        roster,
        voiceParticipants: participants,
        schemaChannelPage,
      }),
    [sourceChannels, sourceEdges, roster, participants, schemaChannelPage]
  );

  const fleetCardsState = useMemo(
    () => buildCompactChannelCards({ schemaTree, page: fleetCardPage }),
    [schemaTree, fleetCardPage]
  );

  const fleetCards = fleetCardsState.cards;
  const fleetCardPageCount = fleetCardsState.pageCount;

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
    setSchemaChannelPage((current) => Math.min(current, schemaChannelPageCount - 1));
  }, [schemaChannelPageCount]);

  useEffect(() => {
    setFleetCardPage((current) => Math.min(current, fleetCardPageCount - 1));
  }, [fleetCardPageCount]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

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

  const speakingParticipants = useMemo(
    () => participants.filter((participant) => isParticipantSpeaking(participant)).slice(0, 3),
    [participants]
  );

  const isSchemaExpanded = useCallback((id, fallback = false) => {
    if (Object.prototype.hasOwnProperty.call(schemaExpandedById, id)) return Boolean(schemaExpandedById[id]);
    return fallback;
  }, [schemaExpandedById]);

  const toggleSchemaExpanded = useCallback((id, fallback = false) => {
    setSchemaExpandedById((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, id) ? Boolean(prev[id]) : fallback;
      return {
        ...prev,
        [id]: !current,
      };
    });
  }, []);

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
        <span className="text-zinc-500">Global Voice Controls</span>
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
          <Signal className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
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
      {speakingParticipants.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap">
          {speakingParticipants.map((participant) => (
            <span
              key={participant.id || participant.userId || participant.clientId || participant.callsign}
              className="px-1.5 py-0.5 rounded border border-orange-500/35 bg-orange-500/15 text-orange-200 text-[8px] uppercase tracking-wide inline-flex items-center gap-1"
            >
              <img src={tokenAssets.comms.operatorStatus.tx} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
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
            <div className="font-bold uppercase tracking-wider truncate inline-flex items-center gap-1">
              <img src={tokenAssets.comms.channel} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
              {net.code || net.id || net.name}
            </div>
            <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{net.label || net.description || 'Voice lane'}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isTransmit ? <NexusBadge tone="warning">TX</NexusBadge> : null}
            {isMonitored ? <NexusBadge tone="active">MON</NexusBadge> : null}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => onJoinNet?.(id)}
            className="h-5 rounded border border-zinc-700 text-[8px] text-zinc-400 hover:border-green-500/40"
            title="Join net"
          >
            Join
          </button>
          <button
            type="button"
            onClick={() => onMonitorNet?.(id)}
            className="h-5 rounded border border-zinc-700 text-[8px] text-zinc-400 hover:border-green-500/40"
            title="Monitor net"
          >
            Mon
          </button>
          <button
            type="button"
            onClick={() => onSetTransmitNet?.(id)}
            className="h-5 rounded border border-zinc-700 text-[8px] text-zinc-400 hover:border-orange-500/40"
            title="Set transmit net"
          >
            TX
          </button>
          <button
            type="button"
            onClick={() => onLeaveNet?.(id)}
            className="h-5 rounded border border-zinc-700 text-[8px] text-zinc-400 hover:border-red-500/40"
            title="Leave net"
          >
            Leave
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="px-2 py-1.5 border-b border-zinc-700/40 bg-zinc-900/45 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider truncate">Voice Comms Rail</h3>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">Connection: {connectionState}</div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-6 h-6 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 flex items-center justify-center"
              title={isExpanded ? 'Collapse rail' : 'Expand rail'}
            >
              {isExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : null}
          <NexusBadge tone={connectionState === 'CONNECTED' ? 'ok' : connectionState === 'ERROR' ? 'danger' : 'neutral'}>
            {connectionState === 'CONNECTED' ? 'LINK' : connectionState}
          </NexusBadge>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="px-2 py-1 border-b border-zinc-700/30 bg-zinc-900/30">
            {renderGlobalControlCluster()}
          </div>

          <div className="px-2 py-1 flex items-center gap-1 border-b border-zinc-700/30 bg-zinc-900/20">
            <button
              type="button"
              onClick={() => setSelectedTab('nets')}
              className={`h-6 px-2 text-[9px] uppercase tracking-wide rounded border ${
                selectedTab === 'nets' ? 'text-green-400 bg-zinc-800 border-green-500/40' : 'text-zinc-500 hover:text-zinc-300 border-zinc-700'
              }`}
            >
              Nets
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('fleet')}
              className={`h-6 px-2 text-[9px] uppercase tracking-wide rounded border ${
                selectedTab === 'fleet' ? 'text-green-400 bg-zinc-800 border-green-500/40' : 'text-zinc-500 hover:text-zinc-300 border-zinc-700'
              }`}
            >
              Fleet
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('roster')}
              className={`h-6 px-2 text-[9px] uppercase tracking-wide rounded border ${
                selectedTab === 'roster' ? 'text-green-400 bg-zinc-800 border-green-500/40' : 'text-zinc-500 hover:text-zinc-300 border-zinc-700'
              }`}
            >
              Roster
            </button>
          </div>

          <div className="flex-1 min-h-0 px-2 py-1.5 space-y-1.5 overflow-hidden">
            {selectedTab === 'nets' ? (
              <>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-1">Quick Nets</div>
                  {quickVisibleNets.length > 0 ? quickVisibleNets.map(renderQuickNetCard) : (
                    <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">No quick nets available.</div>
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

                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>All Nets</span>
                    <button
                      type="button"
                      onClick={() => setShowNetCreator(true)}
                      className="px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:border-green-500/60 hover:text-green-400 transition-colors flex items-center gap-1"
                      title="Create new voice net"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {pagedNets.length > 0 ? pagedNets.map(renderQuickNetCard) : (
                    <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">No voice nets available.</div>
                  )}
                </div>

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
              </>
            ) : null}

            {selectedTab === 'fleet' ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <NexusButton size="sm" intent={fleetView === 'cards' ? 'primary' : 'subtle'} onClick={() => setFleetView('cards')}>
                      Cards
                    </NexusButton>
                    <NexusButton size="sm" intent={fleetView === 'schema' ? 'primary' : 'subtle'} onClick={() => setFleetView('schema')}>
                      Schema
                    </NexusButton>
                  </div>
                  <div className="text-[9px] text-zinc-500">Lane Pg {schemaChannelPage + 1}/{schemaChannelPageCount}</div>
                </div>

                <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setSchemaChannelPage((prev) => Math.max(0, prev - 1))}
                    disabled={schemaChannelPage === 0}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                  >
                    Lane Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemaChannelPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))}
                    disabled={schemaChannelPage >= schemaChannelPageCount - 1}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                  >
                    Lane Next
                  </button>
                </div>

                {fleetView === 'cards' ? (
                  <>
                    <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setFleetCardPage((prev) => Math.max(0, prev - 1))}
                        disabled={fleetCardPage === 0}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Card Prev
                      </button>
                      <span>{fleetCardPage + 1}/{fleetCardPageCount}</span>
                      <button
                        type="button"
                        onClick={() => setFleetCardPage((prev) => Math.min(fleetCardPageCount - 1, prev + 1))}
                        disabled={fleetCardPage >= fleetCardPageCount - 1}
                        className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-green-500/60"
                      >
                        Card Next
                      </button>
                    </div>

                    <div className="space-y-1">
                      {fleetCards.map((card) => (
                        <article key={card.id} className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] text-zinc-100 uppercase tracking-wide truncate inline-flex items-center gap-1">
                                <img src={tokenAssets.comms.vehicle} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                {card.vehicleLabel}
                              </div>
                              <div className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">{card.wingLabel} · {card.squadLabel}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <img src={vehicleStatusTokenIcon(card.vehicleStatus)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                              <NexusBadge tone={vehicleStatusTone(card.vehicleStatus)}>{card.vehicleStatus}</NexusBadge>
                            </div>
                          </div>
                          <div className="mt-1 text-[9px] text-zinc-300 truncate inline-flex items-center gap-1">
                            <img src={tokenAssets.comms.channel} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            {card.channelLabel}
                          </div>
                          <div className="mt-1 grid grid-cols-1 gap-0.5">
                            {card.operators.length > 0 ? (
                              card.operators.map((operator) => (
                                <div key={operator.id} className="rounded border border-zinc-700/40 bg-zinc-950/55 px-1.5 py-0.5 flex items-center justify-between gap-1">
                                  <span className="text-[9px] text-zinc-200 truncate inline-flex items-center gap-1 min-w-0">
                                    <img src={roleTokenIcon(operator.role)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                    {operator.callsign}
                                  </span>
                                  <span className="inline-flex items-center gap-1 shrink-0">
                                    <img src={operatorStatusTokenIcon(operator.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                    <NexusBadge tone={operatorStatusTone(operator.status)}>{operator.status}</NexusBadge>
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="rounded border border-zinc-700/40 bg-zinc-950/55 px-1.5 py-0.5 text-[9px] text-zinc-500">No operators assigned.</div>
                            )}
                          </div>
                        </article>
                      ))}

                      {fleetCards.length === 0 ? (
                        <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">
                          No fleet cards available for this lane page (cap {COMPACT_CHANNEL_CARD_PAGE_SIZE}).
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-1 text-left rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1"
                      onClick={() => toggleSchemaExpanded('fleet:redscar', true)}
                    >
                      {isSchemaExpanded('fleet:redscar', true) ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                      <img src={tokenAssets.map.node.comms} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                      <span className="text-[10px] text-zinc-200 uppercase tracking-wide">REDSCAR Fleet</span>
                      <NexusBadge tone="neutral" className="ml-auto">Wing {schemaTree.filter((wing) => wing.squads.length > 0).length}</NexusBadge>
                    </button>

                    {isSchemaExpanded('fleet:redscar', true)
                      ? schemaTree.map((wing) => {
                          if (!wing.squads.length) return null;
                          const wingKey = `wing:${wing.id}`;
                          return (
                            <div key={wing.id} className="pl-2 space-y-1">
                              <button
                                type="button"
                                className="w-full flex items-center gap-1 text-left rounded border border-zinc-700/40 bg-zinc-900/35 px-2 py-1"
                                onClick={() => toggleSchemaExpanded(wingKey, wing.id === 'CE')}
                              >
                                {isSchemaExpanded(wingKey, wing.id === 'CE') ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                                <img src={wingTokenIcon(wing.id)} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                <span className="text-[10px] text-zinc-200 uppercase tracking-wide">{wing.label}</span>
                                <NexusBadge tone="neutral" className="ml-auto">Squad {wing.squads.length}</NexusBadge>
                              </button>

                              {isSchemaExpanded(wingKey, wing.id === 'CE')
                                ? wing.squads.slice(0, 3).map((squad) => (
                                    <div key={squad.id} className="pl-2">
                                      <div className="rounded border border-zinc-700/30 bg-zinc-900/25 px-2 py-1 text-[9px] text-zinc-300 uppercase tracking-wide inline-flex items-center gap-1 w-full">
                                        <img src={squadTokenIcon(squad.label)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                        <span className="truncate">{squad.label}</span>
                                      </div>
                                      <div className="pl-3 pt-0.5 space-y-0.5">
                                        {squad.channels.slice(0, 3).map((channel) => (
                                          <div key={channel.id} className="rounded border border-zinc-700/30 bg-zinc-900/20 px-1.5 py-0.5 text-[9px] text-zinc-400 inline-flex items-center gap-1 w-full">
                                            <img src={tokenAssets.comms.channel} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                            <span className="truncate">{channel.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                : null}
                            </div>
                          );
                        })
                      : null}
                  </div>
                )}

                <div className="text-[9px] text-zinc-500">Fleet lane cap {SCHEMA_CHANNEL_PAGE_SIZE} · card cap {COMPACT_CHANNEL_CARD_PAGE_SIZE}</div>
              </>
            ) : null}

            {selectedTab === 'roster' ? (
              <>
                <div className="space-y-1">
                  {pagedParticipants.map((participant) => {
                    const status = participantStatusLabel(participant);
                    return (
                      <div key={participant.id || participant.userId || participant.clientId || participant.callsign} className="px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-700/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-zinc-300 truncate inline-flex items-center gap-1">
                            <img src={tokenAssets.comms.role.default} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            {participant.callsign || participant.name || participant.id}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <img src={operatorStatusTokenIcon(status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                            <NexusBadge tone={operatorStatusTone(status)}>{status}</NexusBadge>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {pagedParticipants.length === 0 ? (
                    <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1.5 text-[9px] text-zinc-500">No participants online.</div>
                  ) : null}
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

            {feedback ? (
              <div className="px-2 py-1.5 rounded border border-orange-500/40 bg-orange-500/10 text-[9px] text-orange-300 inline-flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {feedback}
              </div>
            ) : null}
          </div>

          {showNetCreator && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg p-4 m-4 shadow-2xl">
                <VoiceNetCreator
                  onSuccess={() => {
                    setShowNetCreator(false);
                    setFeedback('Voice net created successfully');
                  }}
                  onCancel={() => setShowNetCreator(false)}
                />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
