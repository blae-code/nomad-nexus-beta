import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatusChip, { STATUS_CONFIG } from "@/components/status/StatusChip";
import { Users, AlertTriangle } from "lucide-react";

export default function FleetHierarchy({ eventId }) {
  // Fetch Squads
  const { data: squads } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  // Fetch Squad Members
  const { data: memberships } = useQuery({
    queryKey: ['all-squad-members'],
    queryFn: () => base44.entities.SquadMember.list(),
    initialData: []
  });

  // Fetch Users
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Fetch Statuses for Event
  const { data: statuses } = useQuery({
    queryKey: ['event-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  // Process Data
  const hierarchy = React.useMemo(() => {
    const userMap = new Map(users.map(u => [u.id, u]));
    const statusMap = new Map(statuses.map(s => [s.user_id, s]));
    
    // Group users by squad
    const squadGroups = squads.map(squad => {
      const squadMemberIds = memberships
        .filter(m => m.squad_id === squad.id)
        .map(m => m.user_id);
      
      const members = squadMemberIds
        .map(id => {
          const user = userMap.get(id);
          if (!user) return null;
          return {
            ...user,
            status: statusMap.get(id)?.status || 'OFFLINE',
            role: statusMap.get(id)?.role || 'OTHER'
          };
        })
        .filter(Boolean)
        // Sort by status priority (Distress/Down first)
        .sort((a, b) => {
             const priority = { DISTRESS: 0, DOWN: 1, ENGAGED: 2, IN_QUANTUM: 3, READY: 4, RTB: 5, OFFLINE: 6 };
             return (priority[a.status] || 99) - (priority[b.status] || 99);
        });

      return {
        ...squad,
        members,
        stats: {
          total: members.length,
          down: members.filter(m => m.status === 'DOWN' || m.status === 'DISTRESS').length,
          ready: members.filter(m => m.status === 'READY' || m.status === 'ENGAGED').length
        }
      };
    });

    // Find unassigned users who have a status in this event
    const assignedUserIds = new Set(memberships.map(m => m.user_id));
    const unassignedMembers = statuses
      .filter(s => !assignedUserIds.has(s.user_id))
      .map(s => {
         const user = userMap.get(s.user_id);
         if (!user) return null;
         return {
            ...user,
            status: s.status,
            role: s.role
         };
      })
      .filter(Boolean);

    if (unassignedMembers.length > 0) {
       squadGroups.push({
          id: 'unassigned',
          name: 'Unassigned / Aux',
          members: unassignedMembers,
          stats: {
             total: unassignedMembers.length,
             down: unassignedMembers.filter(m => m.status === 'DOWN' || m.status === 'DISTRESS').length,
             ready: unassignedMembers.filter(m => m.status === 'READY' || m.status === 'ENGAGED').length
          }
       });
    }

    return squadGroups;
  }, [squads, memberships, users, statuses]);

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center gap-2 mb-4 px-1">
          <Users className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-bold uppercase text-zinc-300 tracking-widest">Fleet Assignment & Status</h3>
       </div>

       <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
             {hierarchy.map(group => (
                <Card key={group.id} className={`bg-zinc-950 border-zinc-800 p-3 ${group.stats.down > 0 ? 'border-red-900/30 bg-red-950/5' : ''}`}>
                   <div className="flex justify-between items-center mb-3 border-b border-zinc-900 pb-2">
                      <div className="font-bold text-zinc-200 uppercase tracking-wider text-xs flex items-center gap-2">
                         {group.name}
                         {group.stats.down > 0 && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                         <span className="text-emerald-500">{group.stats.ready} RDY</span> / <span className="text-red-500">{group.stats.down} DWN</span> / {group.stats.total}
                      </div>
                   </div>
                   
                   <div className="space-y-1.5">
                      {group.members.length === 0 ? (
                         <div className="text-[10px] text-zinc-600 italic">No personnel assigned</div>
                      ) : (
                         group.members.map(member => (
                            <div key={member.id} className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded-sm border border-zinc-800/50">
                               <div className="flex items-center gap-2 overflow-hidden">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${member.status === 'OFFLINE' ? 'bg-zinc-700' : 'bg-emerald-500'}`} />
                                  <span className="text-xs font-bold text-zinc-300 truncate">{member.rsi_handle || member.full_name}</span>
                               </div>
                               <StatusChip status={member.status} size="xs" showLabel={true} />
                            </div>
                         ))
                      )}
                   </div>
                </Card>
             ))}
          </div>
       </ScrollArea>
    </div>
  );
}