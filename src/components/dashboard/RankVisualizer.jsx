import React from "react";
import { cn } from "@/lib/utils";

export default function RankVisualizer({ currentRank = "Vagrant" }) {
  const ranks = ["Vagrant", "Scout", "Voyager"];
  const currentIndex = ranks.indexOf(currentRank) === -1 ? 0 : ranks.indexOf(currentRank);

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
      <div className="flex justify-between items-end mb-2">
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          Clearance Protocol
        </div>
        <div className="text-xs font-mono text-white font-bold">
          {currentRank.toUpperCase()}
        </div>
      </div>

      <div className="relative h-1 bg-zinc-900 w-full mt-2 flex items-center justify-between px-[10%]">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 w-full -z-10" />
        <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-600 transition-all duration-1000 -z-10" 
            style={{ width: `${(currentIndex / (ranks.length - 1)) * 100}%` }}
        />

        {ranks.map((rank, idx) => {
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={rank} className="flex flex-col items-center gap-2 relative group">
               {/* Node */}
               <div className={cn(
                 "w-2 h-2 rotate-45 border transition-all duration-500",
                 isActive ? "bg-zinc-200 border-zinc-200" : "bg-zinc-950 border-zinc-700",
                 isCurrent && "scale-150 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
               )} />
               
               {/* Label */}
               <div className={cn(
                 "absolute top-4 text-[9px] font-mono uppercase tracking-wider transition-colors duration-300 whitespace-nowrap",
                 isCurrent ? "text-white font-bold" : isActive ? "text-zinc-500" : "text-zinc-700"
               )}>
                 {rank}
               </div>
            </div>
          );
        })}
      </div>
      <div className="h-4" /> {/* Spacing for labels */}
    </div>
  );
}