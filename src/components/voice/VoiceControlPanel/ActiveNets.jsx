import React, { useMemo, useState } from 'react';
import { Lock, Radio, Users, Headphones, ChevronRight, ChevronDown, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';

const norm = (value) => String(value || '').trim().toLowerCase();

export default function ActiveNets() {
  const voiceNet = useVoiceNet();
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const [busyNetId, setBusyNetId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({ focused: true, casual: true });
  const [expandedNets, setExpandedNets] = useState({});

  const grouped = useMemo(() => {
    const nets = Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : [];
    return {
      focused: nets.filter((n) => norm(n.discipline || n.type) === 'focused'),
      casual: nets.filter((n) => norm(n.discipline || n.type) !== 'focused'),
    };
  }, [voiceNet.voiceNets]);

  const allParticipantIds = useMemo(() => {
    const ids = new Set();
    Object.values(voiceNet.participantsByNet || {}).forEach(participants => {
      participants.forEach(p => {
        if (p.userId) ids.add(p.userId);
      });
    });
    return Array.from(ids);
  }, [voiceNet.participantsByNet]);

  const { memberMap } = useMemberProfileMap(allParticipantIds);

  const joinAsPrimary = async (net) => {
    if (!user) return;
    setBusyNetId(net.id);
    try {
      await voiceNet.joinNet(net.id || net.code, user);
    } finally {
      setBusyNetId(null);
    }
  };

  const monitorOnly = async (net) => {
    if (!user) return;
    setBusyNetId(net.id);
    try {
      await voiceNet.monitorNet?.(net.id || net.code, user);
    } finally {
      setBusyNetId(null);
    }
  };

  const switchTx = async (net) => {
    if (!user) return;
    setBusyNetId(net.id);
    try {
      await voiceNet.setTransmitNet?.(net.id || net.code, user);
    } finally {
      setBusyNetId(null);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleNet = (netId) => {
    setExpandedNets(prev => ({ ...prev, [netId]: !prev[netId] }));
  };

  if (!voiceNet.voiceNets || voiceNet.voiceNets.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-zinc-600 text-[10px] font-mono">
        <Radio className="w-4 h-4 mx-auto mb-2 opacity-30" />
        <p>NO NETS AVAILABLE</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono">
      {/* Active Transmit Banner */}
      {voiceNet.transmitNetId && (
        <div className="flex-shrink-0 px-2 py-2 bg-orange-500/10 border-b border-orange-500/30">
          <div className="flex items-center gap-2">
            <Mic className="w-3 h-3 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-orange-300 font-bold truncate">{voiceNet.transmitNetId}</div>
              <div className="text-[9px] text-orange-500/70">TX ACTIVE • {voiceNet.monitoredNetIds?.length || 0} MONITORED</div>
            </div>
          </div>
        </div>
      )}

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto text-[11px]">
        {['focused', 'casual'].map((bucket) => {
          const isExpanded = expandedCategories[bucket];
          const CategoryIcon = isExpanded ? ChevronDown : ChevronRight;
          const categoryNets = grouped[bucket];

          return (
            <div key={bucket} className="border-b border-zinc-800/50">
              {/* Category Folder */}
              <button
                onClick={() => toggleCategory(bucket)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-800/40 transition-colors group"
              >
                <CategoryIcon className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
                <span className={`text-[10px] uppercase tracking-wider font-bold ${bucket === 'focused' ? 'text-orange-400' : 'text-zinc-500'}`}>
                  {bucket}
                </span>
                <span className="text-[9px] text-zinc-700 ml-auto">{categoryNets.length}</span>
              </button>

              {/* Nets in Category */}
              {isExpanded && (
                <div className="pl-3">
                  {categoryNets.map((net) => {
                    const canJoin = canJoinVoiceNet(user, net);
                    const isMonitored = (voiceNet.monitoredNetIds || []).includes(net.id) || (voiceNet.monitoredNetIds || []).includes(net.code);
                    const isTransmit = voiceNet.transmitNetId === net.id || voiceNet.transmitNetId === net.code;
                    const isBusy = busyNetId === net.id;
                    const participants = voiceNet.participantsByNet?.[net.id] || [];
                    const isNetExpanded = expandedNets[net.id];
                    const NetIcon = isNetExpanded && participants.length > 0 ? ChevronDown : ChevronRight;

                    return (
                      <div key={net.id}>
                        {/* Net Row */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800/30 transition-colors group ${isTransmit ? 'bg-orange-500/10' : ''}`}>
                          <button
                            onClick={() => toggleNet(net.id)}
                            disabled={participants.length === 0}
                            className="flex-shrink-0 disabled:opacity-40"
                          >
                            <NetIcon className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500" />
                          </button>

                          {/* Net Icon & Name */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <Radio className={`w-3 h-3 flex-shrink-0 ${isTransmit ? 'text-orange-400' : isMonitored ? 'text-cyan-400' : 'text-zinc-600'}`} />
                            <span className={`truncate ${isTransmit ? 'text-orange-300 font-bold' : 'text-zinc-300'}`}>
                              {net.name || net.label || net.code}
                            </span>
                          </div>

                          {/* Status Icons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!canJoin && <Lock className="w-3 h-3 text-zinc-700" />}
                            {isMonitored && !isTransmit && <Headphones className="w-3 h-3 text-cyan-500" />}
                            {participants.length > 0 && (
                              <span className="text-[9px] text-zinc-600">{participants.length}</span>
                            )}
                          </div>
                        </div>

                        {/* Participants List */}
                        {isNetExpanded && participants.length > 0 && (
                          <div className="pl-6 bg-zinc-900/40">
                            {participants.map((participant) => {
                              const profile = memberMap[participant.userId];
                              const displayName = profile?.callsign || participant.callsign || 'Unknown';
                              const isSpeaking = participant.isSpeaking;

                              return (
                                <div
                                  key={participant.userId || participant.clientId}
                                  className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800/30"
                                >
                                  <Users className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                                  <span className={`text-[10px] truncate flex-1 ${isSpeaking ? 'text-green-400 font-bold' : 'text-zinc-500'}`}>
                                    {displayName}
                                  </span>
                                  {isSpeaking ? (
                                    <Volume2 className="w-3 h-3 text-green-400 animate-pulse flex-shrink-0" />
                                  ) : (
                                    <MicOff className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Quick Actions (on hover or when active) */}
                        {(isMonitored || isTransmit) && (
                          <div className="pl-6 pb-1">
                            <div className="flex gap-1">
                              {!isTransmit && (
                                <button
                                  onClick={() => switchTx(net)}
                                  disabled={isBusy}
                                  className="text-[9px] px-2 py-0.5 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-orange-400 rounded transition-colors disabled:opacity-40"
                                >
                                  SET TX
                                </button>
                              )}
                              {isMonitored && !isTransmit && (
                                <button
                                  onClick={() => voiceNet.unmonitorNet?.(net.id || net.code)}
                                  disabled={isBusy}
                                  className="text-[9px] px-2 py-0.5 bg-zinc-800/60 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 rounded transition-colors disabled:opacity-40"
                                >
                                  STOP
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Join Actions (if not monitoring) */}
                        {!isMonitored && !isTransmit && canJoin && (
                          <div className="pl-6 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              <button
                                onClick={() => joinAsPrimary(net)}
                                disabled={isBusy}
                                className="text-[9px] px-2 py-0.5 bg-zinc-800/60 hover:bg-orange-900/40 text-zinc-500 hover:text-orange-400 rounded transition-colors disabled:opacity-40"
                              >
                                JOIN
                              </button>
                              <button
                                onClick={() => monitorOnly(net)}
                                disabled={isBusy}
                                className="text-[9px] px-2 py-0.5 bg-zinc-800/60 hover:bg-cyan-900/40 text-zinc-500 hover:text-cyan-400 rounded transition-colors disabled:opacity-40"
                              >
                                MONITOR
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}