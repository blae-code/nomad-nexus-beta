import React, { useState } from 'react';
import { X, Minimize2, Mic, MicOff, Radio, Users, Zap, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export default function VoiceCommsDock({ isOpen, onClose }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const voiceNet = useVoiceNet();

  if (!isOpen) return null;

  const isConnected = voiceNet?.connectionState === VOICE_CONNECTION_STATE.CONNECTED;
  const isReconnecting = voiceNet?.connectionState === VOICE_CONNECTION_STATE.RECONNECTING;
  const participants = voiceNet?.participants || [];
  const activeNetId = voiceNet?.activeNetId;

  return (
    <div className="bg-zinc-950 border-t border-orange-500/30 flex flex-col h-96 flex-shrink-0">
      {/* Header */}
      <div className="border-b border-orange-500/20 px-6 py-3 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 
            isReconnecting ? 'bg-orange-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <h3 className="text-xs font-bold uppercase text-orange-400 tracking-widest">Voice Comms</h3>
          {activeNetId && <span className="text-[10px] text-zinc-500 ml-2">NET ACTIVE</span>}
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-zinc-500 hover:text-orange-400"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Connection Status */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Status</h4>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">Connection</span>
                <span className={`text-xs font-mono ${
                  isConnected ? 'text-green-400' : 
                  isReconnecting ? 'text-orange-400' : 
                  'text-red-400'
                }`}>
                  {isConnected ? 'CONNECTED' : isReconnecting ? 'RECONNECTING' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">Participants</span>
                <span className="text-xs font-mono text-orange-400">{participants.length}</span>
              </div>
            </div>
          </div>

          {/* Voice Controls */}
          {activeNetId && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Controls</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={voiceNet?.isMicEnabled ? 'default' : 'secondary'}
                  onClick={() => voiceNet?.setMicEnabled?.(!voiceNet.isMicEnabled)}
                  className="flex-1 gap-2 text-xs"
                >
                  {voiceNet?.isMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  {voiceNet?.isMicEnabled ? 'Mic On' : 'Mic Off'}
                </Button>
                <Button
                  size="sm"
                  variant={voiceNet?.isPTTActive ? 'default' : 'secondary'}
                  onClick={() => voiceNet?.setPTTActive?.(!voiceNet.isPTTActive)}
                  className="flex-1 gap-2 text-xs"
                >
                  <Radio className="w-3 h-3" />
                  {voiceNet?.isPTTActive ? 'PTT On' : 'PTT Off'}
                </Button>
              </div>
            </div>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Participants</h4>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg max-h-32 overflow-y-auto">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 last:border-b-0 text-sm"
                  >
                    <span className="text-zinc-300">{participant.name || 'User'}</span>
                    <div className="flex items-center gap-1">
                      {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                      {participant.isSpeaking && <Volume2 className="w-3 h-3 text-green-400 animate-pulse" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!activeNetId && (
            <div className="text-center py-8 text-zinc-500">
              <Radio className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No active voice net</p>
              <p className="text-[10px] text-zinc-600 mt-1">Join a voice net to start comms</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}