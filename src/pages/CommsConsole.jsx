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
import { Radio, Shield, Layout, Monitor, ListTree, Bot, Hash, Search, Activity, AlertTriangle } from "lucide-react";
import CommsAIAssistant from "@/components/ai/CommsAIAssistant";
import CurrentStatusHeader from "@/components/dashboard/CurrentStatusHeader";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import AUECWarningPanel from "@/components/dashboard/AUECWarningPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import TacticalStatusReporter from "@/components/comms/TacticalStatusReporter";
import TacticalDashboard from "@/components/comms/TacticalDashboard";
import CommsSearch from "@/components/comms/CommsSearch";
import AICommsSummarizer from "@/components/comms/AICommsSummarizer";
import CommsToolbar from "@/components/comms/CommsToolbar";
import CommsAdvancedDrawer from "@/components/comms/CommsAdvancedDrawer";
import ChannelManager from "@/components/comms/ChannelManager";
import IncidentForm from "@/components/incidents/IncidentForm";
import IncidentDashboard from "@/components/incidents/IncidentDashboard";
import WingStatusPropagation from "@/components/comms/WingStatusPropagation";
import FormationCallouts from "@/components/comms/FormationCallouts";
import FleetPingSystem from "@/components/comms/FleetPingSystem";
import RallyPointManager from "@/components/comms/RallyPointManager";
import NetDisciplineQueue from "@/components/comms/NetDisciplineQueue";
import { canAccessFocusedVoice } from "@/components/permissions";
import { cn } from "@/lib/utils";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePTT } from "@/components/hooks/usePTT";
import PTTHud from "@/components/comms/PTTHud";
import NetSwitchOverlay from "@/components/comms/NetSwitchOverlay";

function CommsConsolePage() {
  const [selectedEventId, setSelectedEventId] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    return eventId && eventId !== 'undefined' && eventId !== 'null' ? eventId : null;
  });
  const [selectedNet, setSelectedNet] = React.useState(null);
  const [monitoredNetIds, setMonitoredNetIds] = React.useState([]);
  const [selectedChannel, setSelectedChannel] = React.useState(null);
  const [activeNetConnection, setActiveNetConnection] = React.useState(null);
  const [consoleMode, setConsoleMode] = React.useState("ops");
  const [viewMode, setViewMode] = React.useState("line");
  const [showAIAssistant, setShowAIAssistant] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);
  const [incidentFormOpen, setIncidentFormOpen] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [userPreferences, setUserPreferences] = React.useState({});
  const [showAdvancedDrawer, setShowAdvancedDrawer] = React.useState(false);
  const { isTransmitting, pttKey } = usePTT(selectedNet, userPreferences);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.pathname + window.location.search);
          return;
        }
        const user = await base44.auth.me();
        setCurrentUser(user);
        setUserPreferences(user?.commsPreferences || {});
      } catch (error) {
        console.error('Auth error:', error);
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadUser();
  }, []);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Access Control Check - Removed, allow all logged-in users

  // Fetch squad assignment for this specific event
  useQuery({
    queryKey: ['console-user-squad', selectedEventId, currentUser?.id],
    queryFn: async () => {
       if (!selectedEventId || !currentUser) return null;

       try {
          // 1. Check Event Assignment
          const statuses = await base44.entities.PlayerStatus.filter({ 
             user_id: currentUser.id, 
             event_id: selectedEventId 
          });

          if (statuses?.length > 0 && statuses[0]?.assigned_squad_id) {
             setUserSquadId(statuses[0].assigned_squad_id);
             return statuses[0].assigned_squad_id;
          }

          // 2. Fallback to Global Squad
          const memberships = await base44.entities.SquadMembership.filter({ user_id: currentUser.id });
          if (memberships?.length > 0) {
             setUserSquadId(memberships[0].squad_id);
             return memberships[0].squad_id;
          }

          setUserSquadId(null);
          return null;
       } catch (error) {
          console.error('[COMMS] Squad lookup error:', error);
          return null;
       }
    },
    enabled: !!selectedEventId && !!currentUser
  });

  const [isProvisioningNets, setIsProvisioningNets] = React.useState(false);
  
  const { data: voiceNets, isLoading, refetch: refetchNets } = useQuery({
    queryKey: ['voice-nets', selectedEventId],
    queryFn: async () => {
      // Always fetch all available nets - event-specific + global
      const allNets = await base44.entities.VoiceNet.filter({}, 'priority', 100);
      
      // If event selected, show both event nets and global nets
      // If no event, show only global nets
      return selectedEventId 
        ? allNets.filter(n => !n.event_id || n.event_id === selectedEventId)
        : allNets.filter(n => !n.event_id);
    },
    initialData: [],
    refetchInterval: isProvisioningNets ? 1000 : false
  });

  // Fetch recent comms activity for indicators (reduced polling)
  const { data: recentActivity } = useQuery({
    queryKey: ['comms-activity', selectedEventId],
    queryFn: async () => {
      try {
        const msgs = await base44.entities.Message.filter({}, '-created_date', 20);

        // Map net codes to last activity timestamp
        const activity = {};
        msgs?.forEach(msg => {
          if (msg?.content?.includes('[COMMS LOG]')) {
             const match = msg.content.match(/TX on ([^:]+):/);
             if (match && match[1]) {
               const code = match[1];
               const net = voiceNets.find(n => n?.code === code);
               if (net) {
                 if (!activity[net.id] || new Date(msg.created_date) > new Date(activity[net.id])) {
                   activity[net.id] = msg.created_date;
                 }
               }
             }
          }
        });
        return activity;
      } catch (error) {
        console.error('[COMMS] Activity fetch error:', error);
        return {};
      }
    },
    enabled: voiceNets.length > 0,
    refetchInterval: 10000,
    initialData: {}
  });

  // Auto-trigger provisioning when event selected with no nets
  React.useEffect(() => {
     if (selectedEventId && voiceNets.length === 0 && !isLoading && !isProvisioningNets) {
        setIsProvisioningNets(true);
        // Polling will handle the refresh
        const timeout = setTimeout(() => {
           refetchNets().then(() => {
              setIsProvisioningNets(false);
           });
        }, 2000);
        return () => clearTimeout(timeout);
     }
  }, [selectedEventId, voiceNets.length, isLoading, isProvisioningNets, refetchNets]);

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

  // Show loading state while authenticating
  if (isLoadingAuth || !currentUser) {
    return (
      <div className="h-full bg-black text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-[#ea580c] animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-500">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 text-zinc-200 font-sans selection:bg-[#ea580c]/30 flex flex-col overflow-hidden">
      
      {/* Toolbar */}
      <div className="h-10 lg:h-12 border-b border-zinc-800 bg-zinc-900 flex items-center px-3 lg:px-6 justify-between shrink-0 z-40 gap-4">
         <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2">
               <Radio className="w-5 h-5 text-[#ea580c]" />
               <h2 className="font-bold text-zinc-300 tracking-wider text-sm uppercase">COMMS ARRAY</h2>
            </div>

            <Button
               variant="ghost"
               size="sm"
               onClick={() => setShowSearch(true)}
               className="gap-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
               <Search className="w-4 h-4" />
               <kbd className="hidden md:inline px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono">
                  ⌘K
               </kbd>
            </Button>

            {/* Console Mode Switcher */}
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-sm p-0.5">
               <button
                  onClick={() => setConsoleMode('ops')}
                  className={cn(
                     "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                     consoleMode === 'ops' ? "bg-[#ea580c] text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                  >
                  OPS
               </button>
               <button
                  onClick={() => setConsoleMode('lounge')}
                  className={cn(
                     "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                     consoleMode === 'lounge' ? "bg-zinc-100 text-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
                  >
                  READY ROOMS
               </button>
            </div>
         </div>

         {consoleMode === 'ops' && (
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

               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIAssistant(!showAIAssistant)}
                  className={cn("gap-2 text-[10px] uppercase font-bold border border-zinc-800", showAIAssistant ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "text-zinc-500")}
               >
                  <Bot className="w-3 h-3" />
                  AI ASSIST
               </Button>
            </div>
         )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Sidebar */}
         <aside className="w-56 lg:w-64 xl:w-72 border-r border-zinc-800 bg-zinc-950/80 flex flex-col overflow-hidden">
            {consoleMode === 'ops' ? (
               <>
                  <div className="p-3 border-b border-zinc-800 bg-zinc-900/20 space-y-2">
                     <CommsEventSelector selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
                     {selectedEventId && <AICriticalAlertsMonitor eventId={selectedEventId} />}
                     {selectedEventId && <AICommsSummarizer eventId={selectedEventId} timeRangeMinutes={15} />}
                  </div>
                  
                  <div className="flex-1 p-2 min-h-0 overflow-auto custom-scrollbar">
                     {isLoading ? (
                        <div className="text-center text-zinc-500 py-10 text-xs font-mono animate-pulse">SCANNING NETS...</div>
                     ) : isProvisioningNets ? (
                        <div className="text-center text-yellow-500 py-10 text-xs font-mono animate-pulse">
                           PROVISIONING COMMS...<br/><span className="text-[10px] text-zinc-600">Auto-refreshing nets</span>
                        </div>
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
                              onSelect={(net) => {
                                // Prevent joining multiple nets simultaneously
                                if (activeNetConnection && activeNetConnection !== net.id) {
                                  console.warn('[COMMS] Switching nets - disconnecting from previous net');
                                }
                                setSelectedNet(net);
                                setActiveNetConnection(net.id);
                              }}
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
                  <div className="p-3 border-b border-zinc-800 bg-zinc-900/20 space-y-2">
                     <div>
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">CHANNELS</div>
                        <div className="text-[10px] text-zinc-600 font-mono">PUBLIC COMMS</div>
                     </div>
                     <ChannelManager user={currentUser} />
                  </div>
                  <div className="flex-1 p-2 min-h-0 overflow-auto custom-scrollbar">
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
         <main className="flex-1 p-2 lg:p-3 bg-zinc-950 relative flex flex-col gap-2 lg:gap-3 overflow-hidden">
            
            <div className="h-full flex flex-col gap-2 lg:gap-3">
               {consoleMode === 'ops' ? (
                     // OPS MODE - Primary Active Net Panel
                     selectedEventId ? (
                       viewMode === 'tactical' ? (
                          <TacticalDashboard eventId={selectedEventId} />
                       ) : (
                          <>
                             {/* Comms Toolbar - Single source of truth for net actions */}
                             <CommsToolbar
                                selectedNet={selectedNet}
                                onSelectNet={(net) => {
                                  if (net) {
                                    setSelectedNet(net);
                                    setActiveNetConnection(net.id);
                                  } else {
                                    setSelectedNet(null);
                                    setActiveNetConnection(null);
                                  }
                                }}
                                isConnected={activeNetConnection === selectedNet?.id}
                                isTransmitting={isTransmitting}
                                onOpenAdvanced={() => setShowAdvancedDrawer(true)}
                                className="shrink-0"
                             />
                             {/* Active Net Chat/Info */}
                             {selectedNet ? (
                                <ActiveNetPanel 
                                   net={selectedNet} 
                                   user={currentUser} 
                                   eventId={selectedEventId}
                                   onConnectionChange={(netId, isConnected) => {
                                     if (isConnected) {
                                       setActiveNetConnection(netId);
                                     } else if (activeNetConnection === netId) {
                                       setActiveNetConnection(null);
                                     }
                                   }}
                                />
                             ) : (
                                <div className="flex-1 flex items-center justify-center text-zinc-600">
                                   <div className="text-center">
                                      <Radio className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                      <p className="text-sm uppercase tracking-widest">SELECT A NET TO BEGIN</p>
                                   </div>
                                </div>
                             )}
                          </>
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

         {/* Right Sidebar - Context-specific panels (no toolbox here anymore) */}
         {consoleMode === 'ops' && (
            <div className="w-64 lg:w-72 xl:w-80 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0">
               {viewMode === 'tactical' ? (
                  <div className="h-full flex flex-col">
                     <div className="flex-1 overflow-hidden">
                        <IncidentDashboard 
                           eventId={selectedEventId} 
                           onSelectIncident={setSelectedIncident}
                        />
                     </div>
                     <div className="p-3 border-t border-zinc-800">
                        <Button 
                           size="sm" 
                           onClick={() => setIncidentFormOpen(true)}
                           className="w-full bg-red-600 hover:bg-red-700 gap-2"
                        >
                           <AlertTriangle className="w-4 h-4" />
                           REPORT INCIDENT
                        </Button>
                     </div>
                  </div>
               ) : showAIAssistant ? (
                  <CommsAIAssistant 
                     eventId={selectedEventId} 
                     channelId={selectedChannel?.id}
                     user={currentUser} 
                  />
               ) : selectedNet ? (
                  <div className="h-full min-h-0 overflow-auto space-y-2 p-2">
                     <WingStatusPropagation eventId={selectedEventId} />
                     <FleetPingSystem eventId={selectedEventId} />
                     <FormationCallouts eventId={selectedEventId} currentNetId={selectedNet?.id} />
                     <RallyPointManager eventId={selectedEventId} currentNetId={selectedNet?.id} />
                     <NetDisciplineQueue netId={selectedNet?.id} />
                  </div>
               ) : null}
            </div>
         )}

      </div>

      {/* Dialogs & Drawers */}
      {showSearch && <CommsSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />}
      <IncidentForm 
        isOpen={incidentFormOpen} 
        onClose={() => setIncidentFormOpen(false)}
        eventId={selectedEventId}
        user={currentUser}
      />
      <CommsAdvancedDrawer
        isOpen={showAdvancedDrawer}
        onOpenChange={setShowAdvancedDrawer}
        user={currentUser}
        eventId={selectedEventId}
        selectedNet={selectedNet}
      />

      {/* PTT HUD */}
      <PTTHud isTransmitting={isTransmitting && selectedNet} pttKey={pttKey} isMuted={!selectedNet} />

      {/* Net Switch Overlay */}
      <NetSwitchOverlay 
        nets={memoizedNets} 
        selectedNet={selectedNet} 
        onSelectNet={setSelectedNet}
      />
      </div>
      );
      }

      export default function CommsConsoleWithErrorBoundary() {
      return (
      <ErrorBoundary>
      <CommsConsolePage />
      </ErrorBoundary>
      );
      }