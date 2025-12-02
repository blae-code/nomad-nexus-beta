import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Box, Syringe, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ArmoryStatusPanel() {
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['armory-low-stock'],
    queryFn: async () => {
      // Get all items (assuming small DB for now) and sort by quantity
      const items = await base44.entities.ArmoryItem.list({
        sort: { quantity: 1 },
        limit: 3
      });
      return items;
    }
  });

  const getIcon = (category) => {
    switch(category) {
      case 'WEAPON': return Shield;
      case 'MEDICAL': return Syringe;
      default: return Box;
    }
  };

  return (
    <div className="border border-orange-900/30 bg-zinc-950/80 h-full flex flex-col">
      {/* Inverted Header Bar */}
      <div className="bg-orange-700 text-white px-3 py-1 flex items-center justify-between shrink-0">
         <span className="text-[10px] font-black uppercase tracking-widest">ARMORY_LOGISTICS</span>
         <span className="text-[9px] font-mono opacity-80">LOW_STOCK_WARNING</span>
      </div>
      
      <div className="p-4 grid grid-cols-3 gap-4 flex-1">
         {lowStockItems.length === 0 ? (
            <div className="col-span-3 flex items-center justify-center text-zinc-600 text-xs italic">
               All systems nominal.
            </div>
         ) : (
            lowStockItems.map(item => {
               const Icon = getIcon(item.category);
               const isCritical = item.quantity === 0;
               
               return (
                  <div key={item.id} className={cn(
                     "flex flex-col items-center justify-center text-center p-2 border bg-zinc-900/50",
                     isCritical ? "border-red-900/50 bg-red-950/10" : "border-zinc-800"
                  )}>
                     <Icon className={cn("w-5 h-5 mb-2 opacity-70", isCritical ? "text-red-500" : "text-orange-500")} />
                     <div className="text-[9px] text-zinc-400 uppercase font-bold truncate w-full mb-1">{item.name}</div>
                     <div className={cn("font-mono text-xl leading-none font-bold", isCritical ? "text-red-500" : "text-zinc-200")}>
                        {item.quantity.toString().padStart(2, '0')}
                     </div>
                  </div>
               );
            })
         )}
      </div>
    </div>
  );
}