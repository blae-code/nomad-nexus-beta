import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Shield, Crosshair, Zap, AlertCircle, Calendar, Clock, MapPin, ChevronRight, Users, Hash } from "lucide-react";
import { hasRole, hasMinRank } from "@/components/permissions";
import { toLocalTime } from "@/components/utils/dateUtils";

export default function EventProjectionPanel({ user, compact = false }) {
  // Fetch next 2 relevant events
  const { data: events = [] } = useQuery({
    queryKey: ['projection-events', user?.role_tags],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list({
        filter: { status: 'scheduled' },
        sort: { start_time: 1 },
        limit: 10
      });
      
      // Filter for relevance if user has roles
      let relevant = allEvents;
      if (user?.role_tags?.length > 0) {
         relevant = allEvents.filter(e => 
            !e.tags || e.tags.length === 0 || e.tags.some(t => user.role_tags.includes(t))
         );
      }
      
      // Fallback to all if no matches, take top 2
      return (relevant.length > 0 ? relevant : allEvents).slice(0, 2);
    },
    enabled: !!user
  });

  const getTimeRemaining = (dateStr) => {
     const diff = new Date(dateStr) - new Date();
     if (diff <= 0) return "00:00";
     const hours = Math.floor(diff / (1000 * 60 * 60));
     const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
     return `${hours.toString().padStart(2, '0')}H ${mins.toString().padStart(2, '0')}M`;
  };

  if (events.length === 0) {
     return (
        <div className={cn("h-full border border-orange-900/30 bg-zinc-950 flex items-center justify-center text-center", compact ? "p-4" : "p-6")}>
           <div className="space-y-2">
              <div className={cn("text-orange-900/50 uppercase tracking-widest font-black", compact ? "text-xl" : "text-4xl")}>NO SIGNAL</div>
              {!compact && <div className="text-orange-900/50 font-mono text-xs">LONG RANGE SCANNERS CLEAR</div>}
           </div>
        </div>
     );
  }

  // Compact View for Sidebars
  if (compact) {
     const nextEvent = events[0];
     const isFocused = nextEvent.event_type === 'focused';
     return (
        <div className={cn(
           "border bg-black p-4 flex flex-col items-center text-center relative overflow-hidden",
           isFocused ? "border-red-900/50" : "border-emerald-900/50"
        )}>
           <div className="text-[9px] font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", isFocused ? "bg-amber-500 animate-pulse" : "bg-zinc-700")} />
              NEXT OPERATION
           </div>
           <div className="text-lg font-black text-white uppercase leading-none mb-1 truncate max-w-full">
              {nextEvent.title}
           </div>
           <div className="text-xs font-mono font-bold text-zinc-400">
              T-{getTimeRemaining(nextEvent.start_time)}
           </div>
        </div>
     );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
       {events.map((event, idx) => {
          const isFocused = event.event_type === 'focused';
          const statusColor = isFocused ? "text-red-500" : "text-emerald-500";
          const glowColor = isFocused ? "shadow-[0_0_30px_rgba(239,68,68,0.15)]" : "shadow-[0_0_30px_rgba(16,185,129,0.15)]";
          
          return (
             <div key={event.id} className={cn(
                "relative overflow-hidden border bg-black p-6 flex flex-col items-center justify-center text-center group transition-all",
                isFocused ? "border-red-900/50" : "border-emerald-900/50",
                glowColor
             )}>
                {/* Header Bar */}
                <div className={cn(
                   "absolute top-0 left-0 right-0 h-1 flex items-center justify-center",
                   isFocused ? "bg-red-900/20" : "bg-emerald-900/20"
                )}>
                   <div className={cn("w-1/3 h-full", isFocused ? "bg-red-600" : "bg-emerald-600")} />
                </div>

                {/* Holographic Flicker Overlay */}
                <div className={cn(
                   "absolute inset-0 pointer-events-none opacity-[0.03] animate-pulse",
                   isFocused ? "bg-red-500" : "bg-emerald-500"
                )} />

                <div className="relative z-10 space-y-4 w-full">
                   <div className={cn("text-xs font-black tracking-[0.3em] uppercase opacity-70", statusColor)}>
                      {isFocused ? "/// COMBAT PROTOCOLS ///" : "/// CASUAL COMMS ///"}
                   </div>
                   
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                      {event.title}
                   </h3>
                   
                   <div className="inline-block px-4 py-1 bg-zinc-900/80 border border-zinc-800">
                      <span className={cn("font-mono text-xl md:text-2xl font-bold tabular-nums tracking-widest", statusColor)}>
                         T-{getTimeRemaining(event.start_time)}
                      </span>
                   </div>

                   <div className="text-xs text-zinc-400 flex items-center justify-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-[#ea580c]" />
                      <span className="font-mono">
                         {toLocalTime(event.start_time, 'HH:mm')} LCL
                      </span>
                   </div>
                   <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {toLocalTime(event.start_time, 'EEE, MMM d')}
                   </div>

                   <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
                      <span>{toLocalTime(event.start_time, 'yyyy-MM-dd')}</span>
                      <span className="text-zinc-700">|</span>
                      <span>{event.location || "CLASSIFIED"}</span>
                   </div>
                </div>
                
                {/* Corner Markers */}
                <div className={cn("absolute top-2 left-2 w-2 h-2 border-t border-l opacity-50", isFocused ? "border-red-500" : "border-emerald-500")} />
                <div className={cn("absolute top-2 right-2 w-2 h-2 border-t border-r opacity-50", isFocused ? "border-red-500" : "border-emerald-500")} />
                <div className={cn("absolute bottom-2 left-2 w-2 h-2 border-b border-l opacity-50", isFocused ? "border-red-500" : "border-emerald-500")} />
                <div className={cn("absolute bottom-2 right-2 w-2 h-2 border-b border-r opacity-50", isFocused ? "border-red-500" : "border-emerald-500")} />
             </div>
          );
       })}
    </div>
  );
}