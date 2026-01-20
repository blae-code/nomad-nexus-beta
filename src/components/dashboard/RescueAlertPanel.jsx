import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { ShieldAlert, Radio } from "lucide-react";
import { getSeverityColor, SEVERITY_LEVELS } from "@/components/utils/severitySystem";

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
      <div className={cn(
        "border-2 p-4 flex flex-col items-center text-center gap-2",
        getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'border'),
        getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'bg'),
        getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'animate')
      )}>
         <ShieldAlert className={cn("w-8 h-8", getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'text'))} />
         <div className={cn("text-[10px] font-mono", getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'text'))}>
            IMMEDIATE RESPONSE REQUIRED
         </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "border p-4 flex flex-col items-center text-center gap-2",
      getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'border'),
      "bg-zinc-900/30"
    )}>
       <Radio className={cn("w-6 h-6", getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'text'))} />
       <div className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
          [SIGNAL STATUS: NOMAD WATCH ONLINE]
       </div>
    </div>
  );
}