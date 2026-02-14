import React from 'react';
import { Radio, X, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function VoiceNetWidget({ widgetId, config, onRemove, isDragging }) {
  const { user } = useAuth();
  const {
    activeNetId,
    transmitNetId,
    voiceNets,
    connectionState,
    participants,
    micEnabled,
    pttActive,
    joinNet,
    leaveNet,
    setMicEnabled,
  } = useVoiceNet();

  const activeNet = voiceNets.find((n) => n.id === activeNetId || n.code === activeNetId);

  const handleJoinNet = async (netId) => {
    if (!user) return;
    await joinNet(netId, user);
  };

  const handleLeaveNet = async () => {
    await leaveNet();
  };

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Voice Net</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeNet ? (
          <>
            <div className="bg-zinc-800/50 rounded p-3 border border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-orange-400">{activeNet.label}</div>
                  <div className="text-xs text-zinc-500">{activeNet.code}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${connectionState === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="text-xs text-zinc-400">{participants.length} active</div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={micEnabled ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setMicEnabled(!micEnabled)}
              >
                {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                {micEnabled ? 'Muted' : 'Unmuted'}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleLeaveNet}>
                Leave
              </Button>
            </div>

            <div className="space-y-1">
              {participants.slice(0, 5).map((p) => (
                <div key={p.userId} className="flex items-center gap-2 text-xs text-zinc-400">
                  <Volume2 className={`w-3 h-3 ${p.isSpeaking ? 'text-green-500' : 'text-zinc-600'}`} />
                  <span>{p.callsign}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-zinc-500 mb-2">Available Nets</div>
            {voiceNets.slice(0, 4).map((net) => (
              <Button
                key={net.id}
                size="sm"
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handleJoinNet(net.id)}
              >
                <span className="text-xs">{net.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}