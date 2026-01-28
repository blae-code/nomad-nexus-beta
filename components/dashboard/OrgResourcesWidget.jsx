import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sword, Calendar, Youtube, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function OrgResourcesWidget() {
  // 1. Fetch Next Bonfire Meeting
  const { data: nextMeeting } = useQuery({
    queryKey: ['next-bonfire'],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ status: 'scheduled' }, 'start_time');
      // Find first event with 'Bonfire' in title
      return events.find(e => e.title.toLowerCase().includes('bonfire')) || null;
    }
  });

  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900/50">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-500" />
          Org Resources
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* Armory Request */}
        <div className="space-y-2">
           <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold flex items-center gap-2">
              <Sword className="w-3 h-3" />
              Logistics & Armory
           </div>
           <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-sm space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                 Submit equipment requisition forms for upcoming operations. Approval required for heavy ordnance.
              </p>
              <a href={createPageUrl('Treasury')} className="block">
                 <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 h-8">
                    Open Requisition Form
                 </Button>
              </a>
           </div>
        </div>

        {/* Next Meeting */}
        <div className="space-y-2">
           <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Ritual Bonfire
           </div>
           <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-sm">
              {nextMeeting ? (
                 <div className="space-y-2">
                    <div className="flex justify-between items-start">
                       <div className="text-sm font-bold text-white">{nextMeeting.title}</div>
                       <div className="px-1.5 py-0.5 bg-blue-950/30 text-blue-400 text-[9px] border border-blue-900 rounded">MONTHLY</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-900">
                       <div>
                          <div className="text-zinc-600 mb-0.5">LOCAL</div>
                          <div className="text-zinc-300">{nextMeeting.start_time ? new Date(nextMeeting.start_time).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'TBD'}</div>
                       </div>
                       <div>
                          <div className="text-zinc-600 mb-0.5">UTC</div>
                          <div className="text-zinc-300">{new Date(nextMeeting.start_time).toUTCString().split(' ').slice(0, 5).join(' ')}</div>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-2">
                    <div className="text-xs text-zinc-500 italic">No Bonfire scheduled.</div>
                    <div className="text-[9px] text-zinc-700 mt-1 font-mono">CHECK DISCORD ANNOUNCEMENTS</div>
                 </div>
              )}
           </div>
        </div>

        {/* Media Highlights */}
        <div className="space-y-2">
           <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold flex items-center gap-2">
              <Youtube className="w-3 h-3" />
              Comms Relay
           </div>
           <a href="https://youtube.com" target="_blank" rel="noreferrer" className="block group cursor-pointer">
              <div className="relative aspect-video bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden">
                 {/* Placeholder Image since I can't fetch real YouTube thumbs without API key */}
                 <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                    <Youtube className="w-12 h-12 text-zinc-700 group-hover:text-red-600 transition-colors" />
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 border-t border-zinc-800">
                    <div className="text-[10px] text-zinc-300 font-medium truncate group-hover:text-white transition-colors flex items-center gap-1">
                       Latest Operation Highlights <ExternalLink className="w-3 h-3 opacity-50" />
                    </div>
                 </div>
              </div>
           </a>
        </div>

      </CardContent>
    </Card>
  );
}

function Monitor(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}