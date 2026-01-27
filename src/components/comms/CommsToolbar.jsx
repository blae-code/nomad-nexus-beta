import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';
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
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-mono bg-zinc-800 border-zinc-700 text-zinc-300">
              {selectedNet.code}
            </Badge>
            <span className="text-xs text-zinc-400 font-mono truncate">{selectedNet.label}</span>
          </div>
          
          {/* TX Badge */}
          {isTransmitting && (
            <Badge className="text-[9px] h-5 px-1.5 bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse">
              TX
            </Badge>
          )}

          <div className="w-px h-5 bg-zinc-800" />

          {/* Unified State Chip */}
          <CommsStateChip
            mode={mode}
            connectionState={connectionState}
            roomName={selectedNet.code}
            participants={participantCount}
            lastError={lastError}
            onRetry={onRetry}
            compact={true}
          />
        </div>
      ) : (
        <span className="text-xs text-zinc-600 font-mono italic">No Net Selected</span>
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