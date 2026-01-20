import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { ShieldAlert, Radio } from "lucide-react";

export default function RescueAlertPanel() {
  const { data: activeRescue } = useQuery({
    queryKey: ['rescue-alert-panel'],
    queryFn: async () => {
      const status = await base44.entities.PlayerStatus.filter({ status: 'DISTRESS' }, null, 1);
      return status && status.length > 0 ? status[0] : null;
    },
    refetchInterval: 5000
  });

  if (activeRescue) {
    return (
      <div className="border-2 border-red-600 bg-red-950/20 p-4 flex flex-col items-center text-center gap-2 animate-pulse">
         <ShieldAlert className="w-8 h-8 text-red-500" />
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