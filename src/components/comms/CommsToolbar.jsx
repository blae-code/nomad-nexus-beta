import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Settings2, Radio, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Comms toolbar — display-only for connection status and net info.
 * Join/Leave moved to ActiveNetPanel to keep connection state in one place.
 */
export default function CommsToolbar({
  selectedNet,
  connectionState,
  isTransmitting,
  onOpenAdvanced,
  className = '',
}) {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className={cn('flex items-center gap-3 h-10 bg-zinc-900 border border-zinc-800 px-3 rounded-sm', className)}>
      {/* Net Info Display */}
      {selectedNet ? (
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-mono bg-zinc-800 border-zinc-700 text-zinc-300">
            {selectedNet.code}
          </Badge>
          <span className="text-xs text-zinc-400 font-mono truncate">{selectedNet.label}</span>
        </div>
      ) : (
        <span className="text-xs text-zinc-600 font-mono italic">No Net Selected</span>
      )}

      {/* Separator */}
      <div className="w-px h-5 bg-zinc-800 mx-1" />

      {/* PTT/Mute Status */}
      {selectedNet && isConnected && (
        <div className="flex items-center gap-1">
          {isTransmitting && (
            <Badge className="text-[9px] h-5 px-1.5 bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse">
              TX
            </Badge>
          )}
        </div>
      )}

      {/* Connection Status Indicator */}
      {selectedNet && (
        <div className="flex items-center gap-1">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'
            )}
          />
          <span className="text-[9px] text-zinc-500 font-mono">
            {isConnecting ? 'CONNECTING...' : isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Advanced Button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpenAdvanced}
        className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        title="Advanced Controls"
      >
        <Settings2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}