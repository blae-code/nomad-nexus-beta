import React from 'react';
import { Mic, MicOff, Volume2, Radio } from 'lucide-react';

export default function VoiceParticipantIndicator({ 
  participant, 
  isSpeaking = false, 
  isMuted = false, 
  isPTTActive = false 
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded transition-all ${
      isSpeaking 
        ? 'bg-green-500/20 border border-green-500/50' 
        : 'bg-zinc-800/50 border border-zinc-700'
    }`}>
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="relative">
          <Radio className="w-4 h-4 text-green-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
        </div>
      )}

      {/* Callsign */}
      <span className={`text-xs font-semibold flex-1 ${
        isSpeaking ? 'text-green-300' : 'text-zinc-300'
      }`}>
        {participant.callsign}
      </span>

      {/* PTT Active indicator */}
      {isPTTActive && !isMuted && (
        <div className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/50 rounded text-[9px] text-orange-300 font-bold uppercase">
          PTT
        </div>
      )}

      {/* Mute status */}
      {isMuted ? (
        <MicOff className="w-3 h-3 text-red-400" />
      ) : (
        <Mic className="w-3 h-3 text-zinc-500" />
      )}
    </div>
  );
}