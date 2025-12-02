import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Radio, Shield, Activity, Users, RadioReceiver, ScrollText, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hasMinRank } from "@/components/permissions";
import { TerminalCard, SignalStrength, PermissionBadge, NetTypeIcon } from "@/components/comms/SharedCommsComponents";
import StatusChip from "@/components/status/StatusChip";

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

function NetRoster({ net, eventId }) {
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: statuses } = useQuery({
    queryKey: ['net-roster-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ event_id: eventId }),
    enabled: !!eventId,
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
    
    let relevantUsers = [];

    // 1. If linked squad, show squad members
    if (net.linked_squad_id) {
       const memberIds = squadMembers.map(m => m.user_id);
       relevantUsers = allUsers.filter(u => memberIds.includes(u.id));
    }
    // 2. If command net, show high ranking
    else if (net.type === 'command') {
       relevantUsers = allUsers.filter(u => hasMinRank(u, net.min_rank_to_tx));
    }
    
    // Attach status
    return relevantUsers.map(u => {
       const status = statuses.find(s => s.user_id === u.id);
       return { 
          ...u, 
          status: status?.status || 'OFFLINE',
          role: status?.role || 'OTHER' 
       };
    }).sort((a, b) => {
       // Sort distress/down to top
       const priority = { DISTRESS: 0, DOWN: 1, ENGAGED: 2, READY: 3, OFFLINE: 4 };
       return (priority[a.status] || 99) - (priority[b.status] || 99);
    });
  }, [net, allUsers, squadMembers, statuses]);

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
             <div key={user.id} className={cn(
               "flex items-center justify-between bg-zinc-900/50 p-2 rounded border",
               (user.status === 'DOWN' || user.status === 'DISTRESS') ? "border-red-900/50 bg-red-950/10" : "border-zinc-800/50"
             )}>
               <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", user.status === 'OFFLINE' ? "bg-zinc-700" : "bg-emerald-500")} />
                  <div className="truncate">
                    <div className="text-sm text-zinc-300 font-bold truncate">{user.rsi_handle || user.full_name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-2">
                       <span>{user.rank}</span>
                       <span className="text-zinc-700">•</span>
                       <span>{user.role}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <StatusChip status={user.status} size="xs" showLabel={false} />
                  {hasMinRank(user, net.min_rank_to_tx) && (
                    <Mic className="w-3 h-3 text-zinc-600" />
                  )}
               </div>
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

  // LiveKit Integration
  const joinVoiceMutation = useMutation({
    mutationFn: async () => {
       // 1. Get Token
       const { data } = await base44.functions.invoke('generateLiveKitToken', {
          roomName: net.code, // Using net code as room name
          userRole: user.rank,
          userName: user.rsi_handle || user.full_name
       });
       return data.token;
    },
    onSuccess: (token) => {
       console.log("LiveKit Token Received:", token);
       // NOTE: actual LiveKit client is not installed in this environment.
       // In a full implementation, we would do:
       // await Room.connect(url, token);
       alert(`Voice Uplink Established (Simulation)\nToken received for room: ${net.code}`);
    },
    onError: (err) => {
       console.error("Voice Connection Failed:", err);
       alert("Voice Uplink Failed: Check console or API secrets.");
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
      <div className="h-full flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-900 rounded-lg bg-zinc-950/50 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(63,63,70,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-10" />
        <Radio className="w-16 h-16 mb-6 opacity-20" />
        <p className="uppercase tracking-[0.3em] text-sm font-bold">No Frequency Selected</p>
        <p className="text-xs mt-2 text-zinc-600 font-mono">AWAITING INPUT //</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header Card */}
      <TerminalCard className="relative overflow-hidden" active={isTransmitting}>
        {isTransmitting && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.05 }}
             className="absolute inset-0 bg-emerald-500 pointer-events-none"
           />
        )}
        
        {/* Transmission Overlay */}
        <AnimatePresence>
          {isTransmitting && (
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="absolute top-0 left-0 right-0 bg-red-500/90 text-white text-center py-1 z-20 shadow-lg"
            >
               <div className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">Transmitting Sequence Active</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 pt-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-4">
                 <h2 className={cn(
                    "text-4xl font-black font-mono tracking-tighter leading-none transition-colors duration-150",
                    isTransmitting ? "text-red-500 text-shadow-md" : "text-white text-shadow-sm"
                 )}>
                    {net.code}
                 </h2>
                 {isTransmitting && (
                   <div className="flex gap-1">
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite]" />
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite_0.2s]" />
                   </div>
                 )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <NetTypeIcon type={net.type} />
                 <p className="text-zinc-400 uppercase tracking-widest text-xs font-bold">{net.label}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
               <PermissionBadge canTx={canTx} minRankTx={net.min_rank_to_tx} minRankRx={net.min_rank_to_rx} />
               <div className="text-[10px] text-zinc-600 font-mono tracking-widest">ID: {net.id.slice(0,8).toUpperCase()}</div>
            </div>
          </div>
        
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                 <div className="text-[9px] text-zinc-500 uppercase mb-1 tracking-widest">Squad Assignment</div>
                 <div className="text-zinc-200 font-bold text-sm font-mono">
                    {net.linked_squad_id ? "DEDICATED LINK" : "GLOBAL / OPEN"}
                 </div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50 flex justify-between items-center">
                 <div>
                   <div className="text-[9px] text-zinc-500 uppercase mb-1 tracking-widest">Carrier Signal</div>
                   <div className="text-zinc-200 font-bold text-sm font-mono">OPTIMAL</div>
                 </div>
                 <SignalStrength strength={4} className="h-6 gap-1" />
              </div>
           </div>

           {/* PTT Button */}
           <button
             onMouseDown={handlePTT}
             disabled={!canTx}
             className={cn(
               "w-full h-32 rounded-sm flex items-center justify-center gap-4 transition-all duration-150 relative overflow-hidden group border-2",
               canTx 
                 ? isTransmitting 
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.4)] scale-[0.98]" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-zinc-700 hover:border-zinc-500"
                 : "bg-zinc-950/50 text-zinc-700 cursor-not-allowed border-zinc-900 border-dashed"
             )}
           >
             <div className={cn(
               "absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]",
               isTransmitting ? "opacity-10" : ""
             )} />
             
             <Mic className={cn("w-10 h-10", isTransmitting && "animate-pulse")} />
             <div className="flex flex-col items-start">
               <span className="font-black text-3xl tracking-widest leading-none">
                 {canTx ? (isTransmitting ? "TRANSMITTING" : "PUSH TO TALK") : "UNAUTHORIZED"}
               </span>
               {canTx && !isTransmitting && (
                 <span className="text-xs uppercase tracking-[0.3em] text-zinc-600 font-bold mt-1 group-hover:text-zinc-500">Hold to Broadcast</span>
               )}
             </div>
             </button>

             {/* Voice Channel Join Button */}
             <div className="mt-4 flex justify-end">
              <Button 
                 onClick={() => joinVoiceMutation.mutate()} 
                 disabled={joinVoiceMutation.isPending}
                 variant="outline" 
                 className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-emerald-500 hover:bg-emerald-950/20 uppercase text-xs font-bold tracking-widest"
              >
                 {joinVoiceMutation.isPending ? "Establishing Uplink..." : "Initialize Voice Link"}
              </Button>
             </div>
             </div>
      </TerminalCard>

      {/* Roster & Logs */}
      <TerminalCard className="flex-1 flex flex-col overflow-hidden">
         <ScrollArea className="flex-1 p-4">
            <NetRoster net={net} eventId={eventId} />
            <CommsLog eventId={eventId} />
         </ScrollArea>
      </TerminalCard>
    </div>
  );
}