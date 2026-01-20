import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Box, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ArmoryStatusPanel() {
  const { data: items = [] } = useQuery({
    queryKey: ['armory-status-gauge'],
    queryFn: async () => {
      return base44.entities.ArmoryItem.filter({}, 'quantity', 4);
    }
  });

  const getIcon = (category) => {
    switch(category) {
      case 'WEAPON': return Shield;
      case 'MEDICAL': return Syringe;
      default: return Box;
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage < 10) return "bg-red-600";
    if (percentage < 50) return "bg-amber-500";
    return "bg-emerald-500";
  };
  
  const getTextColor = (percentage) => {
     if (percentage < 10) return "text-red-500";
     if (percentage < 50) return "text-amber-500";
     return "text-emerald-500";
  };

  return (
    <div className="border border-zinc-800 bg-[#0c0c0e] h-full flex flex-col">
      <div className="bg-zinc-900 text-zinc-400 px-3 py-1.5 flex items-center justify-between shrink-0 border-b border-zinc-800">
         <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Armory Levels
         </span>
      </div>
      
      <div className="flex-1 p-3 flex flex-col justify-center gap-3 overflow-y-auto custom-scrollbar">
         {items.length === 0 ? (
            <div className="text-center text-zinc-600 text-xs italic">No inventory data.</div>
         ) : (
            items.map(item => {
               const Icon = getIcon(item.category);
               // Assuming max capacity 100 for gauge visualization
               const max = 100; 
               const percentage = Math.min(100, Math.max(0, (item.quantity / max) * 100));
               const barColor = getStatusColor(percentage);
               const textColor = getTextColor(percentage);

               return (
                  <div key={item.id} className="space-y-1">
                     <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider items-center">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                           <Icon className="w-3 h-3 opacity-70" />
                           {item.name}
                        </span>
                        <span className={cn("font-mono", textColor)}>
                           {percentage.toFixed(0)}%
                        </span>
                     </div>
                     <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                           className={cn("h-full transition-all duration-500", barColor)} 
                           style={{ width: `${percentage}%` }}
                        />
                     </div>
                  </div>
               );
            })
         )}
      </div>
    </div>
  );
}