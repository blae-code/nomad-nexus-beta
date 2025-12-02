import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Mic, ExternalLink, Volume2, VolumeX, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRank } from "@/components/permissions";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SignalStrength, PermissionBadge, TerminalCard, NetTypeIcon } from "@/components/comms/SharedCommsComponents";

export default function CommsPanel({ eventId }) {
  const [selectedNetId, setSelectedNetId] = React.useState(null);
  const [isTransmitting, setIsTransmitting] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);
  const [mutedNets, setMutedNets] = React.useState({});

  const toggleMute = (netId, e) => {
    e.stopPropagation();
    setMutedNets(prev => ({
      ...prev,
      [netId]: !prev[netId]
    }));
  };

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u) {
         base44.entities.SquadMember.list({ user_id: u.id }).then(memberships => {
            if (memberships.length > 0) setUserSquadId(memberships[0].squad_id);
         });
      }
    }).catch(() => {});
  }, []);

  const { data: voiceNets, isLoading } = useQuery({
    queryKey: ['voice-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.list({ 
      filter: { event_id: eventId },
      sort: { priority: 1 } 
    }),
    initialData: []
  });

  // Auto-select relevant net on load
  React.useEffect(() => {
    if (voiceNets.length > 0 && !selectedNetId && currentUser) {
      // 1. Try squad net
      const squadNet = voiceNets.find(n => n.linked_squad_id === userSquadId);
      if (squadNet) {
        setSelectedNetId(squadNet.id);
        return;
      }
      // 2. Try command net if high rank
      if (hasMinRank(currentUser, 'Voyager')) {
        const cmdNet = voiceNets.find(n => n.type === 'command');
        if (cmdNet) {
          setSelectedNetId(cmdNet.id);
          return;
        }
      }
      // 3. Default to first general/available
      setSelectedNetId(voiceNets[0].id);
    }
  }, [voiceNets, currentUser, userSquadId, selectedNetId]);

  const selectedNet = voiceNets.find(n => n.id === selectedNetId);
  const canTx = selectedNet && currentUser && hasMinRank(currentUser, selectedNet.min_rank_to_tx);

  const pttMutation = useMutation({
    mutationFn: async () => {
      // Log simulated transmission
      const channels = await base44.entities.Channel.list({ name: 'general' }, 1);
      if (channels.length > 0) {
        return base44.entities.Message.create({
          channel_id: channels[0].id,
          user_id: currentUser.id,
          content: `[COMMS LOG] TX on ${selectedNet.code} (Event ${eventId.slice(0,4)}): **SIMULATED TRANSMISSION**`,
        });
      }
    }
  });

  const handlePTT = () => {
    if (!canTx) return;
    setIsTransmitting(true);
    pttMutation.mutate();
    setTimeout(() => setIsTransmitting(false), 2000);
  };

  if (isLoading) return <div className="h-32 bg-zinc-900/50 rounded animate-pulse" />;

  return (
    <TerminalCard className="flex flex-col overflow-hidden">
      <CardHeader className="pb-2 bg-zinc-900/30 border-b border-zinc-800/50 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-black text-zinc-100 flex items-center gap-2 uppercase tracking-widest font-mono">
            <Radio className="w-3 h-3 text-emerald-500" />
            Redscar Comms
          </CardTitle>
          <a href={createPageUrl(`CommsConsole?eventId=${eventId}`)}>
             <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                <ExternalLink className="w-3 h-3" />
             </Button>
          </a>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Primary Net Interface */}
        <div className="p-4 bg-zinc-900/20 relative">
           {selectedNet ? (
             <div className="space-y-4">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <NetTypeIcon type={selectedNet.type} />
                         <h3 className="text-xl font-black font-mono text-white tracking-tighter leading-none">{selectedNet.code}</h3>
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider pl-4">{selectedNet.label}</div>
                   </div>
                   <div className="text-right flex flex-col items-end gap-1">
                      <PermissionBadge 
                        canTx={canTx} 
                        minRankTx={selectedNet.min_rank_to_tx} 
                        className="text-[9px] py-0 px-1.5 h-4" 
                      />
                      {!mutedNets[selectedNet.id] && (
                        <SignalStrength strength={3} className="h-2 gap-[1px]" />
                      )}
                   </div>
                </div>

                {/* Big PTT Button */}
                <button
                  onMouseDown={handlePTT}
                  disabled={!canTx}
                  className={cn(
                    "w-full py-4 rounded-sm flex items-center justify-center gap-3 transition-all duration-100 relative overflow-hidden group border",
                    canTx 
                      ? isTransmitting 
                         ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[0.99]" 
                         : "bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-300 hover:from-zinc-700 hover:to-zinc-800 hover:text-white border-zinc-700 shadow-lg"
                      : "bg-zinc-950 text-zinc-700 cursor-not-allowed border-zinc-900 border-dashed opacity-70"
                  )}
                >
                  {/* Button Texture */}
                  <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
                  
                  <Mic className={cn("w-5 h-5", isTransmitting && "animate-pulse text-white")} />
                  <span className={cn("font-black text-sm tracking-[0.2em]", isTransmitting && "text-white text-shadow")}>
                    {canTx ? (isTransmitting ? "TRANSMITTING" : "PUSH TO TALK") : "UNAUTHORIZED"}
                  </span>
                </button>
             </div>
           ) : (
             <div className="text-center py-8 flex flex-col items-center justify-center opacity-50">
                <Radio className="w-8 h-8 mb-2 text-zinc-700" />
                <div className="text-zinc-500 text-xs uppercase tracking-widest">No Frequency Locked</div>
             </div>
           )}
        </div>

        {/* Compact Net List (Secondary) */}
        <div className="border-t border-zinc-800/50">
           <div className="px-3 py-2 bg-zinc-950 text-[9px] text-zinc-600 uppercase tracking-widest font-bold border-b border-zinc-900">
             Available Frequencies
           </div>
           <div className="max-h-[180px] overflow-y-auto custom-scrollbar bg-zinc-950/50">
             {voiceNets.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-600 italic">No signal detected.</div>
             )}
             {voiceNets.map(net => {
                const isSelected = selectedNetId === net.id;
                return (
                  <div 
                    key={net.id}
                    onClick={() => setSelectedNetId(net.id)}
                    className={cn(
                       "flex items-center justify-between p-2 border-b border-zinc-900/50 cursor-pointer transition-all group",
                       isSelected ? "bg-zinc-900/80 border-l-2 border-l-emerald-500 pl-[calc(0.75rem-2px)]" : "hover:bg-zinc-900/30 border-l-2 border-l-transparent"
                    )}
                  >
                     <div className="flex items-center gap-3">
                        <div className={cn(
                           "w-1 h-1 rounded-full",
                           net.type === 'command' ? "bg-red-500" :
                           net.type === 'general' ? "bg-emerald-500" : "bg-zinc-700"
                        )} />
                        <div>
                           <div className={cn("text-xs font-bold font-mono leading-none mb-0.5", isSelected ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")}>
                              {net.code}
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => toggleMute(net.id, e)}
                          className="p-1 hover:bg-zinc-800 rounded-sm text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                           {mutedNets[net.id] ? <VolumeX className="w-3 h-3 text-red-900" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                     </div>
                  </div>
                );
             })}
           </div>
        </div>
      </CardContent>
      <div className="py-1 px-2 bg-zinc-950 border-t border-zinc-900">
         <div className="w-full flex justify-between text-[9px] text-zinc-700 font-mono">
            <span>STATUS: ONLINE</span>
            <span>ENCRYPTION: NONE</span>
         </div>
      </div>
    </TerminalCard>
  );
}