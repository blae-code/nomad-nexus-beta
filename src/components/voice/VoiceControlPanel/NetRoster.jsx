import React from 'react';
import { Mic, Users } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';
import VoiceParticipantIndicator from '@/components/voice/VoiceParticipantIndicator';

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
        <VoiceParticipantIndicator
          key={participant.userId}
          participant={participant}
          isSpeaking={participant.isSpeaking}
          isMuted={participant.isMuted}
          isPTTActive={voiceNet.pttActive && participant.userId === voiceNet.localUserId}
        />
      ))}
    </div>
  );
}