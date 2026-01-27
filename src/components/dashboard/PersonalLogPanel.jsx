import React from "react";
import { Button } from "@/components/ui/button";
import { Award, ShieldCheck, DollarSign, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

export default function PersonalLogPanel({ user }) {
  // 1. Vagrant Check
  const isVagrant = user?.rank === 'Vagrant';

  // 2. Fetch Pending Payouts (limit to 5, no polling)
  const { data: pendingPayouts = [] } = useQuery({
    queryKey: ['feed-payouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const completedEvents = await base44.entities.Event.filter(
        { status: 'completed' },
        '-end_time',
        5 // Limit to 5
      );
      
      const payouts = [];
      for (const ev of completedEvents.slice(0, 5)) { // Safety limit
        const status = await base44.entities.PlayerStatus.filter({
          event_id: ev.id,
          user_id: user.id
        });
        if (status.length > 0 && (ev.tags?.includes("Industry") || ev.tags?.includes("Rescue"))) {
           payouts.push(ev);
        }
      }
      return payouts;
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: false,
    gcTime: 60000
  });

  // 3. Scout Nomination Logic
  const scoutNominationStatus = React.useMemo(() => {
     if (!user || user.rank !== 'Scout') return null;
     const joinDate = new Date(user.created_date);
     const now = new Date();
     const monthsSinceJoin = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
     if (monthsSinceJoin >= 4) return { ready: true };
     return { ready: false, daysLeft: Math.ceil((4 - monthsSinceJoin) * 30) };
  }, [user]);

  // If nothing to show
  if (!isVagrant && pendingPayouts.length === 0 && !scoutNominationStatus) {
     return null;
  }

  return (
    <div className="border border-orange-900/30 bg-zinc-950/80 h-full flex flex-col overflow-hidden">
       <div className="bg-orange-700 text-white px-3 py-1 flex items-center justify-between shrink-0">
         <span className="text-[10px] font-black uppercase tracking-widest">PERSONAL_LOG</span>
         <span className="text-[9px] font-mono opacity-80">ACTION_REQUIRED</span>
      </div>
      
      <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
        
        {/* Vagrant Alert */}
        {isVagrant && (
          <div className="p-3 border border-orange-900/50 bg-orange-950/10 flex gap-3 items-start">
             <ShieldCheck className="w-5 h-5 text-orange-500 mt-0.5" />
             <div>
                <div className="text-xs font-bold text-orange-200 uppercase">Status: Trial Period</div>
                <div className="text-[10px] text-orange-300/70 mb-2 leading-tight">
                   Mandatory voice participation required for promotion.
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[9px] border-orange-800 text-orange-400 bg-transparent hover:bg-orange-900 hover:text-orange-200">
                   REVIEW CODE
                </Button>
             </div>
          </div>
        )}

        {/* Payouts */}
        {pendingPayouts.map(ev => (
           <div key={ev.id} className="flex items-center justify-between p-2 border border-emerald-900/30 bg-emerald-950/5">
              <div className="flex items-center gap-2">
                 <DollarSign className="w-4 h-4 text-emerald-500" />
                 <div className="text-[10px] uppercase text-emerald-200 font-bold">Pending Payout: {ev.title}</div>
              </div>
              <a href={createPageUrl('Treasury')}>
                 <ArrowRight className="w-4 h-4 text-emerald-500 cursor-pointer hover:translate-x-1 transition-transform" />
              </a>
           </div>
        ))}

        {/* Scout Nomination */}
        {scoutNominationStatus && (
           <div className={cn("p-2 border flex items-center gap-3", scoutNominationStatus.ready ? "border-indigo-500/50 bg-indigo-950/10" : "border-zinc-800 bg-zinc-900/30")}>
              <Award className={cn("w-4 h-4", scoutNominationStatus.ready ? "text-indigo-400" : "text-zinc-600")} />
              <div className="flex-1">
                 <div className="text-[10px] font-bold text-zinc-300 uppercase">Nomination Protocol</div>
                 <div className="text-[9px] font-mono text-zinc-500">
                    {scoutNominationStatus.ready 
                       ? <span className="text-indigo-400 animate-pulse">READY FOR SUBMISSION</span> 
                       : `LOCKED (${scoutNominationStatus.daysLeft} DAYS)`
                    }
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}