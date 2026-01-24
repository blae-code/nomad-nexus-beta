import React from 'react';
import { AlertTriangle, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PTTHud({ isTransmitting, pttKey, pttWarning, isMuted }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 pointer-events-none",
      "transition-all duration-100"
    )}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border-2 font-mono text-sm font-bold",
        isTransmitting && !isMuted
          ? "bg-red-950/90 border-red-500 text-red-300 shadow-lg shadow-red-500/50"
          : isMuted
          ? "bg-zinc-950/90 border-zinc-700 text-zinc-400"
          : "bg-zinc-950/90 border-zinc-800 text-zinc-500"
      )}>
        {isTransmitting && !isMuted ? (
          <>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse" />
              <span>TRANSMITTING</span>
            </div>
            <div className="h-5 w-[1px] bg-zinc-700" />
            <div className="text-xs text-zinc-400">Release to end</div>
          </>
        ) : isMuted ? (
          <>
            <MicOff className="w-4 h-4" />
            <span>MIC MUTED</span>
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4" />
            <span>Ready</span>
            <div className="h-5 w-[1px] bg-zinc-700" />
            <div className="text-xs text-zinc-500">Press {pttKey} to TX</div>
          </>
        )}
      </div>
      {pttWarning && (
        <div className="mt-2 flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 shadow-lg shadow-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <span>{pttWarning}</span>
        </div>
      )}
    </div>
  );
}
