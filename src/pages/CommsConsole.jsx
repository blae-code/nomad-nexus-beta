import React from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TYPOGRAPHY } from "@/components/utils/typographySystem";
import PageLayout, { ScrollArea, Panel } from "@/components/layout/PageLayout";
import Divider from "@/components/layout/Divider";
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
import { Radio, ListTree, Bot, Hash, Search, Activity, AlertTriangle } from "lucide-react";
import CommsAIAssistant from "@/components/ai/CommsAIAssistant";
import CurrentStatusHeader from "@/components/dashboard/CurrentStatusHeader";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import AUECWarningPanel from "@/components/dashboard/AUECWarningPanel";
import TacticalDashboard from "@/components/comms/TacticalDashboard";
import CommsSearch from "@/components/comms/CommsSearch";
import AICommsSummarizer from "@/components/comms/AICommsSummarizer";
import AnomalyDetectionPanel from "@/components/ai/AnomalyDetectionPanel";
import SituationalAwarenessPanel from "@/components/ai/SituationalAwarenessPanel";
import WhisperInterface from "@/components/comms/WhisperInterface";
import CommsToolbar from "@/components/comms/CommsToolbar";
import CommsAdvancedDrawer from "@/components/comms/CommsAdvancedDrawer";
import ChannelManager from "@/components/comms/ChannelManager";
import IncidentForm from "@/components/incidents/IncidentForm";
import CommsSimulationPanel from "@/components/comms/CommsSimulationPanel";
import IncidentDashboard from "@/components/incidents/IncidentDashboard";
import DMThreadList from "@/components/comms/DMThreadList";
import ChannelCreateDialog from "@/components/comms/ChannelCreateDialog";
import MessageSearchPanel from "@/components/comms/MessageSearchPanel";
import WingStatusPropagation from "@/components/comms/WingStatusPropagation";
import FormationCallouts from "@/components/comms/FormationCallouts";
import FleetPingSystem from "@/components/comms/FleetPingSystem";
import RallyPointManager from "@/components/comms/RallyPointManager";
import NetDisciplineQueue from "@/components/comms/NetDisciplineQueue";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePTT } from "@/components/hooks/usePTT";
import PTTHud from "@/components/comms/PTTHud";
import NetSwitchOverlay from "@/components/comms/NetSwitchOverlay";
import { MessageCircle } from "lucide-react";
import { useCommsReadiness } from "@/components/comms/useCommsReadiness";
import { motion, AnimatePresence } from "framer-motion";
import CommsStepIndicator from "@/components/comms/CommsStepIndicator";
      import JoinNetButton from "@/components/comms/JoinNetButton";
      import CommsArrayPanel from "@/components/comms/CommsArrayPanel";
      import CommsStateChip from "@/components/comms/CommsStateChip";
import CommsFailoverBanner from "@/components/comms/CommsFailoverBanner";

function CommsConsolePage() {
  const [selectedEventId, setSelectedEventId] = React.useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    return eventId && eventId !== 'undefined' && eventId !== 'null' ? eventId : null;
  });
  // STATE SEPARATION: selection is independent from connection
  const [selectedNetId, setSelectedNetId] = React.useState(null);
  const [connectedNetId, setConnectedNetId] = React.useState(null);
  const [connectionState, setConnectionState] = React.useState('disconnected'); // disconnected | connecting | connected | error
  const [connectionError, setConnectionError] = React.useState(null);
  
  const [monitoredNetIds, setMonitoredNetIds] = React.useState([]);
  const [selectedChannel, setSelectedChannel] = React.useState(null);
  const [consoleMode, setConsoleMode] = React.useState("ops");
  const [viewMode, setViewMode] = React.useState("line");
  const [selectedDMId, setSelectedDMId] = React.useState(null);
  const [showDMPanel, setShowDMPanel] = React.useState(false);
  const [showMessageSearch, setShowMessageSearch] = React.useState(false);
  const [showAIAssistant, setShowAIAssistant] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userSquadId, setUserSquadId] = React.useState(null);
  const [incidentFormOpen, setIncidentFormOpen] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [authError, setAuthError] = React.useState(null);
  const [userPreferences, setUserPreferences] = React.useState({});
  const [showAdvancedDrawer, setShowAdvancedDrawer] = React.useState(false);
  const [showSimulation, setShowSimulation] = React.useState(false);
  const [provisionAttempts, setProvisionAttempts] = React.useState(0);
  
  // Compute effective comms mode (desired vs. actual readiness)
  const { effectiveMode, fallbackReason, retryLive, markFailover } = useCommsReadiness();

  // Expose markFailover globally for ActiveNetPanel to call on failures
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__commsMarkFailover = markFailover;
      return () => {
        delete window.__commsMarkFailover;
      };
    }
  }, [markFailover]);
  
  const { isTransmitting, pttKeyLabel, pttWarning } = usePTT(null, userPreferences);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          const returnUrl = typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : '/';
          base44.auth.redirectToLogin(returnUrl);
          return;
        }
        const user = await base44.auth.me();
        setCurrentUser(user);
        setUserPreferences(user?.commsPreferences || {});
      } catch (error) {
        console.error('Auth error:', error);
        setAuthError(error);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    loadUser();
  }, []);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
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
  const queryClient = useQueryClient();
  
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
    staleTime: 8000,
    refetchInterval: isProvisioningNets ? 1000 : false, // Only poll during provisioning
    gcTime: 20000
  });

  // Real-time subscription for voice net updates
  React.useEffect(() => {
    if (isProvisioningNets) return; // Skip subscription during provisioning

    const unsubscribe = base44.entities.VoiceNet.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['voice-nets', selectedEventId] });
    });

    return () => unsubscribe?.();
  }, [selectedEventId, isProvisioningNets, queryClient]);

  // Fetch recent comms activity for indicators (no polling, smaller batch)
  const { data: recentActivity } = useQuery({
    queryKey: ['comms-activity', selectedEventId],
    queryFn: async () => {
      try {
        const msgs = await base44.entities.Message.filter({}, '-created_date', 10);

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
    staleTime: 15000,
    refetchInterval: false,
    gcTime: 30000,
    initialData: {}
  });

  // Real-time subscription for activity updates
  React.useEffect(() => {
    if (!selectedEventId || voiceNets.length === 0) return;

    const unsubscribe = base44.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['comms-activity', selectedEventId] });
    });

    return () => unsubscribe?.();
  }, [selectedEventId, voiceNets.length, queryClient]);

  // Auto-trigger provisioning when event selected with no nets
  React.useEffect(() => {
    if (!selectedEventId) return;
    if (voiceNets.length > 0) {
      setProvisionAttempts(0);
      return;
    }
    if (isLoading || isProvisioningNets) return;
    if (provisionAttempts >= 3) return;

    setIsProvisioningNets(true);
    setProvisionAttempts((prev) => prev + 1);
    // Longer delay to avoid rate limiting
    const timeout = setTimeout(() => {
      refetchNets()
        .catch(() => {})
        .finally(() => {
          setIsProvisioningNets(false);
        });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [
    selectedEventId,
    voiceNets.length,
    isLoading,
    isProvisioningNets,
    refetchNets,
    provisionAttempts,
  ]);

  // Reset state when event changes
  React.useEffect(() => {
    setSelectedNetId(null);
    setConnectedNetId(null);
    setConnectionState('disconnected');
    setConnectionError(null);
    setMonitoredNetIds([]);
    setProvisionAttempts(0);
  }, [selectedEventId]);

  // Memoize nets to prevent unnecessary rerenders
  const selectedNet = React.useMemo(
    () => voiceNets.find(n => n.id === selectedNetId) || null,
    [selectedNetId, voiceNets]
  );

  // Handlers for connection state changes from ActiveNetPanel
  const handleConnectSuccess = React.useCallback((netId) => {
    setConnectedNetId(netId);
    setConnectionState('connected');
    setConnectionError(null);
  }, []);

  const handleConnecting = React.useCallback((netId) => {
    setConnectionState('connecting');
    setConnectionError(null);
  }, []);

  const handleDisconnect = React.useCallback(() => {
    setConnectedNetId(null);
    setConnectionState('disconnected');
    setConnectionError(null);
  }, []);

  const handleConnectionError = React.useCallback((error) => {
    setConnectionState('error');
    setConnectionError(error);
  }, []);

  const toggleMonitor = (netId) => {
     if (monitoredNetIds.includes(netId)) {
        setMonitoredNetIds(prev => prev.filter(id => id !== netId));
     } else {
        setMonitoredNetIds(prev => [...prev, netId]);
     }
  };

  const hasCommsAccess = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.rank));
  const hasCommsAccess = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.rank || currentUser.rank === 'Vagrant'));

  // Show loading state while authenticating
  if (isLoadingAuth) {
    return (
      <div className="h-full bg-black text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-[#ea580c] animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-500">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-full bg-black text-zinc-200 flex items-center justify-center p-6">
        <div className="border border-zinc-800 bg-zinc-950/80 p-6 text-center space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Auth Failed</div>
          <p className="text-xs text-zinc-500">Unable to verify your session. Please re-authenticate.</p>
          <Button
            size="sm"
            className="text-[10px] h-7 bg-[#ea580c] hover:bg-[#ea580c]/90"
            onClick={() => {
              const returnUrl = typeof window !== 'undefined'
                ? window.location.pathname + window.location.search
                : '/';
              base44.auth.redirectToLogin(returnUrl);
            }}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-full bg-black text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-[#ea580c] animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-500">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (!hasCommsAccess) {
    return (
      <div className="h-full bg-black text-zinc-200 flex items-center justify-center p-6">
        <div className="border border-zinc-800 bg-zinc-950/80 p-6 text-center space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Access Required</div>
          <p className="text-xs text-zinc-500">
            Your profile is still provisioning. Complete onboarding to access comms.
          </p>
          <Button
            size="sm"
            className="text-[10px] h-7 bg-[#ea580c] hover:bg-[#ea580c]/90"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/access-gate';
              }
            }}
          >
            Go to Access Gate
          </Button>
        </div>
      </div>
    );
  }

  // Handle DM selection
  const handleSelectDM = (thread) => {
    setSelectedDMId(thread.id);
    setConsoleMode('dms');
    setSelectedChannel(thread);
    setShowDMPanel(false);
  };

  // Build header actions based on mode
  const headerActions = (consoleMode === 'ops' || consoleMode === 'dms') ? (
    <div className="flex items-center gap-3">
      <CommsStateChip
        mode={effectiveMode}
        connectionState={connectionState}
        roomName={selectedNet?.code}
        participants={0}
        lastError={connectionError}
        onRetry={() => {
          if (selectedNet) {
            setConnectionState('disconnected');
            setConnectionError(null);
            // Re-select to trigger reconnect
            setSelectedNetId(null);
            setTimeout(() => setSelectedNetId(selectedNet.id), 100);
          }
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMessageSearch(true)}
        className="gap-2 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-mono">Msgs</span>
      </Button>
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
      
      {selectedEventId && <FleetStatusSummary eventId={selectedEventId} />}
      
      <WhisperInterface user={currentUser} eventId={selectedEventId} netId={selectedNet?.id} />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAIAssistant(!showAIAssistant)}
        className={cn("gap-2 text-[10px] uppercase font-bold border border-zinc-800", showAIAssistant ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "text-zinc-500")}
      >
        <Bot className="w-3 h-3" />
        AI ASSIST
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSimulation(!showSimulation)}
        className={cn("gap-2 text-[10px] uppercase font-bold border border-zinc-800", showSimulation ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "text-zinc-500")}
      >
        <Activity className="w-3 h-3" />
        SIMULATE
      </Button>
    </div>
  ) : null;

  return (
    <PageLayout title="Comms Array" actions={headerActions}>
      {/* Main 3-Column Grid */}
      <div className="h-full overflow-hidden flex gap-[var(--gutter)] p-[var(--gutter)]">
         {/* LEFT PANEL: Nets + Event Selector */}
         <Panel title={consoleMode === 'dms' ? 'DMs' : (consoleMode === 'ops' ? 'Voice Nets' : 'Channels')} className="w-64 flex flex-col overflow-hidden">
            {consoleMode === 'ops' ? (
                <>
                   <div className="shrink-0 px-[var(--space-lg)] py-[var(--space-md)]">
                      <CommsEventSelector selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
                      {selectedEventId && (
                        <>
                          <Divider spacing="md" />
                          <AICommsSummarizer eventId={selectedEventId} timeRangeMinutes={15} />
                        </>
                      )}
                      <Divider spacing="md" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDMPanel(!showDMPanel)}
                        className="w-full gap-2 text-[10px]"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Direct Messages
                      </Button>
                   </div>
                  
                  <ScrollArea className="flex-1">
                     <div className="p-[var(--space-lg)] space-y-2">
                        {isLoading ? (
                           <div className="text-center text-zinc-500 py-10 text-xs font-mono animate-pulse">SCANNING NETS...</div>
                        ) : isProvisioningNets ? (
                           <div className="text-center text-yellow-500 py-10 text-xs font-mono animate-pulse">
                              PROVISIONING...<br/><span className="text-[10px] text-zinc-600">Auto-refreshing</span>
                           </div>
                        ) : voiceNets.length === 0 ? (
                           <div className="text-center text-zinc-500 py-10 text-xs font-mono">
                              NO ACTIVE NETS<br/>INITIALIZE VIA OPS BOARD
                           </div>
                        ) : viewMode === 'hierarchy' ? (
                           <FleetHierarchy eventId={selectedEventId} />
                        ) : (
                           <NetList 
                              nets={memoizedNets} 
                              selectedNetId={selectedNetId}
                              onSelect={(net) => setSelectedNetId(net?.id || null)}
                              userSquadId={userSquadId}
                              viewMode={viewMode}
                              activityMap={recentActivity}
                              eventId={selectedEventId}
                              monitoredNetIds={monitoredNetIds}
                              onToggleMonitor={toggleMonitor}
                              effectiveMode={effectiveMode}
                           />
                        )}
                     </div>
                  </ScrollArea>
               </>
            ) : (
                <>
                   <div className="shrink-0 px-[var(--space-lg)] py-[var(--space-md)] space-y-2">
                      <ChannelCreateDialog />
                      <ChannelManager user={currentUser} />
                   </div>
                  <ScrollArea className="flex-1">
                     <div className="p-[var(--space-lg)]">
                        <ReadyRoomList 
                           user={currentUser} 
                           selectedChannelId={selectedChannel?.id} 
                           onSelect={setSelectedChannel} 
                        />
                     </div>
                  </ScrollArea>
                  </>
                  )}
                  </Panel>

                  {/* CENTER PANEL: Active Net / Chat */}
                  <Panel title={consoleMode === 'dms' ? 'Conversation' : (consoleMode === 'ops' ? 'Active Net' : 'Ready Room')} className="flex-1 flex flex-col overflow-hidden" body={false}>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {consoleMode === 'dms' ? (
                   selectedChannel ? (
                      <ChatInterface channel={selectedChannel} user={currentUser} />
                   ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600">
                         <div className="text-center">
                            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-sm uppercase tracking-widest">No Conversation Selected</p>
                         </div>
                      </div>
                   )
                ) : consoleMode === 'ops' ? (
                  selectedEventId ? (
                     viewMode === 'tactical' ? (
                        <TacticalDashboard eventId={selectedEventId} />
                     ) : (
                        <>
                           {/* Comms Toolbar */}
                           <div className="shrink-0">
                              <CommsToolbar
                                 selectedNet={selectedNet}
                                 connectionState={connectionState}
                                 onOpenAdvanced={() => setShowAdvancedDrawer(true)}
                                 isTransmitting={isTransmitting}
                                 mode={effectiveMode}
                                 participantCount={0}
                                 lastError={connectionError}
                                 onRetry={() => {
                                   setConnectionState('disconnected');
                                   setConnectionError(null);
                                   setSelectedNetId(null);
                                   setTimeout(() => setSelectedNetId(selectedNet?.id), 100);
                                 }}
                              />
                              <Divider spacing="none" />
                           </div>
                           
                           {/* Fallback Banner - only show if not viewing a net (general context) */}
                           {fallbackReason && !selectedNet && (
                             <CommsFailoverBanner
                               fallbackReason={fallbackReason}
                               onRetry={retryLive}
                             />
                           )}

                           {/* Active Net Chat */}
                           <div className="flex-1 min-h-0 overflow-hidden">
                              {selectedNet ? (
                                 <ActiveNetPanel 
                                    net={selectedNet} 
                                    user={currentUser} 
                                    eventId={selectedEventId}
                                    effectiveMode={effectiveMode}
                                    fallbackReason={fallbackReason}
                                    onRetryLive={retryLive}
                                    onConnectSuccess={handleConnectSuccess}
                                    onConnecting={handleConnecting}
                                    onDisconnect={handleDisconnect}
                                    onError={handleConnectionError}
                                 />
                              ) : (
                                 <div className="flex items-center justify-center h-full text-zinc-600">
                                    <div className="text-center">
                                       <Radio className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                       <p className="text-sm uppercase tracking-widest">SELECT A NET</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </>
                     )
                  ) : (
                     <ScrollArea className="flex-1">
                        <div className="p-[var(--space-lg)] space-y-3">
                           <CurrentStatusHeader user={currentUser} />
                           <PersonalLogPanel user={currentUser} />
                           <AUECWarningPanel />
                        </div>
                     </ScrollArea>
                  )
               ) : (
                  selectedChannel ? (
                     <ChatInterface channel={selectedChannel} user={currentUser} />
                  ) : (
                     <div className="flex items-center justify-center h-full text-zinc-600">
                        <div className="text-center">
                           <Hash className="w-16 h-16 mb-4 opacity-20" />
                           <p className="text-sm uppercase tracking-widest">No Channel Selected</p>
                        </div>
                     </div>
                  )
               )}
            </div>
         </Panel>

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

         {/* RIGHT PANEL: Fleet / Status / AI (OPS Mode) */}
         {consoleMode === 'ops' && (
            <Panel title={viewMode === 'tactical' ? 'Incidents' : 'Topology'} className="w-72 flex flex-col overflow-hidden" body={false}>
               {viewMode === 'tactical' ? (
                  <>
                     <ScrollArea className="flex-1">
                        <IncidentDashboard 
                           eventId={selectedEventId} 
                           onSelectIncident={setSelectedIncident}
                        />
                     </ScrollArea>
                     <div className="shrink-0">
                        <Divider spacing="none" />
                        <div className="p-[var(--space-lg)]">
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
                  </>
               ) : !showSimulation && !showAIAssistant ? (
                  <ScrollArea className="flex-1">
                     <div className="p-[var(--space-lg)]">
                        <CommsArrayPanel
                           eventId={selectedEventId}
                           currentUser={currentUser}
                           collapsed={effectiveMode !== 'LIVE'}
                           onWhisperStart={() => {}}
                        />
                     </div>
                  </ScrollArea>
               ) : showSimulation ? (
                 <ScrollArea className="flex-1">
                    <div className="p-[var(--space-lg)]">
                       <CommsSimulationPanel />
                    </div>
                 </ScrollArea>
               ) : showAIAssistant ? (
                 <ScrollArea className="flex-1">
                    <div className="p-[var(--space-lg)] space-y-3">
                       <SituationalAwarenessPanel eventId={selectedEventId} timeWindowMinutes={15} />
                       <AnomalyDetectionPanel eventId={selectedEventId} timeWindowMinutes={30} />
                       <CommsAIAssistant 
                          eventId={selectedEventId} 
                          channelId={selectedChannel?.id}
                          user={currentUser} 
                       />
                    </div>
                 </ScrollArea>
               ) : selectedNet ? (
                  <ScrollArea className="flex-1">
                     <div className="p-[var(--space-lg)] space-y-3">
                        <WingStatusPropagation eventId={selectedEventId} />
                        <FleetPingSystem eventId={selectedEventId} />
                        <FormationCallouts eventId={selectedEventId} currentNetId={selectedNet?.id} />
                        <RallyPointManager eventId={selectedEventId} currentNetId={selectedNet?.id} />
                        <NetDisciplineQueue netId={selectedNet?.id} />
                     </div>
                  </ScrollArea>
               ) : null}
            </Panel>
         )}

         </div>

         {/* Dialogs & Drawers */}
         {showSearch && <CommsSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />}
         {showMessageSearch && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
             <div className="w-full max-w-md h-96">
               <MessageSearchPanel
                 channelId={selectedChannel?.id}
                 dmChannelId={selectedDMId}
                 onSelectMessage={(msg) => {
                   // Scroll to message in chat
                 }}
                 onClose={() => setShowMessageSearch(false)}
                 currentUser={currentUser}
               />
             </div>
           </div>
         )}
         {showDMPanel && (
           <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50">
             <div className="w-80 h-full">
               <DMThreadList
                 currentUser={currentUser}
                 selectedDMId={selectedDMId}
                 onSelectDM={(thread) => {
                   setSelectedDMId(thread.id);
                   setConsoleMode('dms');
                   setSelectedChannel(thread);
                 }}
                 onClose={() => setShowDMPanel(false)}
               />
             </div>
           </div>
         )}
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
         <PTTHud
           isTransmitting={isTransmitting && selectedNetId}
           pttKey={pttKeyLabel}
           pttWarning={pttWarning}
           isMuted={!selectedNetId}
         />

         {/* Net Switch Overlay */}
         <NetSwitchOverlay 
           nets={memoizedNets} 
           selectedNet={selectedNet} 
           onSelectNet={setSelectedNet}
         />
         </PageLayout>
         );
         }

         export default function CommsConsoleWithErrorBoundary() {
         return (
         <ErrorBoundary>
         <CommsConsolePage />
         </ErrorBoundary>
         );
         }
