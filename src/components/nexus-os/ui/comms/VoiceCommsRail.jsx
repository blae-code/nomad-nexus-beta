import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Radio,
  Settings,
  Signal,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';

const PAGE_SIZE = 5;
const QUICK_NET_PAGE_SIZE = 4;
const DISCIPLINE_MODES = [
  { id: 'OPEN', label: 'Open' },
  { id: 'PTT', label: 'PTT' },
  { id: 'REQUEST_TO_SPEAK', label: 'Req' },
  { id: 'COMMAND_ONLY', label: 'Cmd' },
];

/**
 * VoiceCommsRail — Voice comms control panel for NexusOS.
 * Standard mode keeps the panel calm; Command mode exposes full controls.
 */
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
}) {
  const [displayMode, setDisplayMode] = useState('standard');
  const [selectedTab, setSelectedTab] = useState('nets');
  const [quickPage, setQuickPage] = useState(0);
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);

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

  const quickPageCount = Math.max(1, Math.ceil(quickNets.length / QUICK_NET_PAGE_SIZE));
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

  const quickVisibleNets = useMemo(
    () => quickNets.slice(quickPage * QUICK_NET_PAGE_SIZE, quickPage * QUICK_NET_PAGE_SIZE + QUICK_NET_PAGE_SIZE),
    [quickNets, quickPage]
  );

  const pagedNets = useMemo(
    () => voiceNets.slice(netsPage * PAGE_SIZE, netsPage * PAGE_SIZE + PAGE_SIZE),
    [voiceNets, netsPage]
  );

  const pagedParticipants = useMemo(
    () => participants.slice(rosterPage * PAGE_SIZE, rosterPage * PAGE_SIZE + PAGE_SIZE),
    [participants, rosterPage]
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
      className={`h-7 text-[10px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
        pttActive ? 'bg-orange-500/25 hover:bg-orange-500/35 text-orange-200' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
      }`}
      title="Hold to transmit"
    >
      <Volume2 className="w-3 h-3" />
      {pttActive ? 'TX' : 'PTT'}
    </button>
  );

  const renderQuickNetCard = (net) => {
    const id = netIdentity(net);
    const isActive = activeNet && netIdentity(activeNet) === id;
    const isTransmit = String(transmitNetId || '') === id;
    const isMonitored = isMonitoredNet(id);

    return (
      <div
        key={id}
        className={`w-full px-2.5 py-2 rounded border text-[10px] ${
          isActive ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
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
                className="flex-1 h-6 rounded border border-zinc-700 text-[9px] hover:border-green-500/40"
              >
                TX
              </button>
              <button
                type="button"
                onClick={() => onLeaveNet?.(id)}
                className="flex-1 h-6 rounded border border-zinc-700 text-[9px] hover:border-red-500/40"
              >
                Leave
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onJoinNet?.(id)}
                className="flex-1 h-6 rounded border border-zinc-700 text-[9px] hover:border-green-500/40"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => onMonitorNet?.(id)}
                className="flex-1 h-6 rounded border border-zinc-700 text-[9px] hover:border-blue-500/40"
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
    <div className={`nx-voice-rail flex flex-col h-full bg-zinc-950/80 border-r border-zinc-700/40 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'w-full' : 'w-12'}`}>
      <div className="px-3 py-3 nx-voice-header border-b border-zinc-700/40">
        <div className="flex items-center justify-between gap-2">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider truncate">Voice Comms</h3>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${connectionTone}`}>{connectionState}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode('standard')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${displayMode === 'standard' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('command')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${displayMode === 'command' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                >
                  Command
                </button>
                <button type="button" className="text-zinc-500 hover:text-green-500 transition-colors" title="Voice settings">
                  <Settings className="w-4 h-4" />
                </button>
                <button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-green-500 transition-colors" title="Collapse">
                  <ChevronRight className="w-4 h-4" />
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
        <div className="mx-2 px-1 py-2 flex-1 min-h-0 overflow-hidden space-y-2">
          {displayMode === 'standard' ? (
            <>
              {activeNet ? (
                <div className="px-3 py-2.5 rounded border border-green-500/30 bg-green-500/10">
                  <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Active Net</div>
                  <div className="text-sm font-bold text-green-300 mt-1 truncate">{activeNet.code || activeNet.id || activeNet.name}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{activeNet.label || 'Voice lane active'}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <span className={`px-1.5 py-0.5 rounded border ${String(transmitNetId || '') === netIdentity(activeNet) ? 'border-green-500/40 text-green-300 bg-green-500/20' : 'border-zinc-700 text-zinc-500'}`}>TX</span>
                    <span className={`px-1.5 py-0.5 rounded border ${isMonitoredNet(netIdentity(activeNet)) ? 'border-blue-500/40 text-blue-300 bg-blue-500/20' : 'border-zinc-700 text-zinc-500'}`}>MON</span>
                    <span className="text-zinc-500">{participants.length} online</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => onSetMicEnabled?.(!micEnabled)}
                      className={`h-7 text-[10px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
                        micEnabled ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
                      }`}
                    >
                      {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                      {micEnabled ? 'Mic' : 'Muted'}
                    </button>
                    {renderPTTButton()}
                    <button
                      type="button"
                      onClick={() => onRequestToSpeak?.()}
                      className="h-7 text-[10px] px-2 rounded border border-zinc-700 text-zinc-400 hover:border-orange-500/40 transition-colors flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Request
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">Voice Lanes</div>
                {quickVisibleNets.length > 0 ? quickVisibleNets.map(renderQuickNetCard) : (
                  <div className="text-[10px] text-zinc-600 text-center py-4">No voice nets available</div>
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
              <div className="flex border-b border-zinc-700/40 bg-zinc-900/40">
                <button
                  type="button"
                  onClick={() => setSelectedTab('nets')}
                  className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    selectedTab === 'nets' ? 'text-green-400 border-green-500 bg-zinc-900/60' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <Radio className="w-3 h-3 inline mr-1" />
                  Nets
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('roster')}
                  className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    selectedTab === 'roster' ? 'text-green-400 border-green-500 bg-zinc-900/60' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  <Users className="w-3 h-3 inline mr-1" />
                  Roster
                </button>
              </div>

              {selectedTab === 'nets' ? (
                <>
                  {activeNet ? (
                    <div className="px-3 py-2.5 rounded border border-green-500/30 bg-green-500/10">
                      <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Active Net</div>
                      <div className="text-sm font-bold text-green-300 mt-1">{activeNet.code || activeNet.id || activeNet.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{activeNet.label || 'Voice lane active'}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                        <span className={`px-1.5 py-0.5 rounded border ${String(transmitNetId || '') === netIdentity(activeNet) ? 'border-green-500/40 text-green-300 bg-green-500/20' : 'border-zinc-700 text-zinc-500'}`}>TX</span>
                        <span className={`px-1.5 py-0.5 rounded border ${isMonitoredNet(netIdentity(activeNet)) ? 'border-blue-500/40 text-blue-300 bg-blue-500/20' : 'border-zinc-700 text-zinc-500'}`}>MON</span>
                        <span className="text-zinc-500">{participants.length} online</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => onSetMicEnabled?.(!micEnabled)}
                          className={`flex-1 h-7 text-[10px] px-2 rounded transition-colors flex items-center justify-center gap-1 ${
                            micEnabled ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' : 'bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400'
                          }`}
                        >
                          {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                          {micEnabled ? 'Mic' : 'Muted'}
                        </button>
                        {renderPTTButton()}
                      </div>
                      <div className="grid grid-cols-4 gap-1 mt-2">
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
                      <div className="flex gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => onSetTransmitNet?.(netIdentity(activeNet))}
                          className={`flex-1 h-6 text-[9px] px-2 rounded border transition-colors ${
                            String(transmitNetId || '') === netIdentity(activeNet)
                              ? 'border-green-500/40 text-green-300 bg-green-500/20'
                              : 'border-zinc-700 text-zinc-400 hover:border-green-500/40'
                          }`}
                        >
                          <Signal className="w-3 h-3 inline mr-1" />
                          TX
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestToSpeak?.()}
                          className="flex-1 h-6 text-[9px] px-2 rounded border border-zinc-700 text-zinc-400 hover:border-orange-500/40 transition-colors"
                        >
                          <Zap className="w-3 h-3 inline mr-1" />
                          Request
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {voiceNets.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">Available</div>
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
                    <div className="text-[10px] text-zinc-600 text-center py-4">No voice nets available</div>
                  )}
                </>
              ) : (
                <>
                  {participants.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">Participants ({participants.length})</div>
                      {pagedParticipants.map((participant) => (
                        <div key={participant.id || participant.userId || participant.clientId || participant.callsign} className="px-2.5 py-1.5 rounded bg-zinc-900/40 border border-zinc-800 hover:border-green-500/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-300 truncate">{participant.callsign || participant.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-zinc-500 uppercase">{participant.isSpeaking ? 'TALK' : participant.state || 'READY'}</span>
                              <div className={`w-2 h-2 rounded-full ${participant.isSpeaking ? 'bg-orange-500' : 'bg-green-500'}`} />
                            </div>
                          </div>
                        </div>
                      ))}

                      {rosterPageCount > 1 ? (
                        <div className="flex items-center justify-end gap-2 pt-0.5 text-[9px] text-zinc-500">
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
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600 text-center py-4">No participants</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
