import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Mic, Users, Lock, Volume2 } from "lucide-react";
import { SignalStrength, NetTypeIcon } from "@/components/comms/SharedCommsComponents";

export default function NetList({ nets, selectedNetId, onSelect, userSquadId, viewMode }) {
  // Filter nets based on view mode
  const displayNets = React.useMemo(() => {
    if (viewMode === 'command') return nets;
    
    // Line mode: Show General, Command, and nets linked to user's squad
    return nets.filter(net => 
      net.type === 'general' || 
      net.type === 'command' || 
      (net.linked_squad_id && net.linked_squad_id === userSquadId)
    );
  }, [nets, viewMode, userSquadId]);

  // Group by priority
  const groupedNets = React.useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    displayNets.forEach(net => {
      const p = net.priority || 3;
      if (!groups[p]) groups[p] = [];
      groups[p].push(net);
    });
    return groups;
  }, [displayNets]);

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">
      {[1, 2, 3, 4, 5].map(priority => {
        const priorityNets = groupedNets[priority];
        if (!priorityNets || priorityNets.length === 0) return null;

        return (
          <div key={priority} className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-900/50">
                <div className={cn("w-1 h-1 rounded-full", priority === 1 ? "bg-red-500" : "bg-zinc-700")}></div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-bold">
                   {priority === 1 ? "PRIORITY 1 // COMMAND" : 
                    priority === 2 ? "PRIORITY 2 // TACTICAL" : 
                    `PRIORITY ${priority} // SUPPORT`}
                </div>
            </div>
            {priorityNets.map(net => (
              <div 
                key={net.id}
                onClick={() => onSelect(net)}
                className={cn(
                  "cursor-pointer relative overflow-hidden transition-all duration-200 border rounded-sm p-3 group",
                  selectedNetId === net.id 
                    ? "bg-zinc-900/80 border-emerald-900/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]" 
                    : "bg-zinc-950/50 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/30"
                )}
              >
                {/* Active Indicator Strip */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
                  selectedNetId === net.id ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-800 group-hover:bg-zinc-700",
                  net.type === 'command' && selectedNetId !== net.id ? "bg-red-900/50" : ""
                )} />

                <div className="flex justify-between items-start pl-3">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className={cn(
                           "font-mono font-bold text-lg tracking-tighter leading-none",
                           selectedNetId === net.id ? "text-emerald-400 text-shadow-sm" : "text-zinc-300 group-hover:text-zinc-200"
                         )}>
                           {net.code}
                         </span>
                         {net.linked_squad_id && (
                           <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-zinc-800 text-zinc-600 font-mono rounded-sm">
                             LINKED
                           </Badge>
                         )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-2 font-mono">
                        <NetTypeIcon type={net.type} />
                        {net.label}
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                         {net.type === 'command' && <Lock className="w-3 h-3 text-red-500/70" />}
                         {net.type === 'general' && <Users className="w-3 h-3 text-blue-500/70" />}
                      </div>
                      {selectedNetId === net.id ? (
                         <SignalStrength strength={4} className="opacity-100" />
                      ) : (
                         <SignalStrength strength={1} className="opacity-20 group-hover:opacity-40 transition-opacity" />
                      )}
                   </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}