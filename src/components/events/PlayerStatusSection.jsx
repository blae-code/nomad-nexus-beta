import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Activity, Radio } from "lucide-react";

const STATUS_OPTIONS = [
  { value: 'READY', label: 'READY', color: 'bg-emerald-500', border: 'border-emerald-500' },
  { value: 'IN_QUANTUM', label: 'Q-JUMP', color: 'bg-blue-500', border: 'border-blue-500' },
  { value: 'ENGAGED', label: 'ENGAGED', color: 'bg-red-500', border: 'border-red-500' },
  { value: 'RTB', label: 'RTB', color: 'bg-amber-500', border: 'border-amber-500' },
  { value: 'DOWN', label: 'DOWN', color: 'bg-zinc-100', border: 'border-zinc-100' },
];

export default function PlayerStatusSection({ eventId }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch all statuses for this event
  const { data: statuses } = useQuery({
    queryKey: ['player-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ 
        filter: { event_id: eventId },
        sort: { last_updated: -1 }
    }),
    initialData: []
  });

  // Fetch users for display
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const myStatus = statuses.find(s => s.user_id === currentUser?.id);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      if (myStatus) {
        return base44.entities.PlayerStatus.update(myStatus.id, {
          status: newStatus,
          last_updated: new Date().toISOString()
        });
      } else {
        return base44.entities.PlayerStatus.create({
          user_id: currentUser.id,
          event_id: eventId,
          status: newStatus,
          last_updated: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-statuses', eventId]);
    }
  });

  const getStatusColor = (statusVal) => {
    const opt = STATUS_OPTIONS.find(o => o.value === statusVal);
    return opt ? opt.color : 'bg-zinc-600';
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 mb-6">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <CardTitle className="text-sm font-bold text-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2 uppercase tracking-wider">
             <Activity className="w-4 h-4 text-blue-500" />
             Tactical Status
          </div>
          {myStatus && (
             <Badge variant="outline" className="border-zinc-800 text-zinc-400">
               {myStatus.status}
             </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        
        {/* Controls */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
           {STATUS_OPTIONS.map((opt) => (
             <button
               key={opt.value}
               onClick={() => updateStatusMutation.mutate(opt.value)}
               disabled={updateStatusMutation.isPending}
               className={cn(
                 "px-2 py-2 text-[10px] font-bold uppercase border rounded transition-all hover:scale-105",
                 myStatus?.status === opt.value 
                   ? `${opt.border} ${opt.color} text-black shadow-[0_0_10px_rgba(0,0,0,0.5)]`
                   : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
               )}
             >
               {opt.label}
             </button>
           ))}
        </div>

        {/* Roster */}
        <div className="space-y-2">
           <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Field Roster</h4>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {statuses.length === 0 ? (
                 <span className="text-xs text-zinc-700 italic col-span-full">No signals detected.</span>
              ) : (
                 statuses.map(status => {
                    const user = users.find(u => u.id === status.user_id);
                    const isMe = user?.id === currentUser?.id;
                    return (
                       <div key={status.id} className={cn(
                         "flex items-center gap-2 p-2 rounded border bg-zinc-900/30",
                         isMe ? "border-zinc-700" : "border-zinc-800/50"
                       )}>
                          <div className={cn("w-2 h-2 rounded-full shrink-0", getStatusColor(status.status))} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-300 truncate">
                              {user ? (user.rsi_handle || user.email) : 'Unknown'}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono">
                               {status.status}
                            </div>
                          </div>
                       </div>
                    );
                 })
              )}
           </div>
        </div>

      </CardContent>
    </Card>
  );
}