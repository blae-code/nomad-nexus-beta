import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Radio } from "lucide-react";

export default function CommsEventSelector({ selectedEventId, onSelect }) {
  const { data: events } = useQuery({
    queryKey: ['ops-events'],
    queryFn: async () => {
      return base44.entities.Event.list({ 
        filter: {},
        sort: { start_time: 1 },
        limit: 10
      });
    },
    initialData: []
  });

  // Filter in memory for active/upcoming
  const activeEvents = events.filter(e => {
    const end = e.end_time ? new Date(e.end_time) : new Date(new Date(e.start_time).getTime() + 4 * 60 * 60 * 1000);
    return end > new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // Ended less than 24h ago or future
  });

  return (
    <div className="w-full">
      <Select value={selectedEventId} onValueChange={onSelect}>
        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 h-12">
           <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${selectedEventId ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <SelectValue placeholder="Select Operation Signal..." />
           </div>
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          {activeEvents.length === 0 ? (
             <SelectItem value="none" disabled>No Active Signals</SelectItem>
          ) : (
             activeEvents.map(event => (
               <SelectItem key={event.id} value={event.id}>
                 <div className="flex items-center gap-2">
                   <span className="font-mono text-zinc-500">[{event.start_time ? new Date(event.start_time).toLocaleDateString() : 'TBD'}]</span>
                   <span className="font-bold">{event.title}</span>
                 </div>
               </SelectItem>
             ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}