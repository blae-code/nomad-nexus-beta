import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Calendar, Crosshair, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function PersonalActivityWidget() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myEvents = [] } = useQuery({
    queryKey: ['my-upcoming-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Fetch events where user is participant or all future events for now
      // Ideally we'd filter by participation, but for now let's show upcoming events
      return base44.entities.Event.filter({ status: 'scheduled' }, 'start_time', 5);
    },
    enabled: !!user
  });

  const { data: myStatus } = useQuery({
    queryKey: ['my-active-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const statuses = await base44.entities.PlayerStatus.filter({ user_id: user.id }, '-last_updated', 1);
      return statuses[0] || null;
    },
    enabled: !!user
  });

  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden relative">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900/50">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-500" />
          Operative Status
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Current Status Block */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-2 opacity-20">
              <Crosshair className="w-16 h-16 text-zinc-500" />
           </div>
           <div className="relative z-10">
              <div className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Current Designation</div>
              <div className="text-xl font-black text-white tracking-tighter uppercase">
                 {myStatus ? myStatus.status : "OFFLINE"}
              </div>
              <div className="text-xs font-mono text-orange-500 mt-1">
                 {myStatus ? `ROLE: ${myStatus.role}` : "NO ACTIVE ASSIGNMENT"}
              </div>
           </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="space-y-2">
           <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Mission Schedule
           </div>
           <div className="space-y-1">
              {myEvents.length === 0 ? (
                 <div className="p-3 text-center border border-dashed border-zinc-800 text-zinc-600 text-xs italic">
                    No scheduled ops.
                 </div>
              ) : (
                 myEvents.map(event => (
                    <a 
                      key={event.id} 
                      href={createPageUrl(`Event?id=${event.id}`)}
                      className="block p-2 bg-zinc-900/30 hover:bg-zinc-800 border-l-2 border-transparent hover:border-orange-500 transition-all group"
                    >
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{event.title}</span>
                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">
                             {new Date(event.start_time).toLocaleDateString()}
                          </span>
                       </div>
                       <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                    </a>
                 ))
              )}
           </div>
        </div>
      </CardContent>
    </Card>
  );
}