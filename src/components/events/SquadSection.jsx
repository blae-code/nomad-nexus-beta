import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";

export default function SquadSection({ eventId }) {
  // Fetch all squads
  const { data: squads } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  // Fetch all squad members
   const { data: members } = useQuery({
     queryKey: ['squad-members'],
     queryFn: () => base44.entities.SquadMember.list(),
     initialData: []
   });

   const memberIds = members.map(m => m.user_id).filter(Boolean);
   const { userById } = useUserDirectory(memberIds.length > 0 ? memberIds : null);

   const getSquadMembers = (squadId) => {
     const squadMemberRecords = members.filter(m => m.squad_id === squadId);
     return squadMemberRecords.map(record => {
       const user = userById[record.user_id];
       return { ...record, user };
     }).filter(m => m.user); // Filter out if user not found
   };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wide flex items-center gap-2">
        <Shield className="w-5 h-5 text-zinc-500" />
        Deployments
      </h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {squads.map(squad => (
          <Card key={squad.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-zinc-200">{squad.name}</CardTitle>
                {squad.is_invite_only && <Badge variant="secondary" className="text-[10px]">INVITE ONLY</Badge>}
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getSquadMembers(squad.id).length === 0 ? (
                     <span className="text-xs text-zinc-600 italic">No operatives assigned.</span>
                  ) : (
                    getSquadMembers(squad.id).map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-zinc-950/50 pr-3 rounded-full border border-zinc-800/50">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.user.avatar_url} />
                          <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400">
                            {member.user.rsi_handle ? member.user.rsi_handle.substring(0,2).toUpperCase() : 'OP'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-zinc-300 font-medium">
                          {member.user.rsi_handle || member.user.email}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}