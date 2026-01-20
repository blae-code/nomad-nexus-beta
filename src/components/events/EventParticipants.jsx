import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from "@/components/ui/OpsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Swords, Crosshair, ShieldAlert, Box, Scan, User } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusChip from "@/components/status/StatusChip";
import { typographyClasses } from "@/components/utils/typography";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";

const ROLES = [
  { value: 'PILOT', icon: Crosshair, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900' },
  { value: 'GUNNER', icon: Swords, color: 'text-red-400', bg: 'bg-red-950/30 border-red-900' },
  { value: 'MEDIC', icon: ShieldAlert, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900' },
  { value: 'LOGISTICS', icon: Box, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-900' },
  { value: 'SCOUT', icon: Scan, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900' },
  { value: 'MARINE', icon: User, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-800' },
  { value: 'OTHER', icon: User, color: 'text-zinc-500', bg: 'bg-zinc-900/50 border-zinc-800' },
];

export default function EventParticipants({ eventId }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: statuses } = useQuery({
    queryKey: ['player-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }, '-last_updated', 100),
    initialData: []
  });

  const userIds = statuses.map(s => s.user_id).filter(Boolean);
  const { userById } = useUserDirectory(userIds.length > 0 ? userIds : null);

  const myStatus = statuses.find(s => s.user_id === currentUser?.id);

  const rsvpMutation = useMutation({
    mutationFn: async (role) => {
      if (myStatus) {
        return base44.entities.PlayerStatus.update(myStatus.id, {
          role: role,
          last_updated: new Date().toISOString()
        });
      } else {
        return base44.entities.PlayerStatus.create({
          user_id: currentUser.id,
          event_id: eventId,
          status: 'READY', // Default to READY when joining
          role: role,
          last_updated: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-statuses', eventId]);
    }
  });

  // Group by Role
   const participantsByRole = React.useMemo(() => {
     const grouped = {};
     ROLES.forEach(r => grouped[r.value] = []);

     statuses.forEach(status => {
       const role = status.role || 'OTHER';
       if (!grouped[role]) grouped[role] = [];
       const user = userById[status.user_id];
       if (user) grouped[role].push({ ...status, user });
     });
     return grouped;
   }, [statuses, userById]);

  const totalParticipants = statuses.length;

  return (
    <div className="space-y-6">
      {/* Summary / RSVP */}
      <OpsPanel>
         <OpsPanelHeader>
           <div className="flex justify-between items-center w-full">
             <OpsPanelTitle className="flex items-center gap-2">
               <Users className="w-5 h-5" /> Mission Roster
             </OpsPanelTitle>
             <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-zinc-300">
               {totalParticipants} OPERATIVES
             </Badge>
           </div>
         </OpsPanelHeader>
         <OpsPanelContent className="pt-4">
           {/* RSVP Action */}
           <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-950/50 rounded border border-zinc-800 border-dashed">
           <div className="flex-1">
             <div className={cn(typographyClasses.labelPrimary, "mb-1")}>
               {myStatus ? 'Update Your Role' : 'Join Operation'}
             </div>
             <p className={typographyClasses.descriptionSmall}>Select your primary role for this mission.</p>
           </div>
             <Select 
               value={myStatus?.role} 
               onValueChange={(val) => rsvpMutation.mutate(val)}
             >
               <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
                 <SelectValue placeholder="Select Role" />
               </SelectTrigger>
               <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                 {ROLES.map(role => (
                   <SelectItem key={role.value} value={role.value} className="focus:bg-zinc-800">
                     <div className="flex items-center gap-2">
                       <role.icon className={`w-3 h-3 ${role.color}`} />
                       {role.value}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* Summary Grid */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
              {ROLES.map(role => {
                 const count = participantsByRole[role.value]?.length || 0;
                 return (
                   <div key={role.value} className={`flex flex-col items-center p-2 rounded border ${count > 0 ? role.bg : 'bg-zinc-900/20 border-zinc-800/50 opacity-50'}`}>
                      <span className={cn("text-lg font-bold", role.color)}>{count}</span>
                      <span className={cn(typographyClasses.labelSecondary, "text-[9px]")}>{role.value}</span>
                   </div>
                 );
              })}
           </div>

           {/* Detailed List */}
           <div className="space-y-4">
             {ROLES.filter(r => participantsByRole[r.value]?.length > 0).map(role => (
               <div key={role.value}>
                 <h4 className={cn("flex items-center gap-2 mb-2", typographyClasses.labelPrimary, role.color)}>
                   <role.icon className="w-3 h-3" />
                   {role.value}S ({participantsByRole[role.value].length})
                 </h4>
                 <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                   {participantsByRole[role.value].map(participant => (
                     <div key={participant.id} className="flex items-center gap-2 p-2 rounded bg-zinc-950/50 border border-zinc-800/50">
                       <Avatar className="w-6 h-6">
                          <AvatarImage src={participant.user.avatar_url} />
                          <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                            {participant.user.rsi_handle ? participant.user.rsi_handle.substring(0,2).toUpperCase() : 'OP'}
                          </AvatarFallback>
                       </Avatar>
                       <div className="overflow-hidden">
                         <div className={cn(typographyClasses.callsignSmall, "truncate")}>
                           {participant.user.rsi_handle || participant.user.email}
                         </div>
                         <div className="mt-1">
                           <StatusChip status={participant.status} size="xs" className="border-0 bg-transparent p-0 h-auto" />
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
           </div>

         </OpsPanelContent>
         </OpsPanel>
         </div>
         );
         }