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
    const severityClasses = cn(
      "border-2 p-4 flex flex-col items-center text-center gap-2",
      getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'border'),
      getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'bg'),
      "animate-pulse shadow-lg shadow-red-950/50"
    );
    return (
      <div className={severityClasses}>
         <ShieldAlert className={cn("w-8 h-8", getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'text'))} />
         <div className={cn("text-[10px] font-mono", getSeverityColor(SEVERITY_LEVELS.CRITICAL, 'text'))}>
            IMMEDIATE RESPONSE REQUIRED
         </div>
      </div>
    );
  }

  return (
    <div className={cn("border p-4 flex flex-col items-center text-center gap-2", getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'border'), getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'bg'))}>
       <Radio className={cn("w-6 h-6", getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'text'))} />
       <div className={cn("font-bold uppercase tracking-widest text-xs", getSeverityColor(SEVERITY_LEVELS.NOMINAL, 'text'))}>
          [SIGNAL STATUS: NOMAD WATCH ONLINE]
       </div>
    </div>
  );
}