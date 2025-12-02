import React from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, Radio } from "lucide-react";
import { useActiveRescueOps } from "@/components/hooks/useDataPool";

export default function RescueAlertPanel() {
  const { data: activeRescues } = useActiveRescueOps();
  const activeRescue = activeRescues && activeRescues.length > 0 ? activeRescues[0] : null;

  if (activeRescue) {
    return (
      <div className="border-2 border-red-600 bg-red-950/20 p-4 flex flex-col items-center text-center gap-2 animate-pulse">
         <ShieldAlert className="w-8 h-8 text-red-500" />
         <div className="text-red-500 font-black uppercase tracking-widest text-sm leading-tight">
            [ACTIVE SIGNAL: REDSCAR RESCUE]
         </div>
         <div className="text-red-400/70 text-[10px] font-mono">
            IMMEDIATE RESPONSE REQUIRED
         </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col items-center text-center gap-2">
       <Radio className="w-6 h-6 text-zinc-600" />
       <div className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
          [SIGNAL STATUS: NOMAD WATCH ONLINE]
       </div>
    </div>
  );
}