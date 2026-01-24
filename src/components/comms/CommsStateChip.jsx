import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Radio, Users, WifiOff, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommsStateChip: Unified truth source for comms state across all surfaces
 * Shows: mode (SIM/LIVE), connection state, room, participants, errors
 */
export default function CommsStateChip({
  mode = 'SIM',
  connectionState = 'disconnected',
  roomName = null,
  participants = 0,
  lastError = null,
  compact = false,
  onRetry = null,
  className
}) {
  const [expanded, setExpanded] = useState(false);

  // Determine chip appearance based on state
  const getStateConfig = () => {
    if (connectionState === 'error' || lastError) {
      return {
        bgColor: 'bg-red-950/50',
        borderColor: 'border-red-800',
        textColor: 'text-red-400',
        icon: AlertCircle,
        label: 'ERROR',
        pulse: true
      };
    }

    if (connectionState === 'connecting') {
      return {
        bgColor: 'bg-amber-950/50',
        borderColor: 'border-amber-800',
        textColor: 'text-amber-400',
        icon: Loader2,
        label: 'CONNECTING',
        pulse: false,
        spin: true
      };
    }

    if (connectionState === 'connected') {
      return {
        bgColor: mode === 'LIVE' ? 'bg-emerald-950/50' : 'bg-blue-950/50',
        borderColor: mode === 'LIVE' ? 'border-emerald-800' : 'border-blue-800',
        textColor: mode === 'LIVE' ? 'text-emerald-400' : 'text-blue-400',
        icon: mode === 'LIVE' ? Radio : CheckCircle2,
        label: mode === 'LIVE' ? 'LIVE' : 'SIM',
        pulse: false
      };
    }

    // disconnected
    return {
      bgColor: 'bg-zinc-900/50',
      borderColor: 'border-zinc-800',
      textColor: 'text-zinc-500',
      icon: WifiOff,
      label: 'OFFLINE',
      pulse: false
    };
  };

  const config = getStateConfig();
  const Icon = config.icon;

  const handleClick = () => {
    if (lastError && !compact) {
      setExpanded(!expanded);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-2 py-1 border rounded transition-all cursor-default',
          config.bgColor,
          config.borderColor,
          lastError && !compact && 'cursor-pointer hover:opacity-80',
          config.pulse && 'animate-pulse'
        )}
      >
        <Icon 
          className={cn(
            'w-3 h-3', 
            config.textColor,
            config.spin && 'animate-spin'
          )} 
        />
        
        {!compact && (
          <>
            <span className={cn('text-[10px] font-bold font-mono uppercase', config.textColor)}>
              {config.label}
            </span>

            {connectionState === 'connected' && (
              <>
                {roomName && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span className="text-[9px] text-zinc-500 font-mono">{roomName}</span>
                  </>
                )}
                {participants > 0 && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <Users className="w-2.5 h-2.5 text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-mono">{participants}</span>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Error Expansion */}
      <AnimatePresence>
        {expanded && lastError && !compact && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute top-full mt-1 left-0 right-0 bg-zinc-950 border border-red-800 rounded shadow-lg p-2 z-50 min-w-[240px]"
          >
            <div className="text-[10px] text-red-400 font-bold uppercase mb-1">
              Connection Failed
            </div>
            <div className="text-[9px] text-zinc-400 mb-2">
              {lastError}
            </div>
            {onRetry && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                  onRetry();
                }}
                size="sm"
                className="w-full h-6 text-[9px] gap-1 bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Join
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}