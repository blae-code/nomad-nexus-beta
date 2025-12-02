import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CommsEventSelector from "@/components/comms/CommsEventSelector";
import NetList from "@/components/comms/NetList";
import ActiveNetPanel from "@/components/comms/ActiveNetPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, Shield, Layout, Monitor } from "lucide-react";

export default function CommsConsolePage() {
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [selectedNet, setSelectedNet] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("line"); // 'command' or 'line'
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      // Fetch user's squad
      if (u) {
         base44.entities.SquadMember.list({ user_id: u.id }).then(memberships => {
            if (memberships.length > 0) {
               setUserSquadId(memberships[0].squad_id);
            }
         });
      }
    }).catch(() => {});
  }, []);

  const { data: voiceNets, isLoading } = useQuery({
    queryKey: ['voice-nets', selectedEventId],
    queryFn: () => base44.entities.VoiceNet.list({ 
      filter: { event_id: selectedEventId },
      sort: { priority: 1 } 
    }),
    enabled: !!selectedEventId,
    initialData: []
  });

  // Reset selected net when event changes
  React.useEffect(() => {
     setSelectedNet(null);
  }, [selectedEventId]);

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col">
      
      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between">
         <div className="flex items-center gap-4">
            <Radio className="w-6 h-6 text-emerald-500" />
            <div>
               <h1 className="font-bold text-white tracking-wider text-lg uppercase">Comms Console</h1>
               <div className="text-[10px] text-zinc-500 font-mono tracking-widest">SECURE UPLINK ESTABLISHED</div>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-zinc-900 py-1 px-3 rounded-full border border-zinc-800">
               <span className={`text-xs font-bold ${viewMode === 'line' ? 'text-white' : 'text-zinc-600'}`}>LINE</span>
               <Switch 
                  checked={viewMode === 'command'} 
                  onCheckedChange={(c) => setViewMode(c ? 'command' : 'line')}
                  className="data-[state=checked]:bg-red-900 data-[state=unchecked]:bg-emerald-900"
               />
               <span className={`text-xs font-bold ${viewMode === 'command' ? 'text-red-500' : 'text-zinc-600'}`}>COMMAND</span>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800 mx-2" />
            <div className="text-right">
               <div className="text-xs font-bold text-white">{currentUser?.rsi_handle || "Unknown Operator"}</div>
               <div className="text-[10px] text-zinc-500 uppercase">{currentUser?.rank || "Vagrant"} Clearance</div>
            </div>
         </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Sidebar */}
         <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col">
            <div className="p-4 border-b border-zinc-800">
               <CommsEventSelector selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
            </div>
            
            <div className="flex-1 p-4 overflow-hidden">
               {!selectedEventId ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-center space-y-4">
                     <Monitor className="w-12 h-12 opacity-20" />
                     <p className="text-xs uppercase tracking-widest">Waiting for Uplink...</p>
                  </div>
               ) : isLoading ? (
                  <div className="text-center text-zinc-500 py-10">Scanning Frequencies...</div>
               ) : voiceNets.length === 0 ? (
                  <div className="text-center text-zinc-500 py-10 text-xs">
                     No Active Nets Found.<br/>Initialize via Ops Board.
                  </div>
               ) : (
                  <NetList 
                     nets={voiceNets} 
                     selectedNetId={selectedNet?.id} 
                     onSelect={setSelectedNet}
                     userSquadId={userSquadId}
                     viewMode={viewMode}
                  />
               )}
            </div>
         </aside>

         {/* Main Panel */}
         <main className="flex-1 p-6 bg-zinc-950/50 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none" />
            <div className="relative z-10 h-full max-w-4xl mx-auto">
               {selectedEventId ? (
                  <ActiveNetPanel 
                     net={selectedNet} 
                     user={currentUser} 
                     eventId={selectedEventId} 
                  />
               ) : (
                  <div className="h-full flex items-center justify-center">
                     <div className="text-center space-y-4 opacity-50">
                        <div className="inline-block p-4 rounded-full bg-zinc-900 border border-zinc-800">
                           <Layout className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-300">System Idle</h2>
                        <p className="text-zinc-500">Select an active operation to initialize comms interface.</p>
                     </div>
                  </div>
               )}
            </div>
         </main>

      </div>
    </div>
  );
}