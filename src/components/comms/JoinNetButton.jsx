/**
 * JoinNetButton: Prominent join action with explicit disable states
 * Shows why joining is disabled and readable error states
 */

import React from 'react';
import { Play, AlertCircle, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function JoinNetButton({
  selectedEventId = null,
  selectedNetId = null,
  connectionState = 'disconnected',
  connectionError = null,
  isLoading = false,
  onClick = () => {},
  disabled = false
}) {
  // Determine disable reason
  let disableReason = null;
  let buttonState = 'ready'; // ready | disabled | connecting | connected | error

  if (!selectedEventId) {
    disableReason = 'Select an operation first';
    buttonState = 'disabled';
  } else if (!selectedNetId) {
    disableReason = 'Select a voice net';
    buttonState = 'disabled';
  } else if (connectionState === 'connecting') {
    buttonState = 'connecting';
  } else if (connectionState === 'connected') {
    buttonState = 'connected';
  } else if (connectionState === 'error') {
    buttonState = 'error';
  }

  const stateConfig = {
    ready: {
      label: 'JOIN NET',
      icon: Play,
      bg: 'bg-[#ea580c] hover:bg-[#c2410c]',
      text: 'text-white',
      border: 'border-[#ea580c]'
    },
    disabled: {
      label: disableReason || 'JOIN NET',
      icon: AlertCircle,
      bg: 'bg-zinc-900',
      text: 'text-zinc-600',
      border: 'border-zinc-800'
    },
    connecting: {
      label: 'JOINING...',
      icon: Loader2,
      bg: 'bg-blue-950',
      text: 'text-blue-400',
      border: 'border-blue-800'
    },
    connected: {
      label: 'CONNECTED',
      icon: Radio,
      bg: 'bg-green-950',
      text: 'text-green-400',
      border: 'border-green-800'
    },
    error: {
      label: connectionError ? `ERROR: ${connectionError}` : 'CONNECTION FAILED',
      icon: AlertCircle,
      bg: 'bg-red-950',
      text: 'text-red-400',
      border: 'border-red-800'
    }
  };

  const config = stateConfig[buttonState];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-2">
      <motion.button
        onClick={onClick}
        disabled={buttonState === 'disabled' || buttonState === 'connecting' || disabled}
        whileHover={buttonState === 'ready' ? { scale: 1.02 } : {}}
        whileTap={buttonState === 'ready' ? { scale: 0.98 } : {}}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-bold text-xs uppercase tracking-wider transition-all border',
          config.bg,
          config.text,
          config.border,
          buttonState === 'disabled' && 'cursor-not-allowed opacity-60',
          buttonState === 'connecting' && 'cursor-wait',
          buttonState === 'connected' && 'cursor-default'
        )}
      >
        {buttonState === 'connecting' && <Icon className="w-4 h-4 animate-spin" />}
        {buttonState !== 'connecting' && <Icon className="w-4 h-4" />}
        <span>{config.label}</span>
      </motion.button>

      {/* Helpful hints */}
      {buttonState === 'ready' && (
        <div className="text-[9px] text-zinc-600 font-mono text-center">
          Once connected, press <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">SPACE</kbd> to transmit
        </div>
      )}

      {buttonState === 'disabled' && disableReason && (
        <div className="text-[9px] text-zinc-600 font-mono text-center">
          {disableReason}
        </div>
      )}

      {buttonState === 'error' && connectionError && (
        <div className="text-[9px] text-red-400 font-mono bg-red-950/30 p-2 rounded border border-red-800 text-left">
          <strong>Connection failed:</strong> {connectionError}
        </div>
      )}
    </div>
  );
}