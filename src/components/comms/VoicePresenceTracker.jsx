import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Voice Presence Tracker
 * Shows who is in-room, who is speaking, who is muted
 * Works in both SIM and LIVE modes
 */
export default function VoicePresenceTracker({ roomName, participants = [], isSimMode = false }) {
  const [sortedParticipants, setSortedParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  // Simulate speaking activity in SIM mode
  useEffect(() => {
    if (!isSimMode || participants.length === 0) {
      setSpeakingUsers(new Set());
      return;
    }

    const speakingInterval = setInterval(() => {
      const activeCount = Math.ceil(participants.length * 0.3); // ~30% speaking
      const speaking = new Set();

      for (let i = 0; i < activeCount; i++) {
        const randomIdx = Math.floor(Math.random() * participants.length);
        speaking.add(participants[randomIdx].id);
      }

      setSpeakingUsers(speaking);
    }, 1500);

    return () => clearInterval(speakingInterval);
  }, [participants, isSimMode]);

  // Sort: local user first, then speaking, then alphabetically
  useEffect(() => {
    const sorted = [...participants].sort((a, b) => {
      if (a.isLocal) return -1;
      if (b.isLocal) return 1;
      if (speakingUsers.has(a.id) && !speakingUsers.has(b.id)) return -1;
      if (!speakingUsers.has(a.id) && speakingUsers.has(b.id)) return 1;
      return a.name.localeCompare(b.name);
    });
    setSortedParticipants(sorted);
  }, [participants, speakingUsers]);

  return (
    <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm">
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">PRESENCE</span>
            {isSimMode && <span className="text-[7px] text-zinc-600 font-mono">[SIM]</span>}
          </div>
          <span className="text-[8px] text-zinc-500">{participants.length} online</span>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto">
          <AnimatePresence>
            {sortedParticipants.length === 0 ? (
              <div className="text-[8px] text-zinc-600 py-2 text-center">No participants</div>
            ) : (
              sortedParticipants.map((participant) => {
                const isSpeaking = speakingUsers.has(participant.id);
                const isMuted = participant.isMuted || false;

                return (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1 rounded-sm text-[8px] transition-all',
                      isSpeaking
                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                        : 'bg-zinc-900/30 border border-zinc-800/30'
                    )}
                  >
                    {/* Speaking indicator */}
                    <motion.div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isSpeaking ? 'bg-emerald-500' : 'bg-zinc-700',
                        isSpeaking && 'animate-pulse'
                      )}
                      animate={isSpeaking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={isSpeaking ? { duration: 0.6, repeat: Infinity } : {}}
                    />

                    {/* Name */}
                    <span
                      className={cn(
                        'flex-1 font-mono truncate',
                        participant.isLocal && 'text-[#ea580c] font-bold'
                      )}
                    >
                      {participant.name}
                      {participant.isLocal && ' (you)'}
                    </span>

                    {/* Mute indicator */}
                    {isMuted ? (
                      <MicOff className="w-2.5 h-2.5 text-red-500 shrink-0" />
                    ) : (
                      <Mic className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                    )}

                    {/* Audio level (visual only) */}
                    <div className="w-6 h-2 bg-zinc-900 border border-zinc-700 rounded-sm overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full',
                          isSpeaking ? 'bg-emerald-500' : 'bg-zinc-700'
                        )}
                        initial={{ width: 0 }}
                        animate={{
                          width: isSpeaking ? `${20 + Math.random() * 60}%` : '0%'
                        }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}