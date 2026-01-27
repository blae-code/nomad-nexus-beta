import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CommsEventSelector({ selectedEventId, onSelect }) {
  const { data: events } = useQuery({
    queryKey: ['ops-events'],
    queryFn: async () => {
      try {
        return await base44.entities.Event.filter({}, 'start_time', 10);
      } catch (error) {
        console.error('[EVENTSEL] Event fetch error:', error);
        return [];
      }
    },
    initialData: []
  });

  // Filter in memory for active/upcoming
  const activeEvents = (events || []).filter(e => {
    if (!e?.start_time) return false;
    const end = e.end_time ? new Date(e.end_time) : new Date(new Date(e.start_time).getTime() + 4 * 60 * 60 * 1000);
    return end > new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // Ended less than 24h ago or future
  });

  // Safety: ensure we have valid events with IDs before rendering
  const validEvents = activeEvents.filter(e => {
    if (!e || !e.id) return false;
    const idStr = String(e.id).trim();
    return idStr !== '' && idStr !== 'undefined' && idStr !== 'null';
  });

  return (
    <div className="w-full">
      <Select value={selectedEventId ?? "none"} onValueChange={(val) => onSelect(val === "none" ? null : val)}>
        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 h-12">
           <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${selectedEventId ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <SelectValue placeholder="Select Operation Signal..." />
           </div>
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <SelectItem value="none">No Operation Selected</SelectItem>
          {validEvents.length > 0 ? validEvents.map(event => {
            const eventId = String(event.id ?? '').trim();
            if (!eventId || eventId === 'undefined' || eventId === 'null') return null;

            return (
              <SelectItem key={eventId} value={eventId}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-500">[{event.start_time ? new Date(event.start_time).toLocaleDateString() : 'TBD'}]</span>
                  <span className="font-bold">{event.title}</span>
                </div>
              </SelectItem>
            );
          }).filter(Boolean) : (
            <SelectItem value="placeholder" disabled>No active operations</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}