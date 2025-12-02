import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Radio, Shield, Activity, Users, RadioReceiver, ScrollText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hasMinRank } from "@/components/permissions";

function CommsLog({ eventId }) {
  const { data: messages } = useQuery({
    queryKey: ['comms-messages', eventId],
    queryFn: () => base44.entities.Message.list({ 
      sort: { created_date: -1 }, 
      limit: 50 
    }),
    refetchInterval: 5000
  });

  const logs = React.useMemo(() => {
    if (!messages) return [];
    return messages
      .filter(m => m.content.includes('[COMMS LOG]'))
      .slice(0, 6);
  }, [messages]);

  return (
    <div className="space-y-3 pt-4 border-t border-zinc-800">
      <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2">
         <ScrollText className="w-3 h-3" />
         Signal Log (Recent)
      </div>
      <div className="space-y-2">
         {logs.length === 0 ? (
            <div className="text-[10px] text-zinc-700 italic pl-2">No recent traffic recorded.</div>
         ) : (
            logs.map(log => (
               <div key={log.id} className="text-[10px] font-mono text-zinc-400 pl-2 border-l border-zinc-800">
                  <span className="text-emerald-700 opacity-70 mr-2">
                    {new Date(log.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                  </span>
                  <span className="text-zinc-300">{log.content.replace(/\[COMMS LOG\]|Tx on|: \*\*SIMULATED TRANSMISSION\*\*/g, '').trim()}</span>
               </div>
            ))
         )}
      </div>
    </div>
  );
}

function NetRoster({ net }) {
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: squadMembers } = useQuery({
    queryKey: ['squad-members', net.linked_squad_id],
    queryFn: () => net.linked_squad_id ? base44.entities.SquadMember.list({ squad_id: net.linked_squad_id }) : [],
    enabled: !!net.linked_squad_id,
    initialData: []
  });

  // Filter users relevant to this net
  const participants = React.useMemo(() => {
    if (!net || !allUsers.length) return [];

    // 1. If linked squad, show squad members
    if (net.linked_squad_id) {
       const memberIds = squadMembers.map(m => m.user_id);
       return allUsers.filter(u => memberIds.includes(u.id));
    }

    // 2. If command net, show high ranking
    if (net.type === 'command') {
       return allUsers.filter(u => hasMinRank(u, net.min_rank_to_tx)); // Show those who can talk
    }

    // 3. Otherwise show empty or maybe online users (too broad for now, returning generic placeholders if empty)
    return [];
  }, [net, allUsers, squadMembers]);

  return (
    <div className="space-y-3">
       <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800">
          <Users className="w-3 h-3" />
          Active Personnel ({participants.length})
       </div>
       
       {participants.length === 0 ? (
         <div className="text-center py-8 text-zinc-600 text-xs italic">
           {net.type === 'general' ? "Open Frequency - Monitoring All Stations" : "No active carrier signal detected."}
         </div>
       ) : (
         <div className="grid grid-cols-1 gap-2">
           {participants.map(user => (
             <div key={user.id} className="flex items-center justify-between bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <div>
                    <div className="text-sm text-zinc-300 font-bold">{user.rsi_handle || user.full_name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{user.rank}</div>
                  </div>
               </div>
               {hasMinRank(user, net.min_rank_to_tx) && (
                 <Mic className="w-3 h-3 text-zinc-600" />
               )}
             </div>
           ))}
         </div>
       )}
    </div>
  );
}

export default function ActiveNetPanel({ net, user, eventId }) {
  const [isTransmitting, setIsTransmitting] = React.useState(false);
  const queryClient = useQueryClient();

  const canTx = React.useMemo(() => {
    if (!user || !net) return false;
    return hasMinRank(user, net.min_rank_to_tx);
  }, [user, net]);

  const pttMutation = useMutation({
    mutationFn: async () => {
      // Create log message
      // Assuming we find/create a log channel for this event
      // For now, we'll just create a message with a specific convention or fetch a system channel
      // Let's use a 'fake' channel ID for display purposes if backend allows, or find a real one.
      // Better: Create a message in the "General" channel if exists, or just log it.
      // Since I can't easily find the channel ID without querying, I'll skip the DB write if I don't have a channel, 
      // OR I will query for a channel named "general" or similar.
      
      // Fetch general channel
      const channels = await base44.entities.Channel.list({ name: 'general' }, 1);
      const channelId = channels.length > 0 ? channels[0].id : null;
      
      if (channelId) {
        return base44.entities.Message.create({
          channel_id: channelId,
          user_id: user.id,
          content: `[COMMS LOG] TX on ${net.code}: **SIMULATED TRANSMISSION**`,
        });
      }
      return null;
    }
  });

  const handlePTT = () => {
    if (!canTx) return;
    setIsTransmitting(true);
    pttMutation.mutate();
    
    // Reset after 2 seconds
    setTimeout(() => {
      setIsTransmitting(false);
    }, 2000);
  };

  if (!net) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 p-10">
        <Radio className="w-12 h-12 mb-4 opacity-20" />
        <p className="uppercase tracking-widest text-sm">No Frequency Selected</p>
        <p className="text-xs mt-2">Select a net from the list to monitor</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header Card */}
      <Card className="bg-zinc-950 border-zinc-800 relative overflow-hidden">
        {isTransmitting && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.1 }}
             className="absolute inset-0 bg-emerald-500 pointer-events-none"
           />
        )}
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-black font-mono text-white tracking-tight">{net.code}</h2>
                 {isTransmitting && (
                   <Badge className="bg-red-500 text-white animate-pulse border-none">TRANSMITTING</Badge>
                 )}
              </div>
              <p className="text-zinc-400 uppercase tracking-widest text-xs mt-1">{net.label}</p>
            </div>
            <div className="text-right">
               <div className="text-xs text-zinc-600 font-mono">FREQ_ID: {net.id.slice(0,6)}</div>
               <div className="text-xs text-zinc-600 font-mono">ENC: NONE</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
           <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-zinc-900/50 p-3 rounded border border-zinc-800">
                 <div className="text-[10px] text-zinc-500 uppercase mb-1">Linked Squad</div>
                 <div className="text-zinc-200 font-bold text-sm">
                    {net.linked_squad_id ? "ASSIGNED" : "OPEN / GLOBAL"}
                 </div>
              </div>
              <div className="flex-1 bg-zinc-900/50 p-3 rounded border border-zinc-800">
                 <div className="text-[10px] text-zinc-500 uppercase mb-1">Signal Strength</div>
                 <div className="flex items-end gap-1 h-5">
                    <div className="w-1 h-2 bg-emerald-500/50" />
                    <div className="w-1 h-3 bg-emerald-500/50" />
                    <div className="w-1 h-4 bg-emerald-500/50" />
                    <div className="w-1 h-5 bg-emerald-500" />
                 </div>
              </div>
           </div>

           {/* PTT Button */}
           <button
             onMouseDown={handlePTT}
             disabled={!canTx}
             className={cn(
               "w-full h-24 rounded-lg flex items-center justify-center gap-3 transition-all duration-100 relative overflow-hidden group",
               canTx 
                 ? isTransmitting 
                    ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[0.99]" 
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700"
                 : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-zinc-800"
             )}
           >
             <div className={cn(
               "absolute inset-0 opacity-10 pattern-grid-lg",
               isTransmitting ? "bg-white" : "bg-transparent"
             )} />
             
             <Mic className={cn("w-8 h-8", isTransmitting && "animate-pulse")} />
             <span className="font-black text-2xl tracking-widest">
               {canTx ? (isTransmitting ? "TRANSMITTING" : "PUSH TO TALK") : "TX UNAUTHORIZED"}
             </span>
           </button>
           
           {!canTx && (
             <p className="text-center text-[10px] text-red-500/70 mt-2 uppercase tracking-wider">
               Insufficient Clearance (Req: {net.min_rank_to_tx})
             </p>
           )}
        </CardContent>
      </Card>

      {/* Roster & Logs */}
      <Card className="flex-1 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden">
         <ScrollArea className="flex-1 p-4">
            <NetRoster net={net} />
            <CommsLog eventId={eventId} />
         </ScrollArea>
      </Card>
    </div>
  );
}