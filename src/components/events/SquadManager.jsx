import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, GripVertical, UserPlus, AlertCircle, Star } from "lucide-react";
import { hasMinRank, canEditEvent } from "@/components/permissions";
import { cn } from "@/lib/utils";
import DutyAssignmentPanel from "@/components/events/DutyAssignmentPanel";

export default function SquadManager({ eventId }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch Data
  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const { data: squads } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  const { data: dutyAssignments = [] } = useQuery({
    queryKey: ['duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: playerStatuses } = useQuery({
    queryKey: ['player-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user.role === 'admin' || user.rank === 'Pioneer' || user.rank === 'Founder') {
        return base44.entities.User.list();
      }
      return [];
    },
    initialData: []
  });

  // Mutation for moving users
  const moveUserMutation = useMutation({
    mutationFn: async ({ statusId, newSquadId }) => {
      return base44.entities.PlayerStatus.update(statusId, {
        assigned_squad_id: newSquadId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-statuses', eventId]);
    }
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newSquadId = destination.droppableId === "unassigned" ? null : destination.droppableId;
    
    moveUserMutation.mutate({
      statusId: draggableId,
      newSquadId
    });
  };

  // Organize Data
  const organizedData = React.useMemo(() => {
    const map = { unassigned: [] };
    const dutyMap = new Map();
    
    // Build duty map
    dutyAssignments.forEach(d => {
      if (!dutyMap.has(d.unit_id)) dutyMap.set(d.unit_id, []);
      dutyMap.get(d.unit_id).push(d);
    });

    squads.forEach(s => {
      map[s.id] = [];
      // Attach duty assignments to squad
      map[s.id].duties = dutyMap.get(s.id) || [];
    });

    playerStatuses.forEach(status => {
      const user = users.find(u => u.id === status.user_id);
      if (!user) return;
      
      const item = { ...status, user };
      if (status.assigned_squad_id && map[status.assigned_squad_id]) {
        map[status.assigned_squad_id].push(item);
      } else {
        map.unassigned.push(item);
      }
    });

    return map;
  }, [squads, playerStatuses, users, dutyAssignments]);

  const canEdit = canEditEvent(currentUser, event);

  // Render Individual Member Card
  const MemberCard = ({ member, index }) => (
    <Draggable draggableId={member.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
             "flex items-center gap-3 p-2 rounded-md border mb-2 bg-zinc-900/80 transition-colors",
             snapshot.isDragging ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] z-50" : "border-zinc-800 hover:border-zinc-700",
             !canEdit && "cursor-default"
          )}
        >
           {canEdit && <GripVertical className="w-4 h-4 text-zinc-600" />}
           <Avatar className="w-6 h-6 border border-zinc-700">
              <AvatarImage src={member.user.avatar_url} />
              <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">
                 {member.user.rsi_handle?.substring(0,2).toUpperCase()}
              </AvatarFallback>
           </Avatar>
           <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-200 truncate">
                 {member.user.rsi_handle || member.user.full_name}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase flex items-center gap-2">
                 <span>{member.role}</span>
                 {member.status !== 'READY' && (
                    <span className={cn(
                       "w-1.5 h-1.5 rounded-full",
                       member.status === 'OFFLINE' ? "bg-zinc-600" : "bg-red-500"
                    )} />
                 )}
              </div>
           </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-black text-zinc-100 uppercase tracking-wide flex items-center gap-2 font-mono">
            <Shield className="w-5 h-5 text-emerald-500" />
            Tactical Assignments
         </h3>
         {canEdit && (
            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500 bg-zinc-900/50">
               DRAG TO REASSIGN
            </Badge>
         )}
      </div>

      {/* Duty Assignment Panel */}
      {canEdit && <DutyAssignmentPanel eventId={eventId} />}

      <DragDropContext onDragEnd={onDragEnd}>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* Unassigned Column */}
            <div className="flex flex-col gap-2">
               <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                     <AlertCircle className="w-3 h-3" /> Unassigned
                  </span>
                  <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-400 border-none">
                     {organizedData.unassigned.length}
                  </Badge>
               </div>
               <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                     <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                           "flex-1 bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800 p-2 min-h-[150px]",
                           snapshot.isDraggingOver && "bg-zinc-900/50 border-zinc-700"
                        )}
                     >
                        {organizedData.unassigned.map((member, index) => (
                           <MemberCard key={member.id} member={member} index={index} />
                        ))}
                        {provided.placeholder}
                        {organizedData.unassigned.length === 0 && (
                           <div className="h-full flex items-center justify-center text-[10px] text-zinc-700 italic">
                              All units assigned
                           </div>
                        )}
                     </div>
                  )}
               </Droppable>
            </div>

            {/* Squad Columns */}
            {squads.map(squad => {
               const squadDuties = organizedData[squad.id]?.duties || [];
               const leaders = squadDuties.filter(d => ['Fleet Commander', 'Wing Lead', 'Squad Lead'].includes(d.duty_role));
               
               return (
               <div key={squad.id} className="flex flex-col gap-2">
                  <div className="space-y-1">
                     <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider truncate">
                              {squad.name}
                           </span>
                           <Badge variant="outline" className={cn(
                              "text-[9px] px-1.5 py-0",
                              squad.hierarchy_level === 'fleet' && "border-amber-700 text-amber-400",
                              squad.hierarchy_level === 'wing' && "border-cyan-700 text-cyan-400",
                              (!squad.hierarchy_level || squad.hierarchy_level === 'squad') && "border-emerald-700 text-emerald-400"
                           )}>
                              {squad.hierarchy_level || 'squad'}
                           </Badge>
                        </div>
                        <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-400 border-none">
                           {organizedData[squad.id].length}
                        </Badge>
                     </div>
                     {leaders.length > 0 && (
                        <div className="px-1 flex items-center gap-2">
                           {leaders.map(duty => {
                              const user = users.find(u => u.id === duty.user_id);
                              return user ? (
                                 <div key={duty.id} className="flex items-center gap-1 text-[10px] text-amber-400">
                                    <Star className="w-2.5 h-2.5 fill-amber-500" />
                                    <span className="font-mono">{user.callsign || user.rsi_handle}</span>
                                 </div>
                              ) : null;
                           })}
                        </div>
                     )}
                  </div>
                  <Droppable droppableId={squad.id}>
                     {(provided, snapshot) => (
                        <div
                           ref={provided.innerRef}
                           {...provided.droppableProps}
                           className={cn(
                              "flex-1 bg-zinc-900/30 rounded-lg border border-zinc-800 p-2 min-h-[150px]",
                              snapshot.isDraggingOver && "bg-zinc-900/60 border-emerald-500/30"
                           )}
                        >
                           {organizedData[squad.id].map((member, index) => (
                              <MemberCard key={member.id} member={member} index={index} />
                           ))}
                           {provided.placeholder}
                           {organizedData[squad.id].length === 0 && (
                              <div className="h-full flex items-center justify-center text-[10px] text-zinc-700 italic">
                                 No operatives
                              </div>
                           )}
                        </div>
                     )}
                     </Droppable>
                     </div>
                     );
                     })}

         </div>
      </DragDropContext>
    </div>
  );
}