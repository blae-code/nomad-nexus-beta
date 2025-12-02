import React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronsUp, Star, Shield, Target, User, Users } from "lucide-react";
import { RANK_COLORS } from "@/components/utils/rankUtils";

const RANKS = [
  { name: "Pioneer", icon: Star, ...RANK_COLORS['Pioneer'] },
  { name: "Founder", icon: ChevronsUp, ...RANK_COLORS['Founder'] },
  { name: "Voyager", icon: ChevronUp, ...RANK_COLORS['Voyager'] },
  { name: "Scout", icon: Target, ...RANK_COLORS['Scout'] },
  { name: "Vagrant", icon: User, ...RANK_COLORS['Vagrant'] },
  // Affiliate is not in the ladder visually usually, but good to have if needed
];

export default function RankVisualizer({ currentRank = "Vagrant" }) {
  const currentRankIndex = RANKS.findIndex(r => r.name.toLowerCase() === (currentRank || 'vagrant').toLowerCase());
  const activeIndex = currentRankIndex === -1 ? RANKS.length - 1 : currentRankIndex;

  return (
    <div className="flex flex-col h-full border border-zinc-800 bg-[#0c0c0e] overflow-hidden">
       {/* Header */}
       <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clearance Ladder</span>
          <span className="text-[10px] font-mono text-zinc-600">{(currentRank || 'VAGRANT').toUpperCase()}</span>
       </div>

       {/* Ladder */}
       <div className="flex-1 relative p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          {/* Connection Line */}
          <div className="absolute left-[1.85rem] top-6 bottom-6 w-px bg-zinc-800 -z-10" />
          
          {RANKS.map((rank, index) => {
             const isCurrent = rank.name.toLowerCase() === (currentRank || 'vagrant').toLowerCase();
             // Logic: If index is >= activeIndex (meaning it's lower or equal in the array, but visually we want higher rank to be 'achieved'?)
             // Wait, Array is Pioneer(0) -> Vagrant(4).
             // If I am Voyager(2). Pioneer(0) is NOT achieved? Or is it?
             // Hierarchy: Pioneer > Founder > Voyager > Scout > Vagrant.
             // If I am Voyager, I have passed Scout and Vagrant.
             // So indices 2, 3, 4 are "Active/Passed". 0 and 1 are "Locked/Future".
             const isAchieved = index >= activeIndex; 

             const Icon = rank.icon;

             return (
                <div key={rank.name} className={cn(
                   "relative flex items-center gap-3 group",
                   isCurrent ? "opacity-100" : isAchieved ? "opacity-60" : "opacity-30"
                )}>
                   {/* Node */}
                   <div className={cn(
                      "w-8 h-8 rounded-none border-2 flex items-center justify-center shrink-0 transition-all duration-300 z-10 bg-black",
                      isCurrent ? "border-[#ea580c] bg-[#ea580c]/10 scale-110 shadow-[0_0_15px_rgba(234,88,12,0.3)]" : 
                      isAchieved ? rank.border : "border-zinc-800 bg-zinc-950"
                   )}>
                      <Icon className={cn(
                         "w-4 h-4", 
                         isCurrent ? "text-[#ea580c]" : isAchieved ? rank.color : "text-zinc-700"
                      )} />
                   </div>

                   {/* Label Plate */}
                   <div className={cn(
                      "flex-1 p-2 border transition-all duration-300 clip-path-tech",
                      isCurrent ? "border-[#ea580c] bg-[#ea580c]/10 translate-x-1" : 
                      isAchieved ? "border-zinc-800/50 bg-zinc-900/20" : "border-zinc-900 bg-transparent"
                   )}>
                      <div className="flex justify-between items-center">
                         <span className={cn(
                            "text-xs font-bold uppercase tracking-wider font-mono",
                            isCurrent ? "text-[#ea580c]" : isAchieved ? "text-zinc-400" : "text-zinc-700"
                         )}>
                            {rank.name}
                         </span>
                         {isCurrent && (
                            <div className="w-1.5 h-1.5 bg-[#ea580c] animate-pulse rounded-full" />
                         )}
                      </div>
                   </div>
                </div>
             );
          })}
       </div>
    </div>
  );
}