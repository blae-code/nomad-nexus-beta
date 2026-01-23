import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Users, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * WhisperStrip: Compact UI for active whisper sessions
 * Shows whisper room status, participants, and quick actions
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
  const [expanded, setExpanded] = useState(true);

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
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 8, opacity: 0 }}
      className="fixed bottom-4 right-4 bg-zinc-950 border border-[#ea580c] rounded p-3 z-40 max-w-xs"
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              isConnected ? 'bg-green-500' : 'bg-amber-500'
            )} />
            <span className="text-xs font-bold text-white">
              Whisper: {scopeLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-zinc-500 hover:text-red-400"
            onClick={onLeaveWhisper}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-[10px] text-zinc-500">
          {isConnected ? (
            <span>Connected · {participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
          ) : (
            <span>Connecting...</span>
          )}
        </div>

        {/* Participants (collapsed) */}
        {expanded && participants.length > 0 && (
          <div className="text-[9px] text-zinc-600 bg-zinc-900/50 p-1.5 rounded max-h-12 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                <span>{p.name || 'Unknown'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 text-xs h-7"
            onClick={onMuteToggle}
          >
            {isMuted ? (
              <>
                <MicOff className="w-3 h-3 text-red-400" />
                MUTED
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 text-green-400" />
                LIVE
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-7 text-zinc-500"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'}
          </Button>
        </div>

        {/* PTT Indicator */}
        {isTransmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-[10px] text-orange-400 font-mono"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            PTT ACTIVE
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}