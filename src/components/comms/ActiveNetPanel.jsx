import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Radio, Shield, Activity, Users, RadioReceiver, ScrollText, Lock, Ear } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hasMinRank } from "@/components/permissions";
import { cn } from "@/lib/utils";
import { TerminalCard, SignalStrength, PermissionBadge, NetTypeIcon } from "@/components/comms/SharedCommsComponents";
import StatusChip from "@/components/status/StatusChip";
import AudioControls from "@/components/comms/AudioControls";
import { getRankColorClass } from "@/components/utils/rankUtils";

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
            <div className="text-[10px] text-zinc-500 italic pl-2">No recent traffic recorded.</div>
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

function NetRoster({ net, eventId, currentUserState, onWhisper }) {
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });
  
  const currentUser = React.useMemo(() => {
     // Just to get ID to match with props
     // In real implementation we'd check auth.me()
     return null;
  }, []);

  const { data: statuses } = useQuery({
    queryKey: ['net-roster-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 3000,
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

    if (net.linked_squad_id) {
       const memberIds = squadMembers.map(m => m.user_id);
       relevantUsers = allUsers.filter(u => memberIds.includes(u.id));
    } else if (net.type === 'command') {
       relevantUsers = allUsers.filter(u => hasMinRank(u, net.min_rank_to_tx));
    } else {
       // General net - show everyone
       relevantUsers = allUsers;
    }
    
    return relevantUsers.map(u => {
       const status = statuses.find(s => s.user_id === u.id);
       return { 
          ...u, 
          status: status?.status || 'OFFLINE',
          role: status?.role || 'OTHER' 
       };
    }).sort((a, b) => {
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
           {net.type === 'general' ? "Open Frequency" : "No active carrier signal detected."}
         </div>
       ) : (
         <div className="grid grid-cols-1 gap-2">
           {participants.map(participant => {
             // Determine Voice Status Color
             let voiceStatusColor = "bg-zinc-700"; // Default Grey (Connected but Muted)
             
             if (participant.id === myId && currentUserState) {
                if (currentUserState.isTransmitting) voiceStatusColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
                else if (currentUserState.mode === 'PTT' && !currentUserState.isMuted) voiceStatusColor = "bg-orange-600";
             } else {
                // Mock random status for others for "Presence" demo
                // In real LiveKit integration, this would come from participant.isSpeaking
                if (Math.random() > 0.95) voiceStatusColor = "bg-green-500"; 
             }

             return (
             <div key={participant.id} className={cn(
               "flex items-center justify-between bg-zinc-900/50 p-2 rounded border",
               (participant.status === 'DOWN' || participant.status === 'DISTRESS') ? "border-red-900/50 bg-red-950/10" : "border-zinc-800/50"
             )}>
               <div className="flex items-center gap-3 min-w-0">
                  {/* Voice Status Indicator */}
                  <div className={cn("w-2 h-2 rounded-full shrink-0 transition-all duration-200", voiceStatusColor)} />
                  
                  <div className="truncate">
                    <div className="text-sm text-zinc-300 font-bold truncate">{participant.callsign || participant.rsi_handle || participant.full_name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-2">
                       <span className={cn("font-bold", getRankColorClass(participant.rank))}>{participant.rank}</span>
                       <span className="text-zinc-700">•</span>
                       <span>{participant.role}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <StatusChip status={participant.status} size="xs" showLabel={false} />
                  
                  {/* Whisper Button */}
                  {participant.id !== myId && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500"
                        onClick={() => onWhisper && onWhisper(participant)}
                        title={`Whisper to ${participant.callsign}`}
                     >
                        <Ear className="w-3 h-3" />
                     </Button>
                  )}

                  {hasMinRank(participant, net.min_rank_to_tx) && (
                    <Mic className="w-3 h-3 text-zinc-600" />
                  )}
               </div>
             </div>
           )})}
         </div>
       )}
    </div>
  );
}

export default function ActiveNetPanel({ net, user, eventId }) {
  const [audioState, setAudioState] = React.useState(null);
  const [connectionToken, setConnectionToken] = React.useState(null);
  const [whisperTarget, setWhisperTarget] = React.useState(null);
  const [livekitUrl, setLivekitUrl] = React.useState(null);

  // Simulate LiveKit Connection Handshake
  React.useEffect(() => {
    if (net && user) {
       // Reset token
       setConnectionToken(null);
       setLivekitUrl(null);
       setWhisperTarget(null);
       
       // Call backend to generate token
       base44.functions.invoke('generateLiveKitToken', {
          roomNames: [net.code],
          participantName: user.callsign || user.rsi_handle || user.full_name || 'Unknown'
       }).then(res => {
          const token = res.data.tokens ? res.data.tokens[net.code] : res.data.token;
          setConnectionToken(token);
          setLivekitUrl(res.data.livekitUrl);
       }).catch(err => console.error("LiveKit Handshake Failed:", err));
    }
  }, [net, user]);

  const handleWhisper = (targetUser) => {
     if (whisperTarget?.id === targetUser.id) {
        setWhisperTarget(null);
     } else {
        setWhisperTarget(targetUser);
     }
  };
  
  const canTx = React.useMemo(() => {
    if (!user || !net) return false;
    return hasMinRank(user, net.min_rank_to_tx);
  }, [user, net]);

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

  const isTransmitting = audioState?.isTransmitting || false;

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header Card */}
      <TerminalCard className="relative overflow-hidden" active={isTransmitting}>
        {isTransmitting && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.05 }}
             className={cn(
                "absolute inset-0 pointer-events-none",
                whisperTarget ? "bg-amber-500" : "bg-emerald-500"
             )}
           />
        )}
        
        {/* Transmission/Whisper Overlay */}
        <AnimatePresence>
          {isTransmitting && (
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className={cn(
                  "absolute top-0 left-0 right-0 text-white text-center py-1 z-20 shadow-lg",
                  whisperTarget ? "bg-amber-600/90" : "bg-red-500/90"
               )}
            >
               <div className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                  {whisperTarget ? `WHISPERING TO ${whisperTarget.callsign || 'UNKNOWN'}` : "LIVE TRANSMISSION"}
               </div>
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
              {whisperTarget && (
                 <Badge className="bg-amber-950/50 text-amber-500 border-amber-900 animate-pulse">
                    WHISPER TARGET LOCKED
                 </Badge>
              )}
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

           {/* Audio Controls */}
           {canTx ? (
             <AudioControls onStateChange={setAudioState} />
           ) : (
             <div className="p-4 bg-zinc-950/50 border-2 border-zinc-900 border-dashed rounded-sm text-center text-zinc-600 font-mono text-xs">
                TRANSMISSION UNAUTHORIZED
             </div>
           )}
        </div>
      </TerminalCard>

      {/* Roster & Logs */}
      <TerminalCard className="flex-1 flex flex-col overflow-hidden">
         <ScrollArea className="flex-1 p-4">
            <NetRoster 
              net={net} 
              eventId={eventId} 
              currentUserState={audioState} 
              onWhisper={handleWhisper} 
            />
            <CommsLog eventId={eventId} />
         </ScrollArea>
         <div className="py-1 px-2 bg-zinc-950 border-t border-zinc-900">
            <div className="w-full flex justify-between text-[9px] text-zinc-500 font-mono">
               <span className={connectionToken ? "text-emerald-500" : "text-zinc-500"}>
                  STATUS: {connectionToken ? "CONNECTED (SECURE)" : "HANDSHAKE..."}
               </span>
               <div className="flex gap-4">
                  {livekitUrl && <span className="hidden md:inline text-zinc-500">UPLINK: {livekitUrl.split('://')[1]}</span>}
                  <span>ENCRYPTION: {connectionToken ? "AES-256" : "NONE"}</span>
               </div>
            </div>
         </div>
      </TerminalCard>
    </div>
  );
}