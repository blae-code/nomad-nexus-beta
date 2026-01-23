import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Settings2, Radio, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Core comms actions toolbar.
 * Single source of truth for:
 * - net selector (passed in via selectedNet)
 * - join/leave button
 * - mute / PTT status
 * - connection indicator
 *
 * Secondary controls moved to Advanced drawer.
 */
export default function CommsToolbar({
  selectedNet,
  isConnected,
  isConnecting,
  connectionError,
  isTransmitting,
  onOpenAdvanced,
  className = '',
}) {
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

      {/* Connection State Indicator */}
      {selectedNet && (
        <div className="flex items-center gap-1">
          {isConnecting && (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] text-blue-400 font-mono">CONNECTING...</span>
            </>
          )}
          {isConnected && (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-mono">CONNECTED</span>
            </>
          )}
          {!isConnecting && !isConnected && (
            <>
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="text-[9px] text-zinc-500 font-mono">DISCONNECTED</span>
            </>
          )}
          {connectionError && (
            <>
              <AlertCircle className="w-3 h-3 text-red-500 ml-1" />
              <span className="text-[9px] text-red-400 font-mono">{connectionError}</span>
            </>
          )}
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