import React, { useEffect, useMemo, useState } from 'react';
import { Radio, ChevronRight, ChevronLeft, Settings, Mic, Users, Volume2 } from 'lucide-react';

const PAGE_SIZE = 6;

/**
 * VoiceCommsRail — Voice comms control panel for NexusOS.
 * Uses capped lists with pagination to avoid panel scrolling.
 */
export default function VoiceCommsRail({ voiceNets = [], activeNetId, participants = [], isExpanded = true, onToggleExpand }) {
  const [selectedTab, setSelectedTab] = useState('nets');
  const [netsPage, setNetsPage] = useState(0);
  const [rosterPage, setRosterPage] = useState(0);

  const activeNet = useMemo(
    () => voiceNets.find((entry) => entry.id === activeNetId) || voiceNets[0] || null,
    [voiceNets, activeNetId]
  );

  const netsPageCount = Math.max(1, Math.ceil(voiceNets.length / PAGE_SIZE));
  const rosterPageCount = Math.max(1, Math.ceil(participants.length / PAGE_SIZE));

  useEffect(() => {
    setNetsPage((prev) => Math.min(prev, netsPageCount - 1));
  }, [netsPageCount]);

  useEffect(() => {
    setRosterPage((prev) => Math.min(prev, rosterPageCount - 1));
  }, [rosterPageCount]);

  const pagedNets = useMemo(
    () => voiceNets.slice(netsPage * PAGE_SIZE, netsPage * PAGE_SIZE + PAGE_SIZE),
    [voiceNets, netsPage]
  );

  const pagedParticipants = useMemo(
    () => participants.slice(rosterPage * PAGE_SIZE, rosterPage * PAGE_SIZE + PAGE_SIZE),
    [participants, rosterPage]
  );

  return (
    <div className={`nx-voice-rail flex flex-col h-full bg-zinc-950/80 border-r border-zinc-700/40 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'w-full' : 'w-12'}`}>
      <div className="px-6 py-3 nx-voice-header border-b border-zinc-700/40">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Voice Comms</h3>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="text-zinc-500 hover:text-green-500 transition-colors">
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

          <div className="mx-2 px-1 py-2 flex-1 min-h-0 overflow-hidden space-y-2">
            {selectedTab === 'nets' ? (
              <>
                {activeNet ? (
                  <div className="px-3 py-2.5 rounded border border-green-500/30 bg-green-500/10">
                    <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Active Net</div>
                    <div className="text-sm font-bold text-green-300 mt-1">{activeNet.code || activeNet.id}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{activeNet.label || 'Voice lane active'}</div>
                    <div className="flex gap-1 mt-2">
                      <button type="button" className="flex-1 h-7 text-[10px] px-2 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 transition-colors flex items-center justify-center gap-1">
                        <Mic className="w-3 h-3" />
                        Mute
                      </button>
                      <button type="button" className="flex-1 h-7 text-[10px] px-2 rounded bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-400 transition-colors flex items-center justify-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        Vol
                      </button>
                    </div>
                  </div>
                ) : null}

                {voiceNets.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2">Available</div>
                    {pagedNets.map((net) => (
                      <button
                        key={net.id}
                        type="button"
                        className={`w-full text-left px-2.5 py-2 rounded transition-colors text-[10px] ${
                          activeNet?.id === net.id ? 'bg-green-500/20 border border-green-500/30 text-green-300' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="font-bold uppercase tracking-wider">{net.code || net.id}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{net.label || 'Voice lane'}</div>
                      </button>
                    ))}

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
                      <div key={participant.id} className="px-2.5 py-1.5 rounded bg-zinc-900/40 border border-zinc-800 hover:border-green-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-300">{participant.callsign || participant.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-zinc-500 uppercase">{participant.state || 'READY'}</span>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
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
          </div>
        </>
      ) : null}
    </div>
  );
}
