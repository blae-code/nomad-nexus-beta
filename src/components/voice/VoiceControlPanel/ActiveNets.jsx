import React, { useMemo, useState } from 'react';
import { Lock, Radio, Users, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';

const norm = (value) => String(value || '').trim().toLowerCase();

export default function ActiveNets() {
  const voiceNet = useVoiceNet();
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const [busyNetId, setBusyNetId] = useState(null);

  const grouped = useMemo(() => {
    const nets = Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : [];
    return {
      focused: nets.filter((n) => norm(n.discipline || n.type) === 'focused'),
      casual: nets.filter((n) => norm(n.discipline || n.type) !== 'focused'),
    };
  }, [voiceNet.voiceNets]);

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

  if (!voiceNet.voiceNets || voiceNet.voiceNets.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-zinc-500 text-xs">
        <Radio className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p>No voice nets available</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3 animate-in fade-in duration-200">
      {voiceNet.transmitNetId && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-md space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-orange-300">Transmit Bus</div>
          <div className="text-xs text-zinc-200 font-mono">{voiceNet.transmitNetId}</div>
          <div className="text-[10px] text-zinc-500">
            Monitoring {voiceNet.monitoredNetIds?.length || 0} net{(voiceNet.monitoredNetIds?.length || 0) === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {['focused', 'casual'].map((bucket) => (
        <div key={bucket} className="space-y-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${bucket === 'focused' ? 'text-orange-400' : 'text-zinc-400'}`}>
            {bucket}
          </h3>
          <div className="space-y-2">
            {grouped[bucket].map((net) => {
              const canJoin = canJoinVoiceNet(user, net);
              const isMonitored = (voiceNet.monitoredNetIds || []).includes(net.id) || (voiceNet.monitoredNetIds || []).includes(net.code);
              const isTransmit = voiceNet.transmitNetId === net.id || voiceNet.transmitNetId === net.code;
              const isBusy = busyNetId === net.id;
              const participantCount = (voiceNet.participantsByNet?.[net.id] || []).length;

              return (
                <div key={net.id} className={`p-2.5 rounded border ${isTransmit ? 'bg-orange-500/10 border-orange-500/30' : 'bg-zinc-800/40 border-zinc-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`font-mono text-sm font-semibold truncate ${isTransmit ? 'text-orange-300' : 'text-zinc-200'}`}>
                        {net.name || net.label || net.code}
                      </span>
                      {!canJoin && <Lock className="w-3 h-3 text-zinc-500" />}
                      {isMonitored && <Headphones className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {participantCount}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant={isTransmit ? 'default' : 'outline'}
                      className="text-[10px]"
                      disabled={!canJoin || isBusy || isTransmit}
                      onClick={() => joinAsPrimary(net)}
                    >
                      {isTransmit ? 'TX' : 'Join'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px]"
                      disabled={!canJoin || isBusy || isMonitored}
                      onClick={() => monitorOnly(net)}
                    >
                      Monitor
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px]"
                      disabled={!canJoin || isBusy || !isMonitored || isTransmit}
                      onClick={() => switchTx(net)}
                    >
                      TX Bus
                    </Button>
                  </div>

                  {isMonitored && !isTransmit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1.5 w-full text-[10px] text-zinc-400"
                      onClick={() => voiceNet.unmonitorNet?.(net.id || net.code)}
                    >
                      Stop Monitoring
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
