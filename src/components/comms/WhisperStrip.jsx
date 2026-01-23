import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * WhisperStrip: Compact side-channel UI for whisper sessions
 * Shows participants, PTT control, mute, and quick leave
 */
export default function WhisperStrip({
  whisperSession,
  isConnected,
  isMuted,
  onMuteToggle,
  onLeaveWhisper,
  participants = [],
  isTransmitting = false
}) {
  const [expanded, setExpanded] = useState(false);

  if (!whisperSession) return null;

  const scopeLabel = {
    ONE: '1:1',
    ROLE: 'Role',
    SQUAD: 'Squad',
    WING: 'Wing',
    FLEET: 'Fleet'
  }[whisperSession.scope] || 'Whisper';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="border-t border-zinc-800 bg-gradient-to-r from-purple-950/30 to-transparent p-3"
    >
      {/* Compact header */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-zinc-900/30 px-2 py-1 rounded transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Status indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )}
          />

          {/* Label & scope */}
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-bold uppercase text-zinc-300">
              {scopeLabel} Whisper
            </span>
            {isTransmitting && (
              <span className="text-[9px] font-mono text-green-400 animate-pulse">TX</span>
            )}
          </div>

          {/* Quick participant count */}
          <div className="flex items-center gap-1 text-[9px] text-zinc-500">
            <Users className="w-3 h-3" />
            <span>{participants.length || '?'}</span>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onMuteToggle?.();
            }}
            className={cn(
              'h-7 w-7 p-0 rounded-full transition-colors',
              isMuted
                ? 'bg-red-950/50 text-red-400 hover:bg-red-900/50'
                : 'bg-transparent text-zinc-400 hover:text-zinc-300'
            )}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-3 h-3" />
            ) : (
              <Mic className="w-3 h-3" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onLeaveWhisper?.();
            }}
            className="h-7 w-7 p-0 rounded-full bg-red-950/30 text-red-400 hover:bg-red-900/50 transition-colors"
            title="Leave whisper"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-zinc-800/50 space-y-2"
          >
            {/* Room info */}
            <div className="px-2 space-y-1 text-[9px] text-zinc-600">
              <div>
                <span className="text-zinc-500 font-mono">Room:</span>
                <span className="ml-2 text-zinc-400 break-all font-mono">
                  {whisperSession.livekit_room_name?.substring(0, 30)}...
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-mono">Status:</span>
                <span
                  className={cn(
                    'ml-2 font-mono',
                    isConnected ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>

            {/* Participants list */}
            {participants.length > 0 && (
              <div className="px-2 space-y-1">
                <div className="text-[9px] text-zinc-500 font-mono uppercase">Participants:</div>
                <div className="space-y-1">
                  {participants.map((p, idx) => (
                    <motion.div
                      key={p.id || idx}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/30 text-[9px]"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      <span className="text-zinc-400 truncate">{p.name || `User ${p.id?.substring(0, 4)}`}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick help */}
            <div className="px-2 py-1 rounded bg-zinc-950/50 border border-zinc-800/50 text-[8px] text-zinc-600">
              <span className="font-mono">ESC</span> to leave whisper • <span className="font-mono">SHIFT+M</span> to toggle mute
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}