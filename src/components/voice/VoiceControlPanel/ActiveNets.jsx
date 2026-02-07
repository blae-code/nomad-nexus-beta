import React, { useState } from 'react';
import { Lock, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export default function ActiveNets() {
  const voiceNet = useVoiceNet();
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const [joiningNetId, setJoiningNetId] = useState(null);

  const groupedNets = {
    casual: voiceNet.voiceNets.filter((n) => n.discipline === 'casual'),
    focused: voiceNet.voiceNets.filter((n) => n.discipline === 'focused'),
    temporary: voiceNet.voiceNets.filter((n) => n.type === 'temporary'),
  };

  const handleJoinNet = async (net) => {
    if (!canJoinVoiceNet(user, net)) return;
    
    setJoiningNetId(net.id);
    try {
      await voiceNet.joinNet(net.id, user);
    } finally {
      setJoiningNetId(null);
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
      {/* Currently Connected */}
      {voiceNet.activeNetId && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Active</h3>
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-zinc-200 font-semibold">
                  {voiceNet.voiceNets.find((n) => n.id === voiceNet.activeNetId)?.name || 'Unknown'}
                </span>
              </div>
              <span className="text-xs text-green-400 font-semibold">CONNECTED</span>
            </div>
            <div className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
              <Users className="w-3 h-3" />
              <span>{voiceNet.participants?.length || 0} participant{(voiceNet.participants?.length || 0) !== 1 ? 's' : ''}</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="w-full text-xs"
              onClick={() => voiceNet.leaveNet()}
            >
              Leave Net
            </Button>
          </div>
        </div>
      )}

      {/* Casual Nets */}
      {groupedNets.casual.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Casual</h3>
          <div className="space-y-2">
            {groupedNets.casual.map((net) => {
              const canJoin = canJoinVoiceNet(user, net);
              const isJoining = joiningNetId === net.id;
              const isConnected = voiceNet.activeNetId === net.id || voiceNet.activeNetId === net.code;

              return (
                <div key={net.id} className="p-2.5 bg-zinc-800/40 rounded border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-sm text-zinc-200 font-semibold">{net.name || net.label || net.code}</span>
                      {!canJoin && <Lock className="w-3 h-3 text-zinc-500" />}
                    </div>
                    {net.participants && (
                      <span className="text-xs text-zinc-500 font-mono">{net.participants}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!canJoin || isJoining || isConnected}
                    onClick={() => handleJoinNet(net)}
                    title={!canJoin ? 'Insufficient membership' : isConnected ? 'Already connected' : ''}
                  >
                    {isJoining ? 'Joining...' : isConnected ? 'Connected' : canJoin ? 'Join' : 'Locked'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Focused Nets */}
      {groupedNets.focused.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Focused</h3>
          <div className="space-y-2">
            {groupedNets.focused.map((net) => {
              const canJoin = canJoinVoiceNet(user, net);
              const isJoining = joiningNetId === net.id;
              const isConnected = voiceNet.activeNetId === net.id || voiceNet.activeNetId === net.code;

              return (
                <div key={net.id} className={`p-2.5 rounded border ${
                  isConnected 
                    ? 'bg-orange-500/10 border-orange-500/30' 
                    : 'bg-zinc-800/40 border-zinc-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`font-mono text-sm font-semibold ${
                        isConnected ? 'text-orange-300' : 'text-zinc-200'
                      }`}>{net.name || net.label || net.code}</span>
                      {!canJoin && <Lock className="w-3 h-3 text-zinc-500" />}
                    </div>
                    {net.participants && (
                      <span className={`text-xs font-mono ${isConnected ? 'text-orange-400' : 'text-zinc-500'}`}>
                        {net.participants}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isConnected ? 'default' : 'outline'}
                    className="w-full text-xs"
                    disabled={!canJoin || isJoining || isConnected}
                    onClick={() => handleJoinNet(net)}
                    title={!canJoin ? 'Insufficient membership' : isConnected ? 'Already connected' : 'Requires discipline'}
                  >
                    {isJoining ? 'Joining...' : isConnected ? 'Connected' : canJoin ? 'Join' : 'Locked'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
