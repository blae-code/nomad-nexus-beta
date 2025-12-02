import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OpsSquadPanel({ eventId }) {
  // Fetch squads, members, users, and statuses
  const { data: squads } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  const { data: members } = useQuery({
    queryKey: ['squad-members'],
    queryFn: () => base44.entities.SquadMember.list(),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: statuses } = useQuery({
    queryKey: ['ops-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ filter: { event_id: eventId } }),
    enabled: !!eventId,
    initialData: []
  });

  // Organize Data
  const squadRosters = React.useMemo(() => {
    // Map statuses to users for quick lookup
    const statusMap = new Map(statuses.map(s => [s.user_id, s]));
    
    // Group users by squad based on SquadMember
    const squadsWithMembers = squads.map(squad => {
      const squadMembers = members.filter(m => m.squad_id === squad.id);
      const activePersonnel = squadMembers.map(m => {
        const user = users.find(u => u.id === m.user_id);
        if (!user) return null;
        const status = statusMap.get(user.id);
        // Only include if they have a status for this event OR are in the squad (optional: only show if they have status?)
        // Prompt says "Participants per squad", usually implies people who RSVPed.
        // Let's show people who have RSVPed/Status AND are in the squad.
        // Also need to handle "Freelancers" (people with status but no squad or squad not in this list)
        return { user, member: m, status };
      }).filter(p => p && p.status); // Only show those involved in the event

      return {
        ...squad,
        personnel: activePersonnel
      };
    });

    // Add "Freelancers / Unassigned" group
    const assignedUserIds = new Set(members.map(m => m.user_id));
    const freelancers = statuses.filter(s => !assignedUserIds.has(s.user_id)).map(s => {
      const user = users.find(u => u.id === s.user_id);
      return { user, member: null, status: s };
    }).filter(p => p.user);

    if (freelancers.length > 0) {
      squadsWithMembers.push({
        id: 'freelancers',
        name: 'Auxiliary / Freelancers',
        personnel: freelancers,
        isAux: true
      });
    }

    return squadsWithMembers.filter(s => s.personnel.length > 0);
  }, [squads, members, users, statuses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {squadRosters.length === 0 && (
          <div className="col-span-full text-center p-10 text-zinc-600 border border-dashed border-zinc-800 rounded bg-zinc-900/20">
             Waiting for deployment signatures...
          </div>
       )}
       {squadRosters.map(squad => (
         <Card key={squad.id} className="bg-zinc-900 border-zinc-800 h-fit">
            <CardHeader className="pb-2 border-b border-zinc-800/50 flex flex-row items-center justify-between">
               <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                 <Shield className="w-3 h-3" /> {squad.name}
               </CardTitle>
               <Badge variant="secondary" className="bg-zinc-950 text-zinc-500 border-zinc-800">
                  {squad.personnel.length} UNITS
               </Badge>
            </CardHeader>
            <CardContent className="p-2">
               <div className="space-y-1">
                  {squad.personnel.map(p => (
                     <div key={p.user.id} className="flex items-center gap-2 p-2 rounded bg-zinc-950/30 border border-zinc-900 hover:border-zinc-700 transition-colors">
                        <Avatar className="w-6 h-6 border border-zinc-800">
                           <AvatarImage src={p.user.avatar_url} />
                           <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-500">
                              {p.user.rsi_handle ? p.user.rsi_handle.slice(0,2).toUpperCase() : 'OP'}
                           </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-zinc-300 truncate">
                                 {p.user.rsi_handle || p.user.email}
                              </span>
                              <Badge className={cn(
                                 "text-[9px] h-4 px-1",
                                 p.status.status === 'READY' ? "bg-emerald-950 text-emerald-500 border-emerald-900" :
                                 p.status.status === 'DOWN' ? "bg-red-950 text-red-500 border-red-900 animate-pulse" :
                                 "bg-zinc-800 text-zinc-500"
                              )}>
                                 {p.status.status}
                              </Badge>
                           </div>
                           <div className="flex justify-between items-center mt-0.5">
                              <span className="text-[9px] text-zinc-500 uppercase">{p.status.role}</span>
                              {p.member?.role_in_squad && (
                                 <span className="text-[9px] text-zinc-600 italic">{p.member.role_in_squad}</span>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </CardContent>
         </Card>
       ))}
    </div>
  );
}