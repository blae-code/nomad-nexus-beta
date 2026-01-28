import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, WifiOff, Loader2, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommsStateChip: Single source of truth for comms state display
 * Shows mode (SIM/LIVE), connection state, room info, participant count, errors
 */
export default function CommsStateChip({
  mode = 'SIM', // SIM | LIVE
  connectionState = 'disconnected', // disconnected | connecting | connected | error
  roomName = null,
  participants = 0,
  lastError = null,
  onRetry = null,
  compact = false,
  className
}) {
  const [expanded, setExpanded] = useState(false);

  // Mode styling
  const modeConfig = {
    SIM: {
      color: 'bg-amber-950/30 border-amber-800 text-amber-400',
      label: 'SIM',
      icon: Activity
    },
    LIVE: {
      color: 'bg-emerald-950/30 border-emerald-800 text-emerald-400',
      label: 'LIVE',
      icon: Wifi
    }
  };

  // Connection state styling
  const stateConfig = {
    disconnected: {
      color: 'text-zinc-600',
      icon: WifiOff,
      label: 'OFFLINE'
    },
    connecting: {
      color: 'text-amber-500',
      icon: Loader2,
      label: 'CONNECTING',
      animate: true
    },
    connected: {
      color: 'text-emerald-500',
      icon: Wifi,
      label: 'CONNECTED'
    },
    error: {
      color: 'text-red-500',
      icon: AlertCircle,
      label: 'ERROR'
    }
  };

  const currentMode = modeConfig[mode] || modeConfig.SIM;
  const currentState = stateConfig[connectionState] || stateConfig.disconnected;
  const ModeIcon = currentMode.icon;
  const StateIcon = currentState.icon;

  const showError = connectionState === 'error' && lastError;
  const canExpand = showError && onRetry;

  const handleClick = () => {
    if (canExpand) {
      setExpanded(!expanded);
    }
  };

  if (compact) {
    // Compact: Just mode badge + state indicator
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Badge className={cn('text-[9px] font-mono px-1.5 py-0.5', currentMode.color)}>
          {currentMode.label}
        </Badge>
        <div className={cn('flex items-center gap-1', currentState.color)}>
          <StateIcon className={cn('w-3 h-3', currentState.animate && 'animate-spin')} />
          {connectionState === 'connected' && participants > 0 && (
            <span className="text-[9px] font-mono">{participants}</span>
          )}
        </div>
      </div>
    );
  }

  // Full display
  return (
    <div className={className}>
      <motion.div
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded border transition-all',
          currentMode.color,
          canExpand && 'cursor-pointer hover:opacity-80'
        )}
      >
        <ModeIcon className="w-3 h-3" />
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase">
          <span>{currentMode.label}</span>
          <span className="text-zinc-700">•</span>
          <div className={cn('flex items-center gap-1', currentState.color)}>
            <StateIcon className={cn('w-3 h-3', currentState.animate && 'animate-spin')} />
            <span>{currentState.label}</span>
          </div>
        </div>

        {connectionState === 'connected' && (
          <>
            {roomName && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400">{roomName}</span>
              </>
            )}
            {participants > 0 && (
              <>
                <span className="text-zinc-700">•</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Users className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-bold">{participants}</span>
                </div>
              </>
            )}
          </>
        )}

        {showError && canExpand && (
          <AlertCircle className="w-3 h-3 text-red-500 animate-pulse ml-1" />
        )}
      </motion.div>

      {/* Error Expansion */}
      <AnimatePresence>
        {expanded && showError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-red-950/30 border border-red-800/50 rounded space-y-2">
              <div className="text-xs text-red-400 font-bold uppercase">Connection Failed</div>
              <div className="text-[10px] text-red-300 font-mono">{lastError}</div>
              {onRetry && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                    setExpanded(false);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 gap-2 h-7 text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  RETRY JOIN
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}