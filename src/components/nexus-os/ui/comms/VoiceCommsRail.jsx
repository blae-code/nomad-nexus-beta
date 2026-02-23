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
import { ChevronDown } from 'lucide-react';

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
  registeredUsers = [],
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
  onHailUser,
  onInviteToVoice,
  onSendMessage,
  onViewProfile,
  onCreateGroup,
  focusMode = ''
}) {
  const [rosterExpanded, setRosterExpanded] = useState(true);
  const [fleetExpanded, setFleetExpanded] = useState(true);
  const [fleetView, setFleetView] = useState('schema');
  const [rosterPage, setRosterPage] = useState(0);
  const [fleetSchemaPage, setFleetSchemaPage] = useState(0);
  const [fleetCardPage, setFleetCardPage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showNetCreator, setShowNetCreator] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());

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
  const displayUsers = registeredUsers.length > 0 ? registeredUsers : participants;
  const userMap = useMemo(() => {
    const map = new Map();
    participants.forEach((p) => {
      const key = String(p.id || p.userId || p.callsign || '').trim();
      if (key) map.set(key, p);
    });
    return map;
  }, [participants]);

  const rosterPageCount = Math.max(1, Math.ceil(displayUsers.length / PAGE_SIZE));
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

  const pagedParticipants = useMemo(
    () => displayUsers.slice(rosterPage * PAGE_SIZE, rosterPage * PAGE_SIZE + PAGE_SIZE),
    [displayUsers, rosterPage]
  );

  const getRosterItemStatus = (user) => {
    const activeParticipant = userMap.get(String(user.id || user.userId || user.email || '').trim());
    if (!activeParticipant) return 'OFFLINE';
    return participantStatusLabel(activeParticipant);
  };

  const handleRosterRightClick = (e, user) => {
    e.preventDefault();
    const userId = String(user.id || user.userId || user.email || '').trim();
    setContextMenu({ x: e.clientX, y: e.clientY, userId, userName: user.full_name || user.name || user.email || 'User' });
  };

  const closeContextMenu = () => setContextMenu(null);

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
          <div className="flex-shrink-0 px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 flex items-center justify-between gap-2 nexus-top-rail">
             <div className="flex items-center gap-1.5 min-w-0">
               <Radio className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em]">Controls</h3>
             </div>
          </div>

          <div className="flex-shrink-0 px-2.5 py-2 bg-zinc-950/60 border-b border-zinc-700/40">
            {renderGlobalControlCluster()}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Fleet Section */}
            <div className="flex-shrink-0 border-b border-zinc-700/40 bg-zinc-900/40">
              <button
              type="button"
              onClick={() => setFleetExpanded(!fleetExpanded)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold hover:bg-zinc-900/50 transition-colors nexus-top-rail">

                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${fleetExpanded ? 'rotate-180' : ''}`} />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em] truncate">Fleet</h3>
                </div>
                
              </button>
            </div>

            {rosterExpanded &&
          <>
                 <div className="flex-shrink-0 px-2 py-1.5 border-b border-zinc-700/40 bg-zinc-900/30">
                   <div className="flex items-center justify-between gap-2">
                     <span className="text-[9px] font-semibold text-zinc-200 inline-flex items-center gap-1">
                       <TokenRenderer family="square" color="cyan" size="xs" />
                       You
                     </span>
                     <select
                     onChange={(e) => setFeedback(`Status: ${e.target.value}`)}
                     defaultValue="ON-NET"
                     className="h-6 px-2 text-[9px] rounded border border-orange-500/40 bg-zinc-900/80 text-white font-semibold uppercase cursor-pointer hover:border-orange-500/60 hover:bg-zinc-900 transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500/50">

                       <option style={{background: '#18181b', color: '#f5f5f5'}} value="READY">Ready</option>
                       <option style={{background: '#18181b', color: '#f5f5f5'}} value="ON-NET">On Net</option>
                       <option style={{background: '#18181b', color: '#f5f5f5'}} value="ENGAGED">Engaged</option>
                       <option style={{background: '#18181b', color: '#f5f5f5'}} value="MUTED">Muted</option>
                       <option style={{background: '#18181b', color: '#f5f5f5'}} value="OFFLINE">Offline</option>
                     </select>
                   </div>
                 </div>

                 <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-1" onClick={closeContextMenu}>
                   {pagedParticipants.map((user) => {
                const userId = String(user.id || user.userId || user.email || '').trim();
                const isSelected = selectedUsers.has(userId);
                const status = getRosterItemStatus(user);
                const statusColor = status === 'TX' ? 'orange' : status === 'ON-NET' ? 'green' : status === 'MUTED' ? 'grey' : 'red';
                return (
                  <div
                    key={userId}
                    onContextMenu={(e) => handleRosterRightClick(e, user)}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        const newSet = new Set(selectedUsers);
                        isSelected ? newSet.delete(userId) : newSet.add(userId);
                        setSelectedUsers(newSet);
                      } else {
                        setSelectedUsers(new Set([userId]));
                      }
                    }}
                    className={`px-2 py-1 rounded border cursor-pointer transition-colors ${
                    isSelected ? 'bg-orange-500/15 border-orange-500/40' : 'bg-zinc-900/40 border-zinc-700/40 hover:border-zinc-600/60'}`
                    }>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-semibold text-zinc-200 truncate inline-flex items-center gap-1">
                            <TokenRenderer family="square" color={status === 'OFFLINE' ? 'grey' : 'cyan'} size="xs" />
                            {user.full_name || user.name || user.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TokenRenderer family="circle" color={statusColor} size="xs" animated={status === 'TX'} />
                            <NexusBadge tone={status === 'OFFLINE' ? 'neutral' : operatorStatusTone(status)}>{status}</NexusBadge>
                          </span>
                        </div>
                      </div>);

              })}

                  {pagedParticipants.length === 0 &&
              <div className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1 text-[8px] text-zinc-400">No users registered</div>
              }
                </div>

                {contextMenu &&
            <div
              className="fixed z-[1000] bg-zinc-900 border border-zinc-700/60 rounded shadow-lg py-1"
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
                  <button
                type="button"
                onClick={() => {onHailUser?.(contextMenu.userId);closeContextMenu();}}
                className="w-full px-3 py-1.5 text-[9px] text-left text-zinc-300 hover:bg-orange-500/20 hover:text-orange-300 transition-colors">
                    Hail
                  </button>
                  <button
                type="button"
                onClick={() => {onInviteToVoice?.(contextMenu.userId);closeContextMenu();}}
                className="w-full px-3 py-1.5 text-[9px] text-left text-zinc-300 hover:bg-orange-500/20 hover:text-orange-300 transition-colors">
                    Invite to Channel
                  </button>
                  <button
                type="button"
                onClick={() => {onSendMessage?.(contextMenu.userId);closeContextMenu();}}
                className="w-full px-3 py-1.5 text-[9px] text-left text-zinc-300 hover:bg-orange-500/20 hover:text-orange-300 transition-colors">
                    Send Message
                  </button>
                  <button
                type="button"
                onClick={() => {onViewProfile?.(contextMenu.userId);closeContextMenu();}}
                className="w-full px-3 py-1.5 text-[9px] text-left text-zinc-300 hover:bg-orange-500/20 hover:text-orange-300 transition-colors">
                    View Profile
                  </button>
                  <div className="border-t border-zinc-700/40 my-1" />
                  <button
                type="button"
                onClick={() => {onCreateGroup?.(Array.from(selectedUsers));closeContextMenu();}}
                className="w-full px-3 py-1.5 text-[9px] text-left text-zinc-300 hover:bg-green-500/20 hover:text-green-300 transition-colors">
                    Create Squad ({selectedUsers.size})
                  </button>
                </div>
            }
                {rosterPageCount > 1 &&
            <div className="px-2 flex items-center justify-between gap-1 text-[8px] text-zinc-500 border-t border-zinc-700/40 py-1">
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.max(0, prev - 1))}
                disabled={rosterPage === 0}
                className="px-1.5 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600/40 transition-colors">
                      Prev
                    </button>
                    <span>{rosterPage + 1}/{rosterPageCount}</span>
                    <button
                type="button"
                onClick={() => setRosterPage((prev) => Math.min(rosterPageCount - 1, prev + 1))}
                disabled={rosterPage >= rosterPageCount - 1}
                className="px-1.5 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600/40 transition-colors">
                      Next
                    </button>
                  </div>
            }
              </>
          }

            {/* Roster Section */}
            <div className="flex-shrink-0 border-b border-zinc-700/40 bg-zinc-900/40">
              <button
              type="button"
              onClick={() => setRosterExpanded(!rosterExpanded)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold hover:bg-zinc-900/50 transition-colors nexus-top-rail">

                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${rosterExpanded ? 'rotate-180' : ''}`} />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em] truncate">Roster</h3>
                </div>
              </button>
            </div>

            {fleetExpanded &&
          <>
                 <div className="flex-shrink-0 px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 flex items-center justify-between gap-2 nexus-top-rail">
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-300">Schema</span>
                   </div>
                   <span className="text-[9px] text-zinc-400 uppercase tracking-wide">{fleetChannels.length}L</span>
                  </div>

                {fleetView === 'schema' &&
            <>
                    {schemaChannelPageCount > 1 &&
              <div className="px-2 flex items-center justify-between gap-1 text-[8px] text-zinc-500 border-b border-zinc-700/40 py-1">
                        <button
                  type="button"
                  onClick={() => setFleetSchemaPage((prev) => Math.max(0, prev - 1))}
                  disabled={fleetSchemaPage === 0}
                  className="px-1.5 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600/40 transition-colors">
                          Prev
                        </button>
                        <span>{fleetSchemaPage + 1}/{schemaChannelPageCount}</span>
                        <button
                  type="button"
                  onClick={() => setFleetSchemaPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))}
                  disabled={fleetSchemaPage >= schemaChannelPageCount - 1}
                  className="px-1.5 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/40 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-600/40 transition-colors">
                          Next
                        </button>
                      </div>
              }

                    <div className="px-2 py-1.5 space-y-1.5">
                      {fleetWings.length > 0 ?
                fleetWings.map((wing) =>
                <article key={wing.id} className="rounded border border-zinc-700/40 bg-zinc-900/40 px-2 py-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-100 uppercase tracking-wide font-semibold">
                              <img src={wingTokenIcon(wing.id, 'ready')} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/65" />
                              <span className="truncate">{wing.label}</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {(wing.squads || []).map((squad) =>
                    <div key={squad.id} className="rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-1">
                                  <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-300">
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
                                            <div className="min-w-0 inline-flex items-center gap-1 text-[9px] text-zinc-100">
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
                                              <div className="min-w-0 inline-flex items-center gap-1 text-[8px] text-zinc-300">
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
                <div className="rounded border border-zinc-700/40 bg-zinc-950/60 px-2 py-1.5 text-[9px] text-zinc-500">No fleet schema channels available.</div>
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