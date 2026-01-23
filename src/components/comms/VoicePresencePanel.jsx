/**
 * Voice Presence Panel
 * Shows who's in room, speaking status, and mute state
 */
import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoicePresencePanel({ participants = [], currentUser, isSimulated = false }) {
  const sorted = [...participants].sort((a, b) => {
    // Local user first, then by speaking, then by name
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="space-y-1 text-[8px]">
      <div className="px-2 py-1 font-bold uppercase text-zinc-500 flex items-center justify-between">
        <span>In Room ({participants.length})</span>
        {isSimulated && (
          <span className="text-[7px] px-1 py-0 bg-blue-950/40 text-blue-400 border border-blue-700/40">
            SIM
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {sorted.map(participant => (
          <div
            key={participant.id}
            className={cn(
              'px-2 py-1 border rounded-none transition-colors flex items-center justify-between gap-1',
              participant.isLocal
                ? 'bg-orange-950/20 border-orange-700/40'
                : participant.isSpeaking
                ? 'bg-green-950/20 border-green-700/40'
                : 'bg-zinc-900/20 border-zinc-800/40'
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                participant.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'
              )} />
              <span className="truncate text-zinc-300">
                {participant.name}
                {participant.isLocal && <span className="text-zinc-600"> (you)</span>}
              </span>
            </div>
            {participant.isMuted ? (
              <MicOff className="w-2.5 h-2.5 text-red-500 shrink-0" />
            ) : (
              <Mic className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {participants.length === 0 && (
        <p className="px-2 py-2 text-zinc-600 italic">No participants in room</p>
      )}
    </div>
  );
}