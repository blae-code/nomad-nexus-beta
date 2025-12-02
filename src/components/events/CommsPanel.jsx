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
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden">
      <CardHeader className="pb-2 bg-zinc-900/30 border-b border-zinc-800/50 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-500" />
            Tactical Comms
          </CardTitle>
          <a href={createPageUrl(`CommsConsole?eventId=${eventId}`)}>
             <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
                <ExternalLink className="w-3 h-3" />
             </Button>
          </a>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Selected Net Control */}
        <div className="p-4 bg-zinc-900/20">
           {selectedNet ? (
             <div className="space-y-4">
                <div className="flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2">
                         <h3 className="text-2xl font-black font-mono text-white tracking-tight">{selectedNet.code}</h3>
                         {selectedNet.type === 'command' && <Lock className="w-3 h-3 text-red-500" />}
                      </div>
                      <div className="text-xs text-zinc-500 uppercase font-bold">{selectedNet.label}</div>
                   </div>
                   <div className="text-right">
                      <Badge variant="outline" className={cn(
                         "text-[10px] border-zinc-800",
                         canTx ? "text-emerald-500 bg-emerald-950/10" : "text-red-500 bg-red-950/10"
                      )}>
                         {canTx ? "TX READY" : "RX ONLY"}
                      </Badge>
                   </div>
                </div>

                <button
                  onMouseDown={handlePTT}
                  disabled={!canTx}
                  className={cn(
                    "w-full py-3 rounded flex items-center justify-center gap-2 transition-all duration-100 relative overflow-hidden group border",
                    canTx 
                      ? isTransmitting 
                         ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                         : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-zinc-700"
                      : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border-zinc-800"
                  )}
                >
                  <Mic className={cn("w-4 h-4", isTransmitting && "animate-pulse")} />
                  <span className="font-bold text-sm tracking-wider">
                    {canTx ? (isTransmitting ? "TRANSMITTING..." : "PUSH TO TALK") : "UNAUTHORIZED"}
                  </span>
                </button>
             </div>
           ) : (
             <div className="text-center py-4 text-zinc-500 text-xs">Select a frequency below</div>
           )}
        </div>

        {/* Compact Net List */}
        <div className="border-t border-zinc-800 max-h-[200px] overflow-y-auto custom-scrollbar">
           {voiceNets.length === 0 && (
              <div className="p-4 text-center text-xs text-zinc-500 italic">No active nets.</div>
           )}
           {voiceNets.map(net => (
              <div 
                key={net.id}
                onClick={() => setSelectedNetId(net.id)}
                className={cn(
                   "flex items-center justify-between p-3 border-b border-zinc-800/50 cursor-pointer transition-colors",
                   selectedNetId === net.id ? "bg-zinc-900/80" : "hover:bg-zinc-900/30"
                )}
              >
                 <div className="flex items-center gap-3">
                    <div className={cn(
                       "w-1 h-6 rounded-full",
                       net.type === 'command' ? "bg-red-500" :
                       net.linked_squad_id && net.linked_squad_id === userSquadId ? "bg-emerald-500" :
                       "bg-zinc-700"
                    )} />
                    <div>
                       <div className={cn("text-xs font-bold font-mono", selectedNetId === net.id ? "text-white" : "text-zinc-400")}>
                          {net.code}
                       </div>
                       <div className="text-[10px] text-zinc-600">{net.label}</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => toggleMute(net.id, e)}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                       {mutedNets[net.id] ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    {selectedNetId === net.id && !mutedNets[net.id] && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                 </div>
              </div>
           ))}
        </div>
      </CardContent>
      <CardFooter className="py-2 bg-zinc-900/50 border-t border-zinc-800">
         <div className="w-full flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>SIG: {selectedNet ? "STRONG" : "NONE"}</span>
            <span>ENC: OFF</span>
         </div>
      </CardFooter>
    </Card>
  );
}