/**
 * ConnectionTelemetryStrip: Compact connection status display
 * Shows mode (SIM/LIVE), state, participant count, mic, and PTT key
 */

import React from 'react';
import { Mic, MicOff, Radio, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ConnectionTelemetryStrip({
  mode = 'SIM', // LIVE or SIM
  state = 'disconnected', // disconnected | connecting | connected | error
  participantCount = 0,
  isMicEnabled = true,
  isTransmitting = false,
  pttKey = 'Space',
  errorMessage = null
}) {
  const stateConfig = {
    disconnected: { color: 'text-zinc-500', bg: 'bg-zinc-900/30', label: 'Ready' },
    connecting: { color: 'text-blue-400', bg: 'bg-blue-950/30', label: 'Joining...' },
    connected: { color: 'text-green-400', bg: 'bg-green-950/30', label: 'Connected' },
    error: { color: 'text-red-400', bg: 'bg-red-950/30', label: 'Error' }
  };

  const config = stateConfig[state] || stateConfig.disconnected;

  return (
    <div className={cn('flex items-center gap-3 px-3 py-1.5 text-[10px] border-b border-zinc-800', config.bg)}>
      {/* Mode badge */}
      <div className={cn('px-2 py-0.5 rounded font-mono font-bold', 
        mode === 'LIVE' 
          ? 'bg-red-950/50 text-red-400 border border-red-800' 
          : 'bg-blue-950/50 text-blue-400 border border-blue-800'
      )}>
        {mode}
      </div>

      {/* Connection state */}
      <motion.div
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: state === 'connecting' ? 0.8 : 2 }}
        className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded', config.color)}
      >
        <Radio className="w-2.5 h-2.5 shrink-0" />
        <span className="font-mono font-semibold">{config.label}</span>
      </motion.div>

      {/* Participant count */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/50 text-zinc-400">
        <span className="font-mono">{participantCount} users</span>
      </div>

      {/* Mic status */}
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded',
        isMicEnabled
          ? 'bg-green-950/30 text-green-400'
          : 'bg-red-950/30 text-red-400'
      )}>
        {isMicEnabled ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
        <span className="font-mono text-[9px]">{isMicEnabled ? 'ON' : 'OFF'}</span>
      </div>

      {/* PTT key display */}
      {state === 'connected' && (
        <motion.div
          animate={{ 
            opacity: isTransmitting ? 1 : 0.6,
            scale: isTransmitting ? 1.1 : 1
          }}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-bold',
            isTransmitting
              ? 'bg-red-950/50 text-red-400 border border-red-700'
              : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800'
          )}
        >
          <span>{pttKey}</span>
          <span className="text-[8px]">{isTransmitting ? 'TX' : 'PTT'}</span>
        </motion.div>
      )}

      {/* Error indicator */}
      {state === 'error' && errorMessage && (
        <div className="ml-auto flex items-center gap-1.5 text-red-400">
          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
          <span className="font-mono text-[9px] max-w-xs truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}