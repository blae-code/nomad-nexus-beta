import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { STATUS_CONFIG } from "@/components/status/StatusChip";

export default function FleetStatusSummary({ eventId }) {
  const { data: statuses } = useQuery({
    queryKey: ['event-statuses-summary', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 5000,
    initialData: []
  });

  const counts = React.useMemo(() => {
    const c = { READY: 0, ENGAGED: 0, DOWN: 0, DISTRESS: 0, TOTAL: 0 };
    statuses.forEach(s => {
       if (c[s.status] !== undefined) c[s.status]++;
       else c[s.status] = (c[s.status] || 0) + 1;
       
       // Aggregate criticals
       if (s.status === 'DOWN' || s.status === 'DISTRESS') {
          // handled above
       }
    });
    c.TOTAL = statuses.length;
    return c;
  }, [statuses]);

  if (!eventId) return null;

  return (
    <div className="flex items-center gap-2 bg-zinc-900/50 rounded-full px-3 py-1 border border-zinc-800">
       <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">FLEET STATUS</span>
       </div>
       
       <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1 text-emerald-500">
             <span>RDY:</span>
             <span>{(counts.READY || 0) + (counts.ENGAGED || 0)}</span>
          </div>
          <div className={counts.DOWN > 0 || counts.DISTRESS > 0 ? "flex items-center gap-1 text-red-500 animate-pulse" : "flex items-center gap-1 text-zinc-600"}>
             <span>CRIT:</span>
             <span>{(counts.DOWN || 0) + (counts.DISTRESS || 0)}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
             <span>TOT:</span>
             <span>{counts.TOTAL}</span>
          </div>
       </div>
    </div>
  );
}