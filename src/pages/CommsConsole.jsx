import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CommsEventSelector from "@/components/comms/CommsEventSelector";
import NetList from "@/components/comms/NetList";
import ActiveNetPanel from "@/components/comms/ActiveNetPanel";
import FleetHierarchy from "@/components/ops/FleetHierarchy";
import FleetStatusSummary from "@/components/ops/FleetStatusSummary";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, Shield, Layout, Monitor, ListTree } from "lucide-react";
import CurrentStatusHeader from "@/components/dashboard/CurrentStatusHeader";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import AUECWarningPanel from "@/components/dashboard/AUECWarningPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RankVisualizer from "@/components/dashboard/RankVisualizer";
import { canAccessFocusedVoice } from "@/components/permissions";

export default function CommsConsolePage() {
  const [selectedEventId, setSelectedEventId] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') || "";
  });
  const [selectedNet, setSelectedNet] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("line"); // 'command' or 'line'
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Access Control Check moved to render to prevent hook mismatch errors

  // Fetch squad assignment for this specific event
  useQuery({
    queryKey: ['console-user-squad', selectedEventId, currentUser?.id],
    queryFn: async () => {
       if (!selectedEventId || !currentUser) return null;
       
       // 1. Check Event Assignment
       const statuses = await base44.entities.PlayerStatus.list({ 
          user_id: currentUser.id, 
          event_id: selectedEventId 
       });
       
       if (statuses.length > 0 && statuses[0].assigned_squad_id) {
          setUserSquadId(statuses[0].assigned_squad_id);
          return statuses[0].assigned_squad_id;
       }

       // 2. Fallback to Global Squad
       const memberships = await base44.entities.SquadMember.list({ user_id: currentUser.id });
       if (memberships.length > 0) {
          setUserSquadId(memberships[0].squad_id);
          return memberships[0].squad_id;
       }
       
       setUserSquadId(null);
       return null;
    },
    enabled: !!selectedEventId && !!currentUser
  });

  const { data: voiceNets, isLoading } = useQuery({
    queryKey: ['voice-nets', selectedEventId],
    queryFn: () => base44.entities.VoiceNet.list({ 
      filter: { event_id: selectedEventId },
      sort: { priority: 1 } 
    }),
    enabled: !!selectedEventId,
    initialData: []
  });

  // Fetch recent comms activity for indicators
  const { data: recentActivity } = useQuery({
    queryKey: ['comms-activity', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return {};
      const msgs = await base44.entities.Message.list({
        sort: { created_date: -1 },
        limit: 20
      });
      
      // Map net codes to last activity timestamp
      const activity = {};
      msgs.forEach(msg => {
        if (msg.content.includes('[COMMS LOG]')) {
           // Extract net code from message: "TX on ALPHA: ..."
           const match = msg.content.match(/TX on ([^:]+):/);
           if (match && match[1]) {
             const code = match[1];
             // Find net by code
             const net = voiceNets.find(n => n.code === code);
             if (net) {
               if (!activity[net.id] || new Date(msg.created_date) > new Date(activity[net.id])) {
                 activity[net.id] = msg.created_date;
               }
             }
           }
        }
      });
      return activity;
    },
    enabled: !!selectedEventId && voiceNets.length > 0,
    refetchInterval: 3000,
    initialData: {}
  });

  // Reset selected net when event changes
  React.useEffect(() => {
     setSelectedNet(null);
  }, [selectedEventId]);

  // Access Control Check (Render Phase)
  if (currentUser && !canAccessFocusedVoice(currentUser)) {
     return (
        <div className="h-full bg-black text-zinc-200 font-sans flex flex-col overflow-hidden">
            {/* Toolbar Placeholder */}
            <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <Radio className="w-5 h-5 text-zinc-600" />
                  <div><h2 className="font-bold text-zinc-500 tracking-wider text-sm uppercase">Comms Console // LOCKED</h2></div>
               </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700">
               <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                  <Shield className="w-24 h-24 text-red-600 relative z-10" />
               </div>
               <div className="text-center space-y-2">
                  <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-red-600 text-shadow-lg">Access Denied</h1>
                  <div className="h-px w-32 bg-red-900/50 mx-auto my-4" />
                  <p className="text-sm font-mono text-red-400 tracking-widest">CLEARANCE INSUFFICIENT</p>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase">Required Rank: Scout+ // Protocol 77-B</p>
               </div>
            </div>
        </div>
     );
  }

  return (
    <div className="h-full bg-black text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col overflow-hidden">
      
      {/* Toolbar */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 justify-between shrink-0">
         <div className="flex items-center gap-4">
            <Radio className="w-5 h-5 text-emerald-500" />
            <div>
               <h2 className="font-bold text-zinc-300 tracking-wider text-sm uppercase">Comms Console</h2>
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5">
               <button 
                  onClick={() => setViewMode('line')}
                  className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${viewMode === 'line' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  LINE
               </button>
               <button 
                  onClick={() => setViewMode('command')}
                  className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${viewMode === 'command' ? 'bg-red-900 text-red-100' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  CMD
               </button>
               <button 
                  onClick={() => setViewMode('hierarchy')}
                  className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${viewMode === 'hierarchy' ? 'bg-emerald-900 text-emerald-100' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <ListTree className="w-3 h-3" />
                  ORG
               </button>
            </div>
            <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
            {selectedEventId && <FleetStatusSummary eventId={selectedEventId} />}
            </div>
            </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Sidebar - Event & Net Selection */}
         <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 space-y-4">
               <CommsEventSelector selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
               {selectedEventId && <AIInsightsPanel eventId={selectedEventId} compact={true} />}
            </div>
            
            <div className="flex-1 p-4 overflow-hidden custom-scrollbar">
               {!selectedEventId ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 text-center space-y-4">
                     <Monitor className="w-12 h-12 opacity-20" />
                     <p className="text-xs uppercase tracking-widest font-bold">Waiting for Uplink</p>
                     <p className="text-[10px] text-zinc-600 font-mono">SELECT OPERATION //</p>
                  </div>
               ) : isLoading ? (
                  <div className="text-center text-zinc-500 py-10 text-xs font-mono animate-pulse">SCANNING FREQUENCIES...</div>
               ) : voiceNets.length === 0 ? (
                  <div className="text-center text-zinc-500 py-10 text-xs font-mono">
                     NO ACTIVE NETS DETECTED.<br/>INITIALIZE VIA OPS BOARD.
                  </div>
               ) : (
                  viewMode === 'hierarchy' ? (
                     <FleetHierarchy eventId={selectedEventId} />
                  ) : (
                     <NetList 
                        nets={voiceNets} 
                        selectedNetId={selectedNet?.id} 
                        onSelect={setSelectedNet}
                        userSquadId={userSquadId}
                        viewMode={viewMode}
                        activityMap={recentActivity}
                        eventId={selectedEventId}
                     />
                  )
               )}
            </div>
         </aside>

         {/* Main Panel - Active Status Hub */}
         <main className="flex-1 p-6 bg-black relative flex flex-col gap-4">
            {/* Background grid & Vignette */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(50,50,50,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50,50,50,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            
            <div className="relative z-10 h-full flex flex-col gap-4">
               {selectedEventId ? (
                  <ActiveNetPanel 
                     net={selectedNet} 
                     user={currentUser} 
                     eventId={selectedEventId} 
                  />
               ) : (
                  <>
                     {/* Top Center: Current Status */}
                     <CurrentStatusHeader user={currentUser} />

                     {/* Center: Personalized Feed */}
                     <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <PersonalLogPanel user={currentUser} />
                     </div>

                     {/* Bottom Center: AUEC Warning */}
                     <div className="shrink-0">
                        <AUECWarningPanel />
                     </div>
                  </>
               )}
            </div>
         </main>

         {/* Right Sidebar - AUX DATA */}
         <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
               <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <Monitor className="w-4 h-4" />
                  <span>Aux Data</span>
               </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
               {/* 1. Rescue Alert (Top) */}
               <RescueAlertPanel />

               {/* 2. Next Focused Event (Compact) */}
               <EventProjectionPanel user={currentUser} compact={true} />

               {/* 3. Rank Visualizer (Bottom) */}
               <div className="mt-auto">
                  <RankVisualizer currentRank={currentUser?.rank || 'Vagrant'} />
               </div>
            </div>
         </aside>

      </div>
    </div>
  );
}