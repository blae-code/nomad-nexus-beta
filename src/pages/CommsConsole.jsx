import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CommsEventSelector from "@/components/comms/CommsEventSelector";
import NetList from "@/components/comms/NetList";
import ActiveNetPanel from "@/components/comms/ActiveNetPanel";
import BackgroundNetMonitor from "@/components/comms/BackgroundNetMonitor";
import ReadyRoomList from "@/components/comms/ReadyRoomList";
import ChatInterface from "@/components/comms/ChatInterface";
import FleetHierarchy from "@/components/ops/FleetHierarchy";
import FleetStatusSummary from "@/components/ops/FleetStatusSummary";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, Shield, Layout, Monitor, ListTree, Bot, Hash } from "lucide-react";
import CommsAIAssistant from "@/components/ai/CommsAIAssistant";
import CurrentStatusHeader from "@/components/dashboard/CurrentStatusHeader";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import AUECWarningPanel from "@/components/dashboard/AUECWarningPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import TacticalStatusReporter from "@/components/comms/TacticalStatusReporter";
import CommsToolbox from "@/components/comms/CommsToolbox";
import TacticalDashboard from "@/components/comms/TacticalDashboard";
import VoiceDiagnostics from "@/components/comms/VoiceDiagnostics";
import OperationalEventFeed from "@/components/comms/OperationalEventFeed";
import { canAccessFocusedVoice } from "@/components/permissions";
import { cn } from "@/lib/utils";

export default function CommsConsolePage() {
  const [selectedEventId, setSelectedEventId] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId') || "";
  });
  const [selectedNet, setSelectedNet] = React.useState(null);
  const [monitoredNetIds, setMonitoredNetIds] = React.useState([]);
  const [selectedChannel, setSelectedChannel] = React.useState(null);
  const [consoleMode, setConsoleMode] = React.useState("ops"); // 'ops' (Voice/Events) or 'lounge' (Text/ReadyRooms)
  const [viewMode, setViewMode] = React.useState("line"); // 'command', 'line', 'hierarchy', 'tactical', or 'diagnostics'
  const [showAIAssistant, setShowAIAssistant] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Access Control Check
  if (currentUser && !canAccessFocusedVoice(currentUser)) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-black text-zinc-500 space-y-4">
           <Shield className="w-16 h-16 text-red-900 opacity-50" />
           <div className="text-center">
              <h1 className="text-2xl font-black uppercase tracking-widest text-red-800">Access Denied</h1>
              <p className="text-xs font-mono mt-2">CLEARANCE INSUFFICIENT FOR FOCUSED VOICE NETS</p>
              <p className="text-[10px] font-mono mt-1 opacity-50">REQUIRED: SCOUT+</p>
           </div>
        </div>
     );
  }

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
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: selectedEventId }, 'priority', 50),
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

  // Reset selected net when event changes to prevent stale connections
  React.useEffect(() => {
     setSelectedNet(null);
     setMonitoredNetIds([]);
  }, [selectedEventId]);

  // Memoize nets to prevent unnecessary rerenders
  const memoizedNets = React.useMemo(() => voiceNets, [voiceNets.length, selectedEventId]);

  const toggleMonitor = (netId) => {
     if (monitoredNetIds.includes(netId)) {
        setMonitoredNetIds(prev => prev.filter(id => id !== netId));
     } else {
        setMonitoredNetIds(prev => [...prev, netId]);
     }
  };

  return (
    <div className="h-full bg-black text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col overflow-hidden">
      
      {/* Toolbar */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 justify-between shrink-0">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <Radio className="w-5 h-5 text-[#ea580c]" />
               <h2 className="font-bold text-zinc-300 tracking-wider text-sm uppercase">Comms Console</h2>
            </div>

            {/* Console Mode Switcher */}
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-sm p-0.5">
               <button
                  onClick={() => setConsoleMode('ops')}
                  className={cn(
                     "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                     consoleMode === 'ops' ? "bg-[#ea580c] text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
               >
                  Active Ops
               </button>
               <button
                  onClick={() => setConsoleMode('lounge')}
                  className={cn(
                     "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                     consoleMode === 'lounge' ? "bg-zinc-100 text-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
               >
                  Ready Rooms
               </button>
            </div>
         </div>

         {consoleMode === 'ops' && (
            <>
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
               <button 
                  onClick={() => setViewMode('tactical')}
                  className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${viewMode === 'tactical' ? 'bg-[#ea580c] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <Monitor className="w-3 h-3" />
                  TAC
               </button>
               <button 
                  onClick={() => setViewMode('diagnostics')}
                  className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${viewMode === 'diagnostics' ? 'bg-purple-900 text-purple-100' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <Activity className="w-3 h-3" />
                  TEST
               </button>
               </div>
               <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
               {selectedEventId && <FleetStatusSummary eventId={selectedEventId} />}
               </div>

               <Button
               variant="ghost"
               size="sm"
               onClick={() => setShowAIAssistant(!showAIAssistant)}
               className={cn("gap-2 text-[10px] uppercase font-bold border border-zinc-800 ml-2", showAIAssistant ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "text-zinc-500")}
               >
               <Bot className="w-3 h-3" />
               Chat with Riggsy
               </Button>
               </>
               )}
               </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Sidebar */}
         <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col">
            {consoleMode === 'ops' ? (
               <>
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 space-y-4">
                     <CommsEventSelector selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
                     {selectedEventId && <AIInsightsPanel eventId={selectedEventId} compact={true} />}
                  </div>
                  
                  <div className="flex-1 p-4 overflow-hidden custom-scrollbar">
                     {!selectedEventId ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center space-y-4">
                           <Monitor className="w-12 h-12 opacity-20" />
                           <p className="text-xs uppercase tracking-widest font-bold text-zinc-400">Waiting for Uplink</p>
                           <p className="text-[10px] text-zinc-500 font-mono">SELECT OPERATION //</p>
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
                              nets={memoizedNets} 
                              selectedNetId={selectedNet?.id} 
                              onSelect={setSelectedNet}
                              userSquadId={userSquadId}
                              viewMode={viewMode}
                              activityMap={recentActivity}
                              eventId={selectedEventId}
                              monitoredNetIds={monitoredNetIds}
                              onToggleMonitor={toggleMonitor}
                           />
                        )
                     )}
                  </div>
               </>
            ) : (
               <>
                  {/* Ready Rooms Sidebar */}
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
                     <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Ready Rooms</div>
                     <div className="text-[10px] text-zinc-600 font-mono">CASUAL & PUBLIC CHANNELS</div>
                  </div>
                  <div className="flex-1 p-2 overflow-hidden custom-scrollbar">
                     <ReadyRoomList 
                        user={currentUser} 
                        selectedChannelId={selectedChannel?.id} 
                        onSelect={setSelectedChannel} 
                     />
                  </div>
               </>
            )}
         </aside>

         {/* Main Panel */}
         <main className="flex-1 p-6 bg-black relative flex flex-col gap-4">
            {/* Background grid & Vignette */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(50,50,50,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50,50,50,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            
            <div className="relative z-10 h-full flex flex-col gap-4">
               {consoleMode === 'ops' ? (
                  // OPS MODE
                  selectedEventId ? (
                    viewMode === 'tactical' ? (
                       <TacticalDashboard eventId={selectedEventId} />
                    ) : viewMode === 'diagnostics' ? (
                       <VoiceDiagnostics user={currentUser} eventId={selectedEventId} />
                    ) : (
                       <ActiveNetPanel 
                          net={selectedNet} 
                          user={currentUser} 
                          eventId={selectedEventId} 
                       />
                    )
                  ) : (
                     <>
                        {/* Dashboard Widgets */}
                        <CurrentStatusHeader user={currentUser} />
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                           <PersonalLogPanel user={currentUser} />
                        </div>
                        <div className="shrink-0">
                           <AUECWarningPanel />
                        </div>
                     </>
                  )
               ) : (
                  // LOUNGE MODE (Ready Rooms)
                  selectedChannel ? (
                     <ChatInterface channel={selectedChannel} user={currentUser} />
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-900 rounded-lg bg-zinc-950/30">
                        <Hash className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm uppercase tracking-widest font-bold text-zinc-500">No Channel Selected</p>
                        <p className="text-xs mt-2 font-mono">SELECT A READY ROOM TO JOIN //</p>
                     </div>
                  )
               )}
            </div>
         </main>

         {/* Background Monitors */}
         {monitoredNetIds.map(netId => (
            selectedNet?.id !== netId && (
               <BackgroundNetMonitor 
                  key={netId} 
                  netId={netId} 
                  eventId={selectedEventId} 
                  user={currentUser} 
               />
            )
         ))}

         {/* Right Sidebar - Event Feed, AI Assistant, or Toolbox */}
         {consoleMode === 'ops' && (
            <div className="w-96 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0">
               {viewMode === 'tactical' ? (
                  <OperationalEventFeed eventId={selectedEventId} selectedNet={selectedNet} />
               ) : showAIAssistant ? (
                  <CommsAIAssistant 
                     eventId={selectedEventId} 
                     channelId={selectedChannel?.id}
                     user={currentUser} 
                  />
               ) : (
                  <CommsToolbox user={currentUser} eventId={selectedEventId} />
               )}
            </div>
         )}

      </div>
    </div>
  );
}