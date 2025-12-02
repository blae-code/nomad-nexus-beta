import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Users, Radio, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function OrgStatusWidget() {
  // Determine Active Event (Simplified: most recent active, or scheduled today)
  const { data: activeEvent } = useQuery({
    queryKey: ['dashboard-active-event'],
    queryFn: async () => {
       const events = await base44.entities.Event.list({
          filter: { status: 'active' },
          sort: { start_time: -1 },
          limit: 1
       });
       return events[0] || null;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-org-stats', activeEvent?.id],
    queryFn: async () => {
      if (!activeEvent) return { total: 0, ready: 0, down: 0, engaged: 0 };
      
      const statuses = await base44.entities.PlayerStatus.list({ event_id: activeEvent.id });
      return {
         total: statuses.length,
         ready: statuses.filter(s => s.status === 'READY').length,
         down: statuses.filter(s => s.status === 'DOWN' || s.status === 'DISTRESS').length,
         engaged: statuses.filter(s => s.status === 'ENGAGED').length
      };
    },
    enabled: !!activeEvent,
    initialData: { total: 0, ready: 0, down: 0, engaged: 0 }
  });

  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900/50">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-500" />
          Org Status Monitor
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col gap-4">
         {/* Active Event Indicator */}
         <div className="flex items-center justify-between bg-zinc-950 p-3 border border-zinc-800">
            <div>
               <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-0.5">Active Operation</div>
               <div className="text-sm font-bold text-white truncate max-w-[180px]">
                  {activeEvent ? activeEvent.title : "NO ACTIVE OPS"}
               </div>
            </div>
            <div className={cn("h-2 w-2 rounded-full", activeEvent ? "bg-emerald-500 animate-pulse" : "bg-zinc-800")} />
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="bg-zinc-900/30 border border-zinc-800 p-2 flex flex-col items-center justify-center">
               <Users className="w-4 h-4 text-zinc-600 mb-1" />
               <span className="text-2xl font-black text-zinc-200">{stats.total}</span>
               <span className="text-[9px] uppercase text-zinc-600 tracking-widest">Deployed</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 p-2 flex flex-col items-center justify-center">
               <Shield className="w-4 h-4 text-emerald-900 mb-1" />
               <span className="text-2xl font-black text-emerald-500">{stats.ready}</span>
               <span className="text-[9px] uppercase text-emerald-900 tracking-widest">Ready</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 p-2 flex flex-col items-center justify-center col-span-2">
               <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-3 h-3 text-orange-500 animate-pulse" />
                  <span className="text-[9px] uppercase text-orange-500 tracking-widest">Casualty / Distress</span>
               </div>
               <span className={cn("text-3xl font-black", stats.down > 0 ? "text-red-500" : "text-zinc-700")}>
                  {stats.down}
               </span>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}