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
    <div className="flex flex-col items-center justify-center py-4">
       <div className="relative w-40 h-40 flex items-center justify-center select-none">
          
          {/* Status Ring */}
          <div className={cn(
             "absolute inset-0 rounded-full border-[6px] transition-all duration-500",
             isMuted ? "border-zinc-800 opacity-30" : 
             isTransmitting ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
             mode === 'PTT' ? "border-orange-500/30" : "border-emerald-500/30"
          )} />

          {/* Mode Toggle Button */}
          <button
             onClick={() => setMode(m => m === 'PTT' ? 'OPEN' : 'PTT')}
             className={cn(
                "absolute -top-3 px-3 py-0.5 rounded-full border bg-zinc-950 text-[10px] font-black tracking-widest transition-all z-10 hover:scale-105 flex items-center gap-2",
                mode === 'PTT' ? "border-orange-900 text-orange-500 hover:border-orange-500" : "border-emerald-900 text-emerald-500 hover:border-emerald-500"
             )}
          >
             {mode === 'PTT' ? <Radio className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
             {mode}
          </button>

          {/* Center Button */}
          <button
             onClick={() => setIsMuted(!isMuted)}
             className={cn(
                "w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-200 z-0 group active:scale-95 border-4",
                isMuted 
                   ? "bg-zinc-900/80 border-zinc-800 text-zinc-600" 
                   : "bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500"
             )}
          >
             {isMuted ? (
                <MicOff className="w-8 h-8 mb-1 opacity-50" />
             ) : (
                <Mic className={cn("w-8 h-8 mb-1", isTransmitting ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "")} />
             )}
             <span className={cn("text-[9px] font-black uppercase tracking-widest", isMuted ? "opacity-50" : "")}>
                {isMuted ? "MUTED" : isTransmitting ? "ON AIR" : "READY"}
             </span>
          </button>
          
          {/* PTT Instruction */}
          <div className="absolute -bottom-8 text-center w-full">
             {mode === 'PTT' && !isMuted && (
                <span className={cn("text-[9px] font-mono uppercase tracking-wider", isPTTPressed ? "text-emerald-500 font-bold" : "text-zinc-600")}>
                   {isPTTPressed ? "TRANSMITTING" : "HOLD [SPACE]"}
                </span>
             )}
          </div>
       </div>
    </div>
  );
}