import React from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';
import { getRankLabel } from '@/components/constants/labels';

export default function VoiceParticipantIndicator({ 
  participant, 
  isSpeaking = false, 
  isMuted = false, 
  isPTTActive = false 
}) {
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded transition-all ${
      isSpeaking 
        ? 'bg-green-500/20 border border-green-500/50 shadow-lg shadow-green-500/10' 
        : 'bg-zinc-800/50 border border-zinc-700'
    }`}>
      {/* Speaking indicator with pulse animation */}
      {isSpeaking && (
        <div className="relative flex-shrink-0">
          <Radio className="w-4 h-4 text-green-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
        </div>
      )}

      {/* Participant Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold font-mono truncate ${
          isSpeaking ? 'text-green-300' : 'text-zinc-200'
        }`}>
          {participant.callsign || 'Unknown'}
        </div>
        {participant.rank && (
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {getRankLabel(participant.rank)}
          </div>
        )}
      </div>

      {/* PTT Active indicator */}
      {isPTTActive && !isMuted && (
        <div className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/50 rounded text-[9px] text-orange-300 font-black uppercase flex-shrink-0">
          PTT
        </div>
      )}

      {/* Mute status with distinct styling */}
      <div className="flex-shrink-0">
        {isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-red-400" />
        ) : isSpeaking ? (
          <Mic className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Mic className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </div>
    </div>
  );
}