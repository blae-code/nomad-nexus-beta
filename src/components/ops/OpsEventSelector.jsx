import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OpsEventSelector({ selectedEventId, onSelect }) {
  const { data: events } = useQuery({
    queryKey: ['active-events'],
    queryFn: async () => {
      // Fetch events starting recently or in future
      // For simplicity, just fetching all and sorting by date, filtering in JS for "Active/Upcoming"
      const all = await base44.entities.Event.list({ sort: { start_time: 1 } });
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return all.filter(e => new Date(e.end_time || e.start_time) > yesterday);
    },
    initialData: []
  });

  return (
    <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
      <CardHeader className="pb-2 border-b border-zinc-800">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-500" />
          Active Operations
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-2 space-y-2">
          {events.length === 0 && (
             <div className="p-4 text-center text-xs text-zinc-600 font-mono">NO ACTIVE SIGNALS</div>
          )}
          {events.map(event => (
            <div
              key={event.id}
              onClick={() => onSelect(event)}
              className={cn(
                "p-3 rounded cursor-pointer border transition-all group",
                selectedEventId === event.id 
                  ? "bg-zinc-900 border-red-900/50 shadow-[0_0_15px_rgba(127,29,29,0.2)]" 
                  : "bg-zinc-950 border-zinc-900 hover:bg-zinc-900 hover:border-zinc-800"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "font-bold text-sm truncate",
                  selectedEventId === event.id ? "text-red-400" : "text-zinc-300 group-hover:text-zinc-100"
                )}>
                  {event.title}
                </span>
                {selectedEventId === event.id && <ChevronRight className="w-3 h-3 text-red-500" />}
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <Badge variant="outline" className={cn(
                   "text-[9px] h-4 px-1 rounded-sm border-zinc-800",
                   event.event_type === 'focused' ? "text-amber-500 bg-amber-950/10" : "text-emerald-500 bg-emerald-950/10"
                )}>
                  {event.event_type.toUpperCase()}
                </Badge>
                <span>{new Date(event.start_time).toLocaleDateString()}</span>
                <span>{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}