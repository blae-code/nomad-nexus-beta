import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function CriticalAlertsWidget() {
  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => base44.entities.AIAgentLog.list({
      filter: { severity: 'HIGH' },
      sort: { created_date: -1 },
      limit: 5
    }),
    refetchInterval: 5000
  });

  return (
    <Card className="h-full bg-zinc-900/50 border-orange-900/50 flex flex-col overflow-hidden relative group">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b border-orange-900/30 bg-orange-950/10">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Critical Directives
        </CardTitle>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar relative">
        {alerts.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-orange-900/40 space-y-2">
              <AlertTriangle className="w-8 h-8 opacity-20" />
              <div className="text-[10px] uppercase tracking-widest">System Nominal</div>
           </div>
        ) : (
           <div className="divide-y divide-orange-900/20">
             {alerts.map((alert) => (
               <div key={alert.id} className="p-4 hover:bg-orange-950/5 transition-colors group/item cursor-pointer">
                 <div className="flex items-start justify-between mb-1">
                   <span className="text-xs font-bold text-orange-200 uppercase tracking-wider">{alert.summary}</span>
                   <span className="text-[9px] font-mono text-orange-700">{new Date(alert.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
                 <p className="text-[11px] text-orange-100/70 font-mono leading-snug">
                   {alert.details}
                 </p>
               </div>
             ))}
           </div>
        )}
        
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(234,88,12,0.02)_50%)] bg-[length:100%_4px]" />
      </CardContent>

      {/* Footer Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-900/0 via-orange-600/50 to-orange-900/0 opacity-50" />
    </Card>
  );
}