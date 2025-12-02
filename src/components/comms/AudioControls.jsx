import React, { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Radio, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AudioControls({ onStateChange }) {
  const [mode, setMode] = useState("PTT"); // 'OPEN', 'PTT'
  const [isMuted, setIsMuted] = useState(false);
  const [isPTTPressed, setIsPTTPressed] = useState(false);

  // Calculate transmission state
  const isTransmitting = !isMuted && (mode === 'OPEN' || (mode === 'PTT' && isPTTPressed));

  // Status color logic
  const statusColor = isTransmitting 
    ? "bg-green-500 text-green-500" 
    : (mode === 'PTT' && !isMuted) 
      ? "bg-orange-600 text-orange-600" 
      : "bg-zinc-600 text-zinc-600";

  const statusLabel = isTransmitting
    ? "TRANSMITTING"
    : (mode === 'PTT' && !isMuted)
      ? "PTT READY"
      : "MUTED";

  // Keyboard listener for PTT (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && mode === 'PTT' && !e.repeat && !isMuted) {
        // Prevent scrolling if not focusing an input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            setIsPTTPressed(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space" && mode === 'PTT') {
         setIsPTTPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, isMuted]);

  // Notify parent of state changes for roster updates
  useEffect(() => {
    onStateChange?.({ mode, isMuted, isTransmitting });
  }, [mode, isMuted, isTransmitting, onStateChange]);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm flex flex-col gap-4">
      
      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
            <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-colors duration-200", statusColor.split(' ')[0])} />
            <span className={cn("text-xs font-black tracking-widest transition-colors duration-200", statusColor.split(' ')[1])}>
                {statusLabel}
            </span>
        </div>
        {mode === 'PTT' && (
            <span className="text-[9px] text-zinc-600 font-mono uppercase">HOLD [SPACE] TO TALK</span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        
        {/* Mic Toggle */}
        <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
                "border-zinc-700 hover:bg-zinc-800 transition-all",
                isMuted ? "text-red-500 border-red-900/50 bg-red-950/10" : "text-zinc-300"
            )}
        >
            {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {isMuted ? "UNMUTE" : "MUTE MIC"}
        </Button>

        {/* Mode Toggle */}
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-md p-1">
            <button
                onClick={() => setMode('PTT')}
                className={cn(
                    "flex-1 text-[10px] font-bold uppercase rounded-sm transition-all flex items-center justify-center gap-1",
                    mode === 'PTT' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-400"
                )}
            >
                <Radio className="w-3 h-3" />
                PTT
            </button>
            <button
                onClick={() => setMode('OPEN')}
                className={cn(
                    "flex-1 text-[10px] font-bold uppercase rounded-sm transition-all flex items-center justify-center gap-1",
                    mode === 'OPEN' ? "bg-emerald-900/50 text-emerald-400 shadow-sm" : "text-zinc-600 hover:text-zinc-400"
                )}
            >
                <Activity className="w-3 h-3" />
                OPEN
            </button>
        </div>
      </div>

      {/* Visualizer Bar (Mock) */}
      <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden flex items-end gap-0.5 opacity-50">
         {[...Array(20)].map((_, i) => (
            <div 
                key={i} 
                className={cn(
                    "flex-1 bg-zinc-800 transition-all duration-75",
                    isTransmitting && Math.random() > 0.3 ? "bg-emerald-500 h-full" : "h-[20%]"
                )} 
            />
         ))}
      </div>
    </div>
  );
}