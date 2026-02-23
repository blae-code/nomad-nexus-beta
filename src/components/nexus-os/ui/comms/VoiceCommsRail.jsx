import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Plus,
  Radio,
  Signal,
  Volume2 } from
'lucide-react';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import { NexusBadge } from '../primitives';
import { tokenAssets } from '../tokens';
import {
  operatorStatusTone,
  operatorStatusTokenIcon } from
'./commsTokenSemantics';

const PAGE_SIZE = 5;
const QUICK_NET_PAGE_SIZE = 4;
const DISCIPLINE_MODES = [
{ id: 'OPEN', label: 'Open' },
{ id: 'PTT', label: 'PTT' },
{ id: 'REQUEST_TO_SPEAK', label: 'Req' },
{ id: 'COMMAND_ONLY', label: 'Cmd' }];


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
    intensity: Number(entry?.intensity || 0)
  };
}

function channelRowsFromVoiceNets(voiceNets) {
  return (Array.isArray(voiceNets) ? voiceNets : []).
  map((entry) => {
    const id = String(entry?.id || entry?.code || '').trim();
    if (!id) return null;
    return {
      id,
      label: String(entry?.label || entry?.name || entry?.code || id).trim(),
      membershipCount: 0,
      intensity: 0
    };
  }).
  filter(Boolean);
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
  focusMode = ''
}) {
  const [selectedTab, setSelectedTab] = useState('nets');
  const [quickPage, setQuickPage] = useState(0);
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showNetCreator, setShowNetCreator] = useState(false);

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
      null);

  }, [voiceNets, activeNetId, transmitNetId]);

  const quickNets = useMemo(() => {
    if (!activeNet) return voiceNets;
    return [activeNet, ...voiceNets.filter((entry) => netIdentity(entry) !== netIdentity(activeNet))];
  }, [voiceNets, activeNet]);

  const quickPageCount = Math.max(1, Math.ceil(quickNets.length / quickPageSize));
  const netsPageCount = Math.max(1, Math.ceil(voiceNets.length / PAGE_SIZE));
  const rosterPageCount = Math.max(1, Math.ceil(participants.length / PAGE_SIZE));



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

  const renderPTTButton = () =>
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
    className={`h-6 text-[9px] px-2 rounded border transition-colors flex items-center justify-center gap-1 ${
    pttActive ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-200' : 'bg-zinc-900/60 border-red-700/30 hover:bg-zinc-800/60 text-zinc-400'}`
    }
    title="Hold to transmit">

      <Volume2 className="w-3 h-3" />
      {pttActive ? 'TX' : 'PTT'}
    </button>;


  const renderGlobalControlCluster = () =>
  <div className="px-2 py-1.5 rounded border border-red-700/30 bg-zinc-950/60 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide">
        <span className="text-zinc-400">Global Voice Controls</span>
        <span className="text-orange-400">{participants.length} online</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button
        type="button"
        onClick={() => onSetMicEnabled?.(!micEnabled)}
        className={`h-6 text-[9px] px-2 rounded border transition-colors flex items-center justify-center gap-1 ${
        micEnabled ? 'bg-green-500/15 border-green-500/40 hover:bg-green-500/20 text-green-300' : 'bg-zinc-900/60 border-red-700/30 hover:bg-zinc-800/60 text-zinc-400'}`
        }
        title={micEnabled ? 'Mute microphone' : 'Enable microphone'}>

          {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </button>
        {renderPTTButton()}
        <button
        type="button"
        onClick={() => onRequestToSpeak?.()}
        className="h-6 text-[9px] px-2 rounded border border-red-700/30 text-zinc-400 hover:border-orange-500/40 hover:bg-orange-500/10 transition-colors flex items-center justify-center gap-1"
        title="Request transmit privilege">

          <Signal className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {DISCIPLINE_MODES.map((mode) =>
      <button
        key={mode.id}
        type="button"
        onClick={() => onSetDisciplineMode?.(mode.id)}
        className={`h-6 text-[9px] px-1 rounded border transition-colors ${
        disciplineMode === mode.id ?
        'border-orange-500/40 bg-orange-500/15 text-orange-300' :
        'border-red-700/30 bg-zinc-900/60 text-zinc-500 hover:border-red-700/50 hover:text-zinc-300'}`
        }>

            {mode.label}
          </button>
      )}
      </div>
      {speakingParticipants.length > 0 ?
    <div className="flex items-center gap-1 flex-wrap">
          {speakingParticipants.map((participant) =>
      <span
        key={participant.id || participant.userId || participant.clientId || participant.callsign}
        className="px-1.5 py-0.5 rounded border border-orange-500/35 bg-orange-500/15 text-orange-200 text-[8px] uppercase tracking-wide inline-flex items-center gap-1">

              <img src={tokenAssets.comms.operatorStatus.tx} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
              {participant.callsign || participant.name || participant.id}
            </span>
      )}
        </div> :
    null}
    </div>;


  const renderQuickNetCard = (net) => {
    const id = netIdentity(net);
    const isActive = activeNet && netIdentity(activeNet) === id;
    const isTransmit = String(transmitNetId || '') === id;
    const isMonitored = isMonitoredNet(id);

    return (
      <div
        key={id}
        className={`w-full px-2 py-1.5 rounded border text-[10px] ${
        isActive ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-zinc-950/60 border-red-700/30 text-zinc-400'}`
        }>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold uppercase tracking-wider truncate inline-flex items-center gap-1">
              <img src={tokenAssets.comms.channel} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
              {net.code || net.id || net.name}
            </div>
            <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{net.label || net.description || 'Voice lane'}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isTransmit ? <NexusBadge tone="danger">TX</NexusBadge> : null}
            {isMonitored ? <NexusBadge tone="warning">MON</NexusBadge> : null}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => onJoinNet?.(id)}
            className="h-5 rounded border border-red-700/30 bg-zinc-900/40 text-[8px] text-zinc-400 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
            title="Join net">

            Join
          </button>
          <button
            type="button"
            onClick={() => onMonitorNet?.(id)}
            className="h-5 rounded border border-red-700/30 bg-zinc-900/40 text-[8px] text-zinc-400 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
            title="Monitor net">

            Mon
          </button>
          <button
            type="button"
            onClick={() => onSetTransmitNet?.(id)}
            className="h-5 rounded border border-red-700/30 bg-zinc-900/40 text-[8px] text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            title="Set transmit net">

            TX
          </button>
          <button
            type="button"
            onClick={() => onLeaveNet?.(id)}
            className="h-5 rounded border border-red-700/30 bg-zinc-900/40 text-[8px] text-zinc-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            title="Leave net">

            Leave
          </button>
        </div>
      </div>);

  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-black/95 border-l border-red-700/30">





















      {isExpanded ?
      <>
          <div className="px-2 py-1.5 border-b border-red-700/25 bg-zinc-900/40">
            {renderGlobalControlCluster()}
          </div>

          <div className="px-2 py-1 flex items-center gap-1 border-b border-red-700/20 bg-zinc-900/30">
            <button
            type="button"
            onClick={() => setSelectedTab('nets')}
            className={`h-6 px-2 text-[9px] uppercase tracking-wide rounded border transition-colors ${
            selectedTab === 'nets' ? 'text-orange-300 bg-orange-500/15 border-orange-500/40' : 'text-zinc-500 hover:text-zinc-300 border-zinc-700 hover:border-red-700/40'}`
            }>

              Nets
            </button>
            <button
            type="button"
            onClick={() => setSelectedTab('roster')}
            className={`h-6 px-2 text-[9px] uppercase tracking-wide rounded border transition-colors ${
            selectedTab === 'roster' ? 'text-orange-300 bg-orange-500/15 border-orange-500/40' : 'text-zinc-500 hover:text-zinc-300 border-zinc-700 hover:border-red-700/40'}`
            }>

              Roster
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {selectedTab === 'nets' ?
          <>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-orange-400 uppercase tracking-wider px-1">Quick Nets</div>
                  {quickVisibleNets.length > 0 ? quickVisibleNets.map(renderQuickNetCard) :
              <div className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No quick nets available.</div>
              }
                </div>

                {quickPageCount > 1 ?
            <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                    <button
                type="button"
                onClick={() => setQuickPage((prev) => Math.max(0, prev - 1))}
                disabled={quickPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Prev
                    </button>
                    <span>{quickPage + 1}/{quickPageCount}</span>
                    <button
                type="button"
                onClick={() => setQuickPage((prev) => Math.min(quickPageCount - 1, prev + 1))}
                disabled={quickPage >= quickPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Next
                    </button>
                  </div> :
            null}

                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-orange-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>All Nets</span>
                    <button
                  type="button"
                  onClick={() => setShowNetCreator(true)}
                  className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 text-zinc-400 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 transition-colors flex items-center gap-1"
                  title="Create new voice net">

                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {pagedNets.length > 0 ? pagedNets.map(renderQuickNetCard) :
              <div className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No voice nets available.</div>
              }
                </div>

                {netsPageCount > 1 ?
            <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                    <button
                type="button"
                onClick={() => setNetsPage((prev) => Math.max(0, prev - 1))}
                disabled={netsPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Prev
                    </button>
                    <span>{netsPage + 1}/{netsPageCount}</span>
                    <button
                type="button"
                onClick={() => setNetsPage((prev) => Math.min(netsPageCount - 1, prev + 1))}
                disabled={netsPage >= netsPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Next
                    </button>
                  </div> :
            null}
              </> :
          null}

            {selectedTab === 'roster' ?
          <>
                <div className="space-y-1">
                  {pagedParticipants.map((participant) => {
                const status = participantStatusLabel(participant);
                return (
                  <div key={participant.id || participant.userId || participant.clientId || participant.callsign} className="px-2 py-1.5 rounded bg-zinc-950/60 border border-red-700/30">
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
                      </div>);

              })}

                  {pagedParticipants.length === 0 ?
              <div className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No participants online.</div> :
              null}
                </div>

                {rosterPageCount > 1 ?
            <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.max(0, prev - 1))}
                disabled={rosterPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Prev
                    </button>
                    <span>{rosterPage + 1}/{rosterPageCount}</span>
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.min(rosterPageCount - 1, prev + 1))}
                disabled={rosterPage >= rosterPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors">

                      Next
                    </button>
                  </div> :
            null}
              </> :
          null}

            {feedback ?
          <div className="px-2 py-1.5 rounded border border-red-500/40 bg-red-500/10 text-[9px] text-red-300 inline-flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {feedback}
              </div> :
          null}
          </div>

          {showNetCreator &&
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <div className="w-full max-w-md bg-zinc-950 border border-red-700/40 rounded-lg p-4 m-4 shadow-2xl shadow-red-500/10">
                <VoiceNetCreator
              onSuccess={() => {
                setShowNetCreator(false);
                setFeedback('Voice net created successfully');
              }}
              onCancel={() => setShowNetCreator(false)} />

              </div>
            </div>
        }
        </> :
      null}
    </div>);

}