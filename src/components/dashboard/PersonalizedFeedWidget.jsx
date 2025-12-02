import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ShieldCheck, AlertCircle, Award, DollarSign, ArrowRight, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

export default function PersonalizedFeedWidget() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // 1. Fetch Role-Specific Events
  const { data: relevantEvents = [] } = useQuery({
    queryKey: ['feed-relevant-events', user?.id, user?.role_tags],
    queryFn: async () => {
      if (!user) return [];
      // Fetch upcoming events
      const events = await base44.entities.Event.list({
        filter: { status: 'scheduled' },
        sort: { start_time: 1 },
        limit: 20 // Fetch more to filter in JS
      });

      // Filter by role tags if user has them
      if (user.role_tags && user.role_tags.length > 0) {
        return events.filter(e => 
          // If event has tags, check overlap
          e.tags?.some(tag => user.role_tags.includes(tag))
        ).slice(0, 2); // Take top 2
      }
      
      // Fallback: return next 2 events if no specific matches
      return events.slice(0, 2);
    },
    enabled: !!user
  });

  // 2. Fetch Pending Payouts (Simulated by checking completed events user participated in)
  const { data: pendingPayouts = [] } = useQuery({
    queryKey: ['feed-payouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // 1. Get recent completed events
      const completedEvents = await base44.entities.Event.list({
        filter: { status: 'completed' },
        sort: { end_time: -1 },
        limit: 5
      });
      
      const payouts = [];
      for (const ev of completedEvents) {
        // 2. Check if user was there
        const status = await base44.entities.PlayerStatus.list({
          filter: { event_id: ev.id, user_id: user.id }
        });
        
        if (status.length > 0 && ev.auec_split_rules) {
           // 3. Check if user received money (Simulated: assume if no transaction found)
           // For simplicity, we'll just show the alert if they participated in a 'Paid' event type
           if (ev.tags?.includes("Industry") || ev.tags?.includes("Rescue")) {
             payouts.push(ev);
           }
        }
      }
      return payouts;
    },
    enabled: !!user
  });

  // 3. Scout Nomination Logic
  const scoutNominationStatus = React.useMemo(() => {
     if (!user || user.rank !== 'Scout') return null;
     
     const joinDate = new Date(user.created_date);
     const now = new Date();
     const monthsSinceJoin = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
     
     if (monthsSinceJoin >= 4) {
        return { ready: true };
     }
     return { ready: false, daysLeft: Math.ceil((4 - monthsSinceJoin) * 30) }; // Approx
  }, [user]);

  if (!user) return <Card className="h-full bg-zinc-900/50 border-zinc-800 animate-pulse" />;

  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900/50">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-orange-500" />
          Personalized Intelligence Feed
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        
        {/* Priority 1: Vagrant Onboarding */}
        {user.rank === 'Vagrant' && (
          <div className="p-4 bg-orange-950/20 border border-orange-900/50 rounded-sm flex items-start gap-4 group hover:bg-orange-950/30 transition-colors">
             <div className="p-2 bg-orange-900/20 rounded-full text-orange-500">
                <ShieldCheck className="w-6 h-6" />
             </div>
             <div className="flex-1">
                <h3 className="text-sm font-bold text-orange-100 uppercase tracking-wide mb-1">Status: Trial Period</h3>
                <p className="text-xs text-orange-200/70 mb-3 leading-relaxed">
                   You are currently under evaluation. To gain full membership, you must participate in voice comms during an active operation.
                </p>
                <Button size="sm" variant="outline" className="h-7 text-xs border-orange-800 text-orange-400 hover:bg-orange-950 hover:text-orange-200">
                   View Redscar Code
                </Button>
             </div>
          </div>
        )}

        {/* Priority 2: Pending Payouts */}
        {pendingPayouts.map(ev => (
           <div key={ev.id} className="p-3 bg-emerald-950/10 border border-emerald-900/30 rounded-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <DollarSign className="w-5 h-5 text-emerald-500" />
                 <div>
                    <div className="text-xs font-bold text-emerald-100 uppercase">Pending Payout Detected</div>
                    <div className="text-[10px] text-emerald-500/70">Op: {ev.title}</div>
                 </div>
              </div>
              <a href={createPageUrl('Treasury')}>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-400 hover:text-emerald-200">
                   Claim <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </a>
           </div>
        ))}

        {/* Priority 3: Scout Nomination */}
        {scoutNominationStatus && (
           <div className={cn("p-3 border rounded-sm flex items-center gap-3", scoutNominationStatus.ready ? "bg-indigo-950/20 border-indigo-900/50" : "bg-zinc-900/30 border-zinc-800")}>
              <Award className={cn("w-5 h-5", scoutNominationStatus.ready ? "text-indigo-400" : "text-zinc-600")} />
              <div>
                 <div className="text-xs font-bold text-zinc-200 uppercase">Voyager Nomination Status</div>
                 <div className="text-[10px] text-zinc-500 font-mono">
                    {scoutNominationStatus.ready 
                       ? <span className="text-indigo-400">READY FOR SUBMISSION</span> 
                       : `LOCKED: Approx ${scoutNominationStatus.daysLeft} days remaining`
                    }
                 </div>
              </div>
           </div>
        )}

        {/* Priority 4: Role-Specific Events */}
        {relevantEvents.length > 0 && (
           <div className="space-y-2">
              <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold flex items-center gap-2">
                 <Calendar className="w-3 h-3" />
                 Recommended Operations
              </div>
              {relevantEvents.map(event => (
                 <a 
                   key={event.id}
                   href={createPageUrl(`Event?id=${event.id}`)} 
                   className="flex flex-col gap-1 p-3 bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-600 transition-colors cursor-pointer group"
                 >
                    <div className="flex justify-between items-start">
                       <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{event.title}</span>
                       {event.tags?.map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-zinc-950 rounded text-zinc-500 border border-zinc-800">{t}</span>
                       ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                       <span>{new Date(event.start_time).toLocaleDateString()}</span>
                       <span>•</span>
                       <span>{new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                 </a>
              ))}
           </div>
        )}
        
        {/* Empty State */}
        {!user.rank && relevantEvents.length === 0 && pendingPayouts.length === 0 && (
           <div className="text-center py-10 text-zinc-600 text-xs italic">
              No immediate directives found. Stand by for orders.
           </div>
        )}

      </CardContent>
    </Card>
  );
}