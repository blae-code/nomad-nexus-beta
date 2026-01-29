import React from 'react';
import { Mic, Users } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';

export default function NetRoster() {
  const voiceNet = useVoiceNet();

  const sortedParticipants = (voiceNet.participants || [])
    .sort((a, b) => {
      // Speaking first
      if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
      // Then by callsign
      return (a.callsign || '').localeCompare(b.callsign || '');
    });

  if (!voiceNet.activeNetId) {
    return (
      <div className="px-4 py-3 text-center text-zinc-500 text-xs">
        <Users className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p>Join a voice net to see participants</p>
      </div>
    );
  }

  if (sortedParticipants.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-zinc-500 text-xs">
        <Users className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p>Waiting for participants...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 text-xs space-y-1.5 animate-in fade-in duration-200">
      {sortedParticipants.map((participant) => (
        <div
          key={participant.userId}
          className={`p-2.5 rounded-md flex items-center justify-between transition-all ${
            participant.isSpeaking
              ? 'bg-orange-500/15 border border-orange-500/30'
              : 'bg-zinc-800/40 border border-zinc-700/50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm font-semibold text-zinc-200 truncate">
              {participant.callsign || 'Unknown'}
            </div>
            {participant.rank && (
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {getRankLabel(participant.rank)}
                {participant.membership && ` • ${getMembershipLabel(participant.membership)}`}
              </div>
            )}
          </div>
          {participant.isSpeaking && (
            <Mic className="w-3.5 h-3.5 text-orange-500 animate-pulse flex-shrink-0 ml-2" />
          )}
        </div>
      ))}
    </div>
  );
}