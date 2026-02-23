import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Mic,
  MicOff,
  Plus,
  Radio,
  Signal,
  Volume2 } from
'lucide-react';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import { NexusBadge } from '../primitives';
import TokenRenderer from '../tokens/TokenRenderer';
import { tokenAssets } from '../tokens';
import {
  channelStatusTokenIcon,
  operatorStatusTone,
  operatorStatusTokenIcon,
  roleTokenIcon,
  squadTokenIcon,
  vehicleStatusTone,
  vehicleStatusTokenIcon,
  wingTokenIcon } from
'./commsTokenSemantics';
import { buildCompactChannelCards, buildSchemaTree } from './commsFleetSchemaRuntime';

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
  variantId,
  opId,
  voiceNets = [],
  activeNetId,
  transmitNetId = '',
  monitoredNetIds = [],
  participants = [],
  roster = [],
  events = [],
  graphChannels = [],
  graphEdges = [],
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
  const [fleetView, setFleetView] = useState('schema');
  const [quickPage, setQuickPage] = useState(0);
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);
  const [fleetSchemaPage, setFleetSchemaPage] = useState(0);
  const [fleetCardPage, setFleetCardPage] = useState(0);
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
  const fleetChannels = useMemo(() => {
    const graphRows = (Array.isArray(graphChannels) ? graphChannels : []).map(normalizeChannelRow).filter(Boolean);
    return graphRows.length > 0 ? graphRows : channelRowsFromVoiceNets(voiceNets);
  }, [graphChannels, voiceNets]);

  const fleetSchemaRuntime = useMemo(
    () =>
    buildSchemaTree({
      channels: fleetChannels,
      edges: Array.isArray(graphEdges) ? graphEdges : [],
      roster: Array.isArray(roster) ? roster : [],
      voiceParticipants: Array.isArray(participants) ? participants : [],
      schemaChannelPage: fleetSchemaPage
    }),
    [fleetChannels, graphEdges, roster, participants, fleetSchemaPage]
  );

  const schemaTree = fleetSchemaRuntime?.schemaTree || [];
  const schemaChannelPageCount = Math.max(1, Number(fleetSchemaRuntime?.schemaChannelPageCount || 1));

  const compactCardRuntime = useMemo(
    () =>
    buildCompactChannelCards({
      schemaTree,
      page: fleetCardPage
    }),
    [schemaTree, fleetCardPage]
  );

  const compactFleetCards = compactCardRuntime?.cards || [];
  const compactFleetCardPageCount = Math.max(1, Number(compactCardRuntime?.pageCount || 1));



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
    setFleetSchemaPage((current) => Math.min(current, schemaChannelPageCount - 1));
  }, [schemaChannelPageCount]);

  useEffect(() => {
    setFleetCardPage((current) => Math.min(current, compactFleetCardPageCount - 1));
  }, [compactFleetCardPageCount]);

  useEffect(() => {
    setFleetCardPage(0);
  }, [fleetSchemaPage]);

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

  const fleetWings = useMemo(
    () =>
    schemaTree.filter((wing) => {
      const squads = Array.isArray(wing?.squads) ? wing.squads : [];
      return squads.some((squad) => Array.isArray(squad?.channels) && squad.channels.length > 0);
    }),
    [schemaTree]
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
    pttActive ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-zinc-900/40 border-zinc-700/40 text-zinc-500'}`
    }
    title="Hold to transmit">

      <Volume2 className="w-3 h-3" />
      PTT
    </button>;


  const renderGlobalControlCluster = () =>
  <div className="px-2 py-1.5 rounded border border-zinc-700/40 bg-zinc-900/40 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[8px] uppercase tracking-wider">
        <span className="text-zinc-500">Voice</span>
        <span className="text-zinc-400">{participants.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
         <button
         type="button"
         onClick={() => onSetMicEnabled?.(!micEnabled)}
         className={`h-6 text-[9px] px-2 rounded border transition-colors flex items-center justify-center gap-1 ${
         micEnabled ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-zinc-900/40 border-zinc-700/40 text-zinc-500'}`
         }
         title={micEnabled ? 'Mute' : 'Enable'}>

           {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
         </button>
        {renderPTTButton()}
        <button
        type="button"
        onClick={() => onRequestToSpeak?.()}
        className="h-6 text-[9px] px-2 rounded border border-zinc-700/40 bg-zinc-900/40 text-zinc-500 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 transition-colors flex items-center justify-center gap-1"
        title="Request">

          <Signal className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {DISCIPLINE_MODES.map((mode) =>
      <button
        key={mode.id}
        type="button"
        onClick={() => onSetDisciplineMode?.(mode.id)}
        className={`h-6 text-[8px] px-1 rounded border transition-colors font-bold uppercase tracking-wider ${
        disciplineMode === mode.id ?
        'border-orange-500/40 bg-orange-500/15 text-orange-300' :
        'border-zinc-700/40 bg-zinc-900/40 text-zinc-500'}`
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

            <TokenRenderer family="circle" color="orange" size="xs" animated />
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
        className={`w-full px-2 py-1 rounded border text-[9px] ${
        isActive ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-zinc-900/40 border-zinc-700/40 text-zinc-500'}`
        }>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold uppercase tracking-wider truncate inline-flex items-center gap-1">
              {net.code || net.id || net.name}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isTransmit ? <NexusBadge tone="danger">TX</NexusBadge> : null}
            {isMonitored ? <NexusBadge tone="warning">MON</NexusBadge> : null}
          </div>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1">
           <button
             type="button"
             onClick={() => onJoinNet?.(id)}
             className="h-5 rounded border border-zinc-700/40 bg-zinc-900/40 text-[7px] text-zinc-500 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 transition-colors font-bold uppercase"
             title="Join">
             J
           </button>
           <button
             type="button"
             onClick={() => onMonitorNet?.(id)}
             className="h-5 rounded border border-zinc-700/40 bg-zinc-900/40 text-[7px] text-zinc-500 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 transition-colors font-bold uppercase"
             title="Monitor">
             M
           </button>
           <button
             type="button"
             onClick={() => onSetTransmitNet?.(id)}
             className="h-5 rounded border border-zinc-700/40 bg-zinc-900/40 text-[7px] text-zinc-500 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 transition-colors font-bold uppercase"
             title="Transmit">
             T
           </button>
           <button
             type="button"
             onClick={() => onLeaveNet?.(id)}
             className="h-5 rounded border border-zinc-700/40 bg-zinc-900/40 text-[7px] text-zinc-500 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 transition-colors font-bold uppercase"
             title="Leave">
             X
           </button>
         </div>
      </div>);

  };

  return (
    <div className={`${isExpanded ? 'w-80' : 'w-12'} bg-black/98 border-l border-zinc-700/40 flex flex-col overflow-hidden z-[900] relative transition-all duration-200 h-full min-h-0`}>
      {/* Header */}
      







































      {isExpanded &&
      <>
          <div className="flex-shrink-0 border-b border-zinc-700/40 bg-zinc-900/40 nexus-top-rail">
             <div className="px-3 py-2 border-b border-zinc-700/40">
               <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Controls</div>
             </div>
            <div className="px-2 py-1.5 bg-black/40">
              {renderGlobalControlCluster()}
            </div>
          </div>

          <div className="flex-shrink-0 px-2 py-1 flex items-center gap-1 border-b border-red-700/40 bg-black/40">
            <button
            type="button"
            onClick={() => setSelectedTab('nets')}
            className={`h-6 px-2 text-[9px] uppercase tracking-wider rounded border transition-colors font-bold ${
            selectedTab === 'nets' ? 'text-red-400 bg-red-950/40 border-red-700/50' : 'text-zinc-600 hover:text-zinc-400 border-red-700/30 hover:border-red-700/50'}`
            }>
              Nets
            </button>
            <button
            type="button"
            onClick={() => setSelectedTab('roster')}
            className={`h-6 px-2 text-[9px] uppercase tracking-wider rounded border transition-colors font-bold ${
            selectedTab === 'roster' ? 'text-orange-400 bg-orange-500/10 border-orange-500/40' : 'text-zinc-500 border-zinc-700/40'}`
            }>
              Roster
            </button>
            <button
            type="button"
            onClick={() => setSelectedTab('fleet')}
            className={`h-6 px-2 text-[9px] uppercase tracking-wider rounded border transition-colors font-bold ${
            selectedTab === 'fleet' ? 'text-orange-400 bg-orange-500/10 border-orange-500/40' : 'text-zinc-500 border-zinc-700/40'}`
            }>
              Fleet
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {selectedTab === 'nets' &&
          <>
                <div className="px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/30">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Quick</div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-1">
                  {quickVisibleNets.length > 0 ? quickVisibleNets.map(renderQuickNetCard) :
                  <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1 text-[8px] text-zinc-600">None</div>
                  }
                </div>

                {quickPageCount > 1 &&
                <div className="px-2 flex items-center justify-between gap-1 text-[8px] text-zinc-500 border-t border-zinc-700/40 py-1">
                    <button
                type="button"
                onClick={() => setQuickPage((prev) => Math.max(0, prev - 1))}
                disabled={quickPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Prev
                    </button>
                    <span className="text-[8px]">{quickPage + 1}/{quickPageCount}</span>
                    <button
                type="button"
                onClick={() => setQuickPage((prev) => Math.min(quickPageCount - 1, prev + 1))}
                disabled={quickPage >= quickPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Next
                    </button>
                  </div>
            }

                <div className="px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/30 flex items-center justify-between">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold">All</div>
                  <button
                  type="button"
                  onClick={() => setShowNetCreator(true)}
                  className="px-1.5 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/40 text-zinc-500 hover:border-orange-500/40 hover:text-orange-300 transition-colors flex items-center gap-1"
                  title="New net">
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="px-2 py-1.5 space-y-1">
                  {pagedNets.length > 0 ? pagedNets.map(renderQuickNetCard) :
                  <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1 text-[8px] text-zinc-600">None</div>
                  }
                </div>

                {netsPageCount > 1 &&
                <div className="px-2 flex items-center justify-between gap-1 text-[8px] text-zinc-500 border-t border-zinc-700/40 py-1">
                    <button
                type="button"
                onClick={() => setNetsPage((prev) => Math.max(0, prev - 1))}
                disabled={netsPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Prev
                    </button>
                    <span className="text-[8px]">{netsPage + 1}/{netsPageCount}</span>
                    <button
                type="button"
                onClick={() => setNetsPage((prev) => Math.min(netsPageCount - 1, prev + 1))}
                disabled={netsPage >= netsPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Next
                    </button>
                  </div>
            }
              </>
          }

            {selectedTab === 'roster' &&
          <>
                <div className="px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/30">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Roster</div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-1">
                  {pagedParticipants.map((participant) => {
                const status = participantStatusLabel(participant);
                const statusColor = status === 'TX' ? 'orange' : status === 'ON-NET' ? 'green' : status === 'MUTED' ? 'grey' : 'red';
                return (
                  <div key={participant.id || participant.userId || participant.clientId || participant.callsign} className="px-2 py-1 rounded bg-zinc-900/40 border border-zinc-700/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-semibold text-zinc-400 truncate inline-flex items-center gap-1">
                            <TokenRenderer family="square" color="cyan" size="xs" />
                            {participant.callsign || participant.name || participant.id}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TokenRenderer family="circle" color={statusColor} size="xs" animated={status === 'TX'} />
                            <NexusBadge tone={operatorStatusTone(status)}>{status}</NexusBadge>
                          </span>
                        </div>
                      </div>);

              })}

                  {pagedParticipants.length === 0 &&
                  <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1 text-[8px] text-zinc-600">None online</div>
                  }
                </div>
                {rosterPageCount > 1 &&
                <div className="px-2 flex items-center justify-between gap-1 text-[8px] text-zinc-500 border-t border-zinc-700/40 py-1">
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.max(0, prev - 1))}
                disabled={rosterPage === 0}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Prev
                    </button>
                    <span className="text-[8px]">{rosterPage + 1}/{rosterPageCount}</span>
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.min(rosterPageCount - 1, prev + 1))}
                disabled={rosterPage >= rosterPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                      Next
                    </button>
                  </div>
            }
              </>
          }

            {selectedTab === 'fleet' &&
          <>
                <div className="px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/30">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Fleet</div>
                    <NexusBadge tone="active">{String(variantId || 'live').toUpperCase()}</NexusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[8px] text-zinc-500 uppercase tracking-wide">
                    <span>OP {String(opId || 'N/A')}</span>
                    <span>Events {Array.isArray(events) ? events.length : 0}</span>
                    <NexusBadge tone={String(connectionState || '').toUpperCase() === 'CONNECTED' ? 'ok' : 'warning'}>
                      {String(connectionState || 'IDLE').toUpperCase()}
                    </NexusBadge>
                  </div>
                </div>

                <div className="px-2 py-1 flex items-center justify-between gap-1 border-b border-zinc-700/40 bg-zinc-900/30">
                  <div className="flex items-center gap-1">
                    <button
                  type="button"
                  onClick={() => setFleetView('schema')}
                  className={`h-6 px-2 text-[8px] uppercase tracking-wider rounded border transition-colors font-bold ${
                  fleetView === 'schema' ? 'text-orange-400 bg-orange-500/10 border-orange-500/40' : 'text-zinc-500 border-zinc-700/40'}`
                  }>
                      S
                    </button>
                    <button
                  type="button"
                  onClick={() => setFleetView('cards')}
                  className={`h-6 px-2 text-[8px] uppercase tracking-wider rounded border transition-colors font-bold ${
                  fleetView === 'cards' ? 'text-orange-400 bg-orange-500/10 border-orange-500/40' : 'text-zinc-500 border-zinc-700/40'}`
                  }>
                      C
                      </button>
                      </div>
                      <span className="text-[8px] text-zinc-500">{fleetChannels.length}L</span>
                </div>

                {fleetView === 'schema' &&
            <>
                    <div className="px-3 py-2 border-b border-red-700/40 bg-black/40">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">Fleet Channels</div>
                    </div>
                    {schemaChannelPageCount > 1 &&
              <div className="px-2 flex items-center justify-between gap-1 text-[9px] text-zinc-500 border-t border-red-700/40 py-1">
                        <button
                  type="button"
                  onClick={() => setFleetSchemaPage((prev) => Math.max(0, prev - 1))}
                  disabled={fleetSchemaPage === 0}
                  className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                          Prev
                        </button>
                        <span className="text-[8px]">{fleetSchemaPage + 1}/{schemaChannelPageCount}</span>
                        <button
                  type="button"
                  onClick={() => setFleetSchemaPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))}
                  disabled={fleetSchemaPage >= schemaChannelPageCount - 1}
                  className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                          Next
                        </button>
                      </div>
              }

                    <div className="px-2 py-1.5 space-y-1.5">
                      {fleetWings.length > 0 ?
                fleetWings.map((wing) =>
                <article key={wing.id} className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-200 uppercase tracking-wide font-semibold">
                              <img src={wingTokenIcon(wing.id, 'ready')} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                              <span className="truncate">{wing.label}</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {(wing.squads || []).map((squad) =>
                    <div key={squad.id} className="rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-1">
                                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-400">
                                    <img src={squadTokenIcon(squad.label, 'ready')} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                                    <span className="truncate">{squad.label}</span>
                                  </div>
                                  <div className="mt-1 space-y-1">
                                    {(squad.channels || []).map((channel) => {
                          const vehicles = Array.isArray(channel.vehicles) ? channel.vehicles : [];
                          const leadVehicle = vehicles[0];
                          const leadOperator = Array.isArray(leadVehicle?.operators) ? leadVehicle.operators[0] : null;
                          return (
                            <div key={channel.id} className="rounded border border-zinc-800/80 bg-zinc-900/35 px-1.5 py-1">
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="min-w-0 inline-flex items-center gap-1 text-[9px] text-zinc-300">
                                              <img src={tokenAssets.comms.channel} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                              <span className="truncate">{channel.label}</span>
                                            </div>
                                            <div className="inline-flex items-center gap-1 shrink-0">
                                              <img src={channelStatusTokenIcon(channel.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                              <span className="text-[8px] text-zinc-500 uppercase tracking-wide">M {Number(channel.membershipCount || 0)}</span>
                                            </div>
                                          </div>
                                          {leadVehicle ?
                              <div className="mt-1 flex items-center justify-between gap-1">
                                              <div className="min-w-0 inline-flex items-center gap-1 text-[8px] text-zinc-400">
                                                <img src={tokenAssets.comms.vehicle} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                                <span className="truncate">{leadVehicle.label}</span>
                                              </div>
                                              <div className="inline-flex items-center gap-1 shrink-0">
                                                <img src={vehicleStatusTokenIcon(leadVehicle.basicStatus)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                                <NexusBadge tone={vehicleStatusTone(leadVehicle.basicStatus)}>{leadVehicle.basicStatus}</NexusBadge>
                                              </div>
                                            </div> :
                              null}
                                          {leadOperator ?
                              <div className="mt-1 flex items-center justify-between gap-1 rounded border border-zinc-800/80 bg-zinc-900/35 px-1 py-0.5">
                                              <div className="min-w-0 inline-flex items-center gap-1 text-[8px] text-zinc-300">
                                                <img src={roleTokenIcon(leadOperator.role)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                                <span className="truncate">{leadOperator.callsign}</span>
                                              </div>
                                              <div className="inline-flex items-center gap-1 shrink-0">
                                                <img src={operatorStatusTokenIcon(leadOperator.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                                                <NexusBadge tone={operatorStatusTone(leadOperator.status)}>{leadOperator.status}</NexusBadge>
                                              </div>
                                            </div> :
                              null}
                                        </div>);

                        })}
                                  </div>
                                </div>
                    )}
                            </div>
                          </article>
                ) :
                <div className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No fleet schema channels available.</div>
                }
                    </div>
                  </>
            }

                {fleetView === 'cards' &&
            <>
                    {compactFleetCardPageCount > 1 &&
              <div className="px-2 flex items-center justify-between gap-1 text-[9px] text-zinc-500 border-t border-red-700/40 py-1">
                        <button
                  type="button"
                  onClick={() => setFleetCardPage((prev) => Math.max(0, prev - 1))}
                  disabled={fleetCardPage === 0}
                  className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                          Prev
                        </button>
                        <span className="text-[8px]">{fleetCardPage + 1}/{compactFleetCardPageCount}</span>
                        <button
                  type="button"
                  onClick={() => setFleetCardPage((prev) => Math.min(compactFleetCardPageCount - 1, prev + 1))}
                  disabled={fleetCardPage >= compactFleetCardPageCount - 1}
                  className="px-1.5 py-0.5 rounded border border-red-700/30 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-700/50 transition-colors text-[8px]">
                          Next
                        </button>
                      </div>
              }

                    <div className="px-2 py-1.5 space-y-1">
                      {compactFleetCards.length > 0 ?
                compactFleetCards.map((card) =>
                <article key={card.id} className="rounded border border-red-700/30 bg-zinc-950/70 px-2 py-1.5">
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
                              </div>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-wide shrink-0">Crew {card.crewCount}</span>
                            </div>
                          </article>
                ) :
                <div className="rounded border border-red-700/30 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No compact fleet cards available.</div>
                }
                    </div>
                  </>
            }
              </>
          }

            {feedback &&
            <div className="flex-shrink-0 px-2 py-1 border-t border-zinc-700/40 bg-zinc-900/30 text-[8px] text-orange-400">
                {feedback}
              </div>
            }
          </div>

          {showNetCreator &&
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <div className="w-full max-w-md bg-zinc-950 border border-zinc-700/40 rounded-lg p-4 m-4 shadow-2xl">
                <VoiceNetCreator
              onSuccess={() => {
                setShowNetCreator(false);
                setFeedback('Voice net created successfully');
              }}
              onCancel={() => setShowNetCreator(false)} />

              </div>
            </div>
        }
          </>
      }
    </div>);

}