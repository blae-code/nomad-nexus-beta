import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skull, Radio, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OpsStatusBoard({ eventId }) {
  const { data: statuses } = useQuery({
    queryKey: ['ops-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ filter: { event_id: eventId } }),
    enabled: !!eventId,
    initialData: []
  });

  // Stats Calculation
  const stats = React.useMemo(() => {
    const total = statuses.length;
    const ready = statuses.filter(s => s.status === 'READY' || s.status === 'ENGAGED' || s.status === 'IN_QUANTUM').length;
    const down = statuses.filter(s => s.status === 'DOWN' || s.status === 'DISTRESS').length;
    const offline = statuses.filter(s => s.status === 'OFFLINE').length;
    
    const roles = {
      MEDIC: statuses.filter(s => s.role === 'MEDIC').length,
      PILOT: statuses.filter(s => s.role === 'PILOT').length,
      LOGISTICS: statuses.filter(s => s.role === 'LOGISTICS').length,
      GUNNER: statuses.filter(s => s.role === 'GUNNER').length,
    };

    return { total, ready, down, offline, roles };
  }, [statuses]);

  const readiness = stats.total > 0 ? (stats.ready / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Readiness Gauge */}
      <Card className="bg-zinc-900/50 border-zinc-800 md:col-span-2">
        <CardContent className="p-4">
          <div className="flex justify-between items-end mb-2">
             <div className="text-xs font-mono text-zinc-500 uppercase">Force Readiness</div>
             <div className={cn(
               "text-2xl font-black tracking-tighter",
               readiness >= 80 ? "text-emerald-500" : readiness >= 50 ? "text-amber-500" : "text-red-500"
             )}>
               {Math.round(readiness)}%
             </div>
          </div>
          <Progress value={readiness} className="h-2 bg-zinc-800" indicatorClassName={
             readiness >= 80 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-red-600"
          } />
          <div className="flex gap-4 mt-3">
             <div className="flex items-center gap-2 text-xs text-zinc-400">
               <CheckCircle2 className="w-3 h-3 text-emerald-500" />
               {stats.ready} Combat Effective
             </div>
             {stats.down > 0 && (
               <div className="flex items-center gap-2 text-xs text-red-400 animate-pulse">
                 <Skull className="w-3 h-3" />
                 {stats.down} CRITICAL/DOWN
               </div>
             )}
          </div>
        </CardContent>
      </Card>

      {/* Role Gaps */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="p-3 pb-0">
           <CardTitle className="text-[10px] uppercase text-zinc-500">Critical Roles</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
           <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">MEDIC</span>
              <Badge variant="outline" className={stats.roles.MEDIC === 0 ? "border-red-900 text-red-500 bg-red-950/20" : "border-zinc-800 text-zinc-300"}>
                 {stats.roles.MEDIC}
              </Badge>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">LOGISTICS</span>
              <Badge variant="outline" className={stats.roles.LOGISTICS === 0 ? "border-amber-900 text-amber-500 bg-amber-950/20" : "border-zinc-800 text-zinc-300"}>
                 {stats.roles.LOGISTICS}
              </Badge>
           </div>
           <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">PILOT</span>
              <Badge variant="outline" className={stats.roles.PILOT === 0 ? "border-red-900 text-red-500 bg-red-950/20" : "border-zinc-800 text-zinc-300"}>
                 {stats.roles.PILOT}
              </Badge>
           </div>
        </CardContent>
      </Card>
      
      {/* Offline / Issues */}
      <Card className="bg-zinc-900/50 border-zinc-800">
         <CardHeader className="p-3 pb-0">
            <CardTitle className="text-[10px] uppercase text-zinc-500">Comms Status</CardTitle>
         </CardHeader>
         <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
               <Radio className={cn("w-4 h-4", stats.offline > 0 ? "text-zinc-600" : "text-emerald-500")} />
               <span className="text-2xl font-bold text-zinc-200">{stats.total - stats.offline}</span>
               <span className="text-xs text-zinc-600">/ {stats.total} ONLINE</span>
            </div>
            {stats.offline > 0 && (
               <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {stats.offline} signals lost
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}