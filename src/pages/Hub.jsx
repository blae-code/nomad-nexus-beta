import React, { useState, useMemo, useCallback } from 'react';
import { createPageUrl } from "@/utils";
import { useNavigate } from 'react-router-dom';
import { useDashboardData, useCurrentUser } from '@/components/hooks/useAppData';
import { useRealtimeSubscriptions } from '@/components/hooks/useRealtimeSubscriptions';
import { Radio, Calendar, Shield, Coins, AlertCircle, Zap, Users, Target, TrendingUp, Star, Clock, Activity, Rocket, Award, Swords, ChevronRight, Flame, CircleDot, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import HubMetricsPanel from "@/components/dashboard/HubMetricsPanel";
import HubPersonalStats from "@/components/dashboard/HubPersonalStats";
import HubTabContent from "@/components/dashboard/HubTabContent";

const rankHierarchy = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState('ops');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const navigate = useNavigate();
  
  const user = useCurrentUser();
  const { data, isLoading } = useDashboardData(user);
  
  // Memoize navigation handlers
  const handleNavigateToEvents = useCallback(() => navigate(createPageUrl('Events')), [navigate]);
  const handleTabChange = useCallback((tab) => setActiveTab(tab), []);
  
  useRealtimeSubscriptions({
    enabled: !!user,
    entities: ['UserPresence', 'Event', 'EventLog', 'Incident', 'VoiceNet']
  });

  // Get user rank index
  const userRankIndex = useMemo(() => {
    return rankHierarchy.indexOf(user?.rank || 'Vagrant');
  }, [user?.rank]);

  // Extract data from centralized hook
  const userEvents = data?.events || [];
  const squadMemberships = data?.squadMemberships || [];
  const userSquads = data?.squads || [];
  const fleetAssets = data?.fleetAssets || [];
  const recentMessages = data?.recentMessages || [];
  const treasuryBalance = data?.treasuryBalance || 0;
  const activeIncidents = data?.activeIncidents || [];
  const onlineUsers = data?.onlineUsers || [];
  const allUsers = data?.allUsers || [];
  const voiceNets = data?.voiceNets || [];
  const recentLogs = data?.recentLogs || [];

  // Determine which features to show based on rank
  const showAdminFeatures = user?.role === 'admin';
  const canCreateEvents = userRankIndex >= rankHierarchy.indexOf('Voyager');
  const canManageFleet = userRankIndex >= rankHierarchy.indexOf('Scout');
  const canAccessTreasury = userRankIndex >= rankHierarchy.indexOf('Scout');
  const canAccessIntelligence = userRankIndex >= rankHierarchy.indexOf('Scout');

  // Calculate org engagement metrics
  const orgMetrics = useMemo(() => {
    const totalUsers = allUsers.length;
    const onlineCount = onlineUsers.length;
    const completedEvents = userEvents.filter(e => e.status === 'completed').length;
    const activeOps = userEvents.filter(e => e.status === 'active').length;
    
    return {
      activeMemberRate: totalUsers > 0 ? Math.round((onlineCount / totalUsers) * 100) : 0,
      activeOperations: activeOps,
      missionSuccessRate: 87,
      totalSquads: userSquads.length,
      alertStatus: activeIncidents.length > 0 ? 'ELEVATED' : 'NOMINAL',
      recentActivity: recentLogs.length
    };
  }, [allUsers.length, onlineUsers.length, userEvents, userSquads.length, activeIncidents.length, recentLogs.length]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-zinc-400 font-mono">LOADING OPERATIONAL DATA...</div>
        </div>
      </div>
    );
  }



  return (
    <div className="h-screen bg-[#09090b] text-zinc-200 overflow-auto flex flex-col">
      <div className="p-4 space-y-4 flex-shrink-0">
        {/* Immersive Org Identity Header - Collapsible */}
        <div className="border border-zinc-800 bg-gradient-to-br from-zinc-950 via-[#ea580c]/10 to-zinc-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ea580c]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-3xl" />

          {/* Collapse Toggle Bar - Always Visible */}
          <div 
            className="relative z-20 flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-900/30 transition-colors group border-b border-zinc-800/50"
            onClick={() => setHeaderCollapsed(!headerCollapsed)}
          >
            <span className="text-[9px] uppercase text-zinc-300 tracking-wider font-bold">OPERATIONAL CONTEXT</span>
            <motion.div animate={{ rotate: headerCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ea580c] transition-colors" />
            </motion.div>
          </div>

          <motion.div 
            initial={false}
            animate={{ height: headerCollapsed ? 0 : 'auto', opacity: headerCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative z-10 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-10 h-10 bg-[#ea580c] border-2 border-[#ea580c] flex items-center justify-center shadow-lg shadow-[#ea580c]/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-lg">NOMAD NEXUS</h1>
                    <p className="text-[10px] font-mono text-zinc-400 tracking-widest">AUTONOMOUS OPERATIONS NETWORK</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-13">
                  <Badge className={cn('text-[9px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
                    {user?.callsign || user?.rsi_handle || 'OPERATIVE'}
                  </Badge>
                  <Badge className="text-[8px] bg-zinc-800 text-zinc-200 border-zinc-700">{user?.rank || 'VAGRANT'}</Badge>
                  {user?.role === 'admin' && <Badge className="text-[8px] bg-[#ea580c] text-white border-[#ea580c]">ADMIN</Badge>}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[8px] text-zinc-500 uppercase mb-1 tracking-wider">Status</div>
                <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500">
                  <CircleDot className="w-2.5 h-2.5 mr-1 animate-pulse" />
                  NOMINAL
                </Badge>
                <div className="text-[9px] text-zinc-400 mt-2 font-mono">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Live Org Metrics */}
            <div className="space-y-2.5">
              <HubMetricsPanel 
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                orgMetrics={orgMetrics}
                activeIncidents={activeIncidents}
                canAccessTreasury={canAccessTreasury}
                treasuryBalance={treasuryBalance}
              />

              {/* Personal Stats Row - Collapsible */}
              <div className="border border-zinc-800 bg-zinc-950">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-900/50 transition-colors group"
                  onClick={() => setStatsCollapsed(!statsCollapsed)}
                >
                  <span className="text-[9px] uppercase text-zinc-300 tracking-wider font-bold">PERSONAL PERFORMANCE</span>
                  <motion.div animate={{ rotate: statsCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ea580c]" />
                  </motion.div>
                </div>
                <motion.div
                  initial={false}
                  animate={{ height: statsCollapsed ? 0 : 'auto', opacity: statsCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 border-t border-zinc-800">
                    <HubPersonalStats
                      userEvents={userEvents}
                      recentLogs={recentLogs}
                      squadMemberships={squadMemberships}
                      userRankIndex={userRankIndex}
                      user={user}
                      voiceNets={voiceNets}
                    />
                  </div>
                </motion.div>
            </motion.div>
          </div>

        {/* Live Operational Pulse */}
        {recentLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="border border-[#ea580c]/30 bg-zinc-950/80 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#ea580c] animate-pulse" />
                <span className="text-[9px] uppercase text-zinc-300 tracking-wider font-bold">OPERATIONAL PULSE</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-[7px] bg-[#ea580c] text-white border-[#ea580c] animate-pulse">LIVE</Badge>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors font-mono"
                >
                  VIEW ALL →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {recentLogs.slice(0, 4).map((log, i) => {
                const getNavigationTarget = (log) => {
                  if (log.event_id) return () => navigate(createPageUrl('Events'));
                  if (log.type === 'RESCUE') return () => navigate(createPageUrl('Rescue'));
                  if (log.type === 'COMMS') return () => navigate(createPageUrl('CommsConsole'));
                  return () => setActiveTab('activity');
                };
                
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={getNavigationTarget(log)}
                    className="bg-zinc-900/70 border border-zinc-800 p-2.5 hover:border-[#ea580c]/50 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c]/0 via-[#ea580c]/5 to-[#ea580c]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-start gap-2.5">
                      <div className={cn(
                        "w-6 h-6 flex items-center justify-center border shrink-0 transition-all group-hover:scale-110",
                        log.type === 'STATUS' && "bg-blue-500/20 border-blue-500 group-hover:bg-blue-500/30",
                        log.type === 'COMMS' && "bg-purple-500/20 border-purple-500 group-hover:bg-purple-500/30",
                        log.type === 'RESCUE' && "bg-red-500/20 border-red-500 group-hover:bg-red-500/30",
                        log.type === 'SYSTEM' && "bg-cyan-500/20 border-cyan-500 group-hover:bg-cyan-500/30",
                        log.type === 'NOTE' && "bg-zinc-600/20 border-zinc-600 group-hover:bg-zinc-600/30"
                      )}>
                        {log.type === 'STATUS' && <Target className="w-3 h-3 text-blue-300" />}
                        {log.type === 'COMMS' && <Radio className="w-3 h-3 text-purple-300" />}
                        {log.type === 'RESCUE' && <AlertCircle className="w-3 h-3 text-red-300" />}
                        {log.type === 'SYSTEM' && <Activity className="w-3 h-3 text-cyan-300" />}
                        {log.type === 'NOTE' && <Clock className="w-3 h-3 text-zinc-300" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-mono">{new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <Badge className={cn(
                              'text-[8px] px-1.5 py-0.5',
                              log.severity === 'HIGH' && 'bg-red-900/50 text-red-300 border-red-900',
                              log.severity === 'MEDIUM' && 'bg-yellow-900/50 text-yellow-300 border-yellow-900',
                              log.severity === 'LOW' && 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            )}>{log.type}</Badge>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#ea580c] transition-colors shrink-0" />
                        </div>
                        
                        <div className="text-[11px] text-zinc-100 line-clamp-2 font-medium leading-tight mb-1 group-hover:text-white transition-colors">
                          {log.summary}
                        </div>
                        
                        {log.details?.recommended_action && (
                          <div className="text-[9px] text-zinc-500 line-clamp-1 mt-1 flex items-center gap-1">
                            <span className="text-[#ea580c]">→</span>
                            {log.details.recommended_action}
                          </div>
                        )}
                        
                        {log.event_id && (
                          <div className="text-[9px] text-blue-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            EVENT LINKED
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{recentLogs.filter(l => l.severity === 'HIGH').length} Critical</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{recentLogs.filter(l => l.severity === 'MEDIUM').length} Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last: {recentLogs[0] ? new Date(recentLogs[0].created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}</span>
                </div>
              </div>
              <div className="text-[9px] text-zinc-600 font-mono">
                REFRESH: {Math.floor(Math.random() * 60)}s
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 gap-4 flex-1 min-h-0 pb-4">
          {/* Primary Content - Full Width */}
          <div className="space-y-4 flex flex-col min-h-0">
            {/* Primary Tabbed Interface */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-zinc-800 bg-zinc-950"
            >
              <div className="flex gap-0 border-b border-zinc-800 overflow-x-auto">
                {[
                  { id: 'ops', label: 'OPERATIONS', icon: Calendar },
                  { id: 'alerts', label: 'ALERTS & INCIDENTS', icon: AlertCircle },
                  { id: 'activity', label: 'ACTIVITY', icon: Activity },
                  { id: 'organization', label: 'ORGANIZATION', icon: Users },
                  { id: 'comms', label: 'COMMS', icon: Radio },
                ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-100 whitespace-nowrap border-b-2',
                        activeTab === tab.id
                          ? 'text-white bg-zinc-900 border-b-[#ea580c]'
                          : 'text-zinc-500 border-b-transparent hover:text-zinc-300 hover:bg-zinc-900/50'
                      )}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="p-4">
                  <HubTabContent
                    activeTab={activeTab}
                    userEvents={userEvents}
                    activeIncidents={activeIncidents}
                    recentLogs={recentLogs}
                    voiceNets={voiceNets}
                    onlineUsers={onlineUsers}
                    recentMessages={recentMessages}
                    userSquads={userSquads}
                    squadMemberships={squadMemberships}
                    fleetAssets={fleetAssets}
                    canManageFleet={canManageFleet}
                    user={user}
                    allUsers={allUsers}
                    orgMetrics={orgMetrics}
                    userRankIndex={userRankIndex}
                  />
                  {/* Legacy tab content removed - now handled by HubTabContent component */}
                  {false && activeTab === 'ops' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">MISSION BOARD</div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{userEvents.length} ACTIVE</Badge>
                          <Badge className="text-[7px] bg-emerald-900/40 text-emerald-300 border-emerald-700">{userEvents.filter(e => e.status === 'active').length} LIVE</Badge>
                        </div>
                      </div>
                      
                      {userEvents.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Target className="w-12 h-12 mx-auto text-zinc-600" />
                          <div className="text-sm font-bold text-zinc-400">NO ACTIVE OPERATIONS</div>
                          <div className="text-[9px] text-zinc-500">Awaiting mission assignment</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userEvents.map((event) => {
                            const startTime = new Date(event.start_time);
                            const timeUntil = Math.floor((startTime - new Date()) / 1000 / 60);
                            const isImmediate = timeUntil < 60;
                            
                            return (
                              <div key={event.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 hover:border-[#ea580c]/30 transition-all cursor-pointer group">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className={cn(
                                        'text-[7px] font-bold',
                                        event.status === 'active' && 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50',
                                        event.status === 'pending' && 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
                                        event.status === 'scheduled' && 'bg-blue-900/30 text-blue-400 border-blue-900/50'
                                      )}>{event.status}</Badge>
                                      <Badge variant="outline" className="text-[7px]">{event.priority}</Badge>
                                      <Badge variant="outline" className="text-[7px]">{event.event_type}</Badge>
                                    </div>
                                    <div className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-[#ea580c] transition-colors">{event.title}</div>
                                    <div className="text-[9px] text-zinc-400 line-clamp-2">{event.description || 'No briefing available'}</div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#ea580c] transition-colors shrink-0" />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Departure</div>
                                    <div className={cn("text-[9px] font-mono font-bold", isImmediate ? "text-[#ea580c]" : "text-zinc-300")}>
                                      {isImmediate ? 'IMMEDIATE' : timeUntil > 0 ? `T-${timeUntil}m` : 'ACTIVE'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Location</div>
                                    <div className="text-[9px] font-mono text-zinc-300 truncate">{event.location || 'TBD'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Personnel</div>
                                    <div className="text-[9px] font-mono text-zinc-300">{event.assigned_user_ids?.length || 0} assigned</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'alerts' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">SYSTEM ALERTS</div>
                        <Badge className={cn(
                          'text-[7px] font-bold',
                          activeIncidents.length > 0 ? 'bg-red-900/50 text-red-200 border-red-700 animate-pulse' : 'bg-emerald-900/50 text-emerald-200 border-emerald-700'
                        )}>
                          {activeIncidents.length > 0 ? 'ELEVATED' : 'NOMINAL'}
                        </Badge>
                      </div>
                      
                      <RescueAlertPanel />
                      
                      {recentLogs.filter(l => l.severity === 'HIGH' || l.type === 'RESCUE').length > 0 && (
                        <div className="space-y-2 mt-3">
                          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">HIGH PRIORITY LOG</div>
                          {recentLogs.filter(l => l.severity === 'HIGH' || l.type === 'RESCUE').slice(0, 3).map((log) => (
                            <div key={log.id} className="border border-red-900/30 bg-red-950/20 p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{log.type}</Badge>
                                <span className="text-[7px] text-zinc-400 font-mono">{new Date(log.created_date).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-[9px] text-red-200 font-medium">{log.summary}</div>
                              {log.details?.recommended_action && (
                                <div className="text-[8px] text-zinc-400 mt-1">→ {log.details.recommended_action}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-1">System Health</div>
                          <div className="text-sm font-bold text-emerald-300">98%</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-1">Avg Response</div>
                          <div className="text-sm font-bold text-cyan-300">2.4m</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-1">Active Nets</div>
                          <div className="text-sm font-bold text-blue-300">{voiceNets.length}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'incidents' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">INCIDENT TRACKING</div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{activeIncidents.length} ACTIVE</Badge>
                          {activeIncidents.some(i => i.severity === 'CRITICAL') && (
                            <Badge className="text-[7px] bg-red-900/50 text-red-200 border-red-700 animate-pulse">CRITICAL</Badge>
                          )}
                        </div>
                      </div>
                      
                      <LiveIncidentCenter />
                      
                      {activeIncidents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">INCIDENT DETAILS</div>
                          {activeIncidents.slice(0, 2).map((incident) => (
                            <div key={incident.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={cn(
                                      'text-[7px] font-bold',
                                      incident.severity === 'CRITICAL' && 'bg-red-900/50 text-red-300 border-red-900',
                                      incident.severity === 'HIGH' && 'bg-orange-900/50 text-orange-300 border-orange-900',
                                      incident.severity === 'MEDIUM' && 'bg-yellow-900/50 text-yellow-300 border-yellow-900'
                                    )}>{incident.severity}</Badge>
                                    <Badge variant="outline" className="text-[7px]">{incident.incident_type}</Badge>
                                  </div>
                                  <div className="text-sm font-bold text-zinc-100 mb-1">{incident.title}</div>
                                  <div className="text-[9px] text-zinc-400 line-clamp-2">{incident.description}</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-zinc-800/30">
                                <div>
                                  <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Status</div>
                                  <div className="text-[9px] font-mono text-zinc-300">{incident.status}</div>
                                </div>
                                <div>
                                  <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Location</div>
                                  <div className="text-[9px] font-mono text-zinc-300 truncate">{incident.affected_area || 'Unknown'}</div>
                                </div>
                                <div>
                                  <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Assigned</div>
                                  <div className="text-[9px] font-mono text-zinc-300">{incident.assigned_user_ids?.length || 0} personnel</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'feed' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">OPERATIONAL LOG</div>
                        <div className="flex items-center gap-1">
                          {['ALL', 'STATUS', 'COMMS', 'RESCUE', 'SYSTEM'].map((filter) => (
                            <button
                              key={filter}
                              className="px-2 py-1 text-[7px] font-mono text-zinc-300 border border-zinc-700 hover:border-[#ea580c] hover:text-zinc-100 transition-colors"
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Total Logs</div>
                          <div className="text-sm font-bold text-zinc-200">{recentLogs.length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">High Priority</div>
                          <div className="text-sm font-bold text-red-300">{recentLogs.filter(l => l.severity === 'HIGH').length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Your Activity</div>
                          <div className="text-sm font-bold text-cyan-300">{recentLogs.filter(l => l.actor_user_id === user?.id).length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Last Update</div>
                          <div className="text-[9px] font-mono text-zinc-300">
                            {recentLogs[0] ? new Date(recentLogs[0].created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto space-y-1">
                        <LiveOperationsFeed eventId={null} limit={15} />
                      </div>
                    </div>
                  )}
                  {activeTab === 'calendar' && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">EVENT CALENDAR</div>
                      <EventCalendarView />
                    </div>
                  )}
                  {activeTab === 'squads' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">SQUAD ROSTER</div>
                        <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{squadMemberships.length} ASSIGNMENTS</Badge>
                      </div>
                      
                      {userSquads.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Users className="w-12 h-12 mx-auto text-zinc-600" />
                          <div className="text-sm font-bold text-zinc-400">NO SQUAD ASSIGNMENTS</div>
                          <div className="text-[9px] text-zinc-500">Contact squad leadership for assignment</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userSquads.map((squad) => {
                            const membership = squadMemberships.find(m => m.squad_id === squad.id);
                            const isLeader = membership?.role === 'leader';
                            
                            return (
                              <div key={squad.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 hover:border-purple-500/30 transition-all cursor-pointer group">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-[7px]">{squad.hierarchy_level}</Badge>
                                      {isLeader && (
                                        <Badge className="text-[7px] bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/50">LEADER</Badge>
                                      )}
                                      {squad.icon && <div className="text-[9px]">{squad.icon}</div>}
                                    </div>
                                    <div className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-purple-400 transition-colors">{squad.name}</div>
                                    {squad.description && (
                                      <div className="text-[9px] text-zinc-400 line-clamp-2">{squad.description}</div>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-500 transition-colors shrink-0" />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Status</div>
                                    <div className="text-[9px] font-mono text-emerald-300">ACTIVE</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Your Role</div>
                                    <div className="text-[9px] font-mono text-zinc-300 uppercase">{membership?.role || 'member'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Joined</div>
                                    <div className="text-[9px] font-mono text-zinc-300">
                                      {membership?.joined_date ? new Date(membership.joined_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'fleet' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">FLEET REGISTRY</div>
                        {canManageFleet && (
                          <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{fleetAssets.length} VESSELS</Badge>
                        )}
                      </div>
                      
                      {!canManageFleet ? (
                        <div className="text-center py-16 space-y-2">
                          <Shield className="w-12 h-12 mx-auto text-zinc-600" />
                          <div className="text-sm font-bold text-zinc-400">INSUFFICIENT CLEARANCE</div>
                          <div className="text-[9px] text-zinc-500">Requires Scout rank or higher</div>
                        </div>
                      ) : fleetAssets.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Rocket className="w-12 h-12 mx-auto text-zinc-600" />
                          <div className="text-sm font-bold text-zinc-400">NO FLEET ASSETS</div>
                          <div className="text-[9px] text-zinc-500">Register vessels in Fleet Manager</div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Total Fleet</div>
                              <div className="text-sm font-bold text-zinc-200">{fleetAssets.length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Operational</div>
                              <div className="text-sm font-bold text-emerald-300">{fleetAssets.filter(a => a.status === 'operational').length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Deployed</div>
                              <div className="text-sm font-bold text-blue-300">{fleetAssets.filter(a => a.current_event_id).length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Maintenance</div>
                              <div className="text-sm font-bold text-yellow-300">0</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {fleetAssets.map((asset) => (
                              <div key={asset.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 hover:border-blue-500/30 transition-all cursor-pointer group">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-10 h-10 bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-900/30 shrink-0">
                                      <Rocket className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-zinc-100 mb-0.5 group-hover:text-blue-400 transition-colors">{asset.name}</div>
                                      <div className="text-[9px] text-zinc-400">{asset.model}</div>
                                    </div>
                                  </div>
                                  <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50 shrink-0">
                                    {asset.status?.toUpperCase() || 'OPERATIONAL'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Owner</div>
                                    <div className="text-[9px] font-mono text-zinc-300 truncate">{asset.owner_name || 'Org Fleet'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Location</div>
                                    <div className="text-[9px] font-mono text-zinc-300 truncate">{asset.current_location || 'Stanton'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-500 uppercase mb-0.5">Crew</div>
                                    <div className="text-[9px] font-mono text-zinc-300">{asset.crew_capacity || '1-4'}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {activeTab === 'comms' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">COMMS TRAFFIC</div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{voiceNets.length} NETS</Badge>
                          <Badge className="text-[7px] bg-blue-900/50 text-blue-200 border-blue-700">{onlineUsers.length} ONLINE</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Active Channels</div>
                          <div className="text-sm font-bold text-cyan-300">{voiceNets.filter(n => n.status === 'active').length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-400 uppercase mb-0.5">Recent Messages</div>
                          <div className="text-sm font-bold text-zinc-200">{recentMessages.length}</div>
                        </div>
                      </div>
                      
                      {voiceNets.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">VOICE NETWORKS</div>
                          {voiceNets.slice(0, 3).map((net) => (
                            <div key={net.id} className="border border-zinc-800/50 bg-zinc-900/30 p-2 hover:border-blue-500/30 transition-all cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Radio className="w-3 h-3 text-blue-400" />
                                  <div>
                                    <div className="text-[9px] font-bold text-zinc-200">{net.code}</div>
                                    <div className="text-[7px] text-zinc-400">{net.label}</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[7px]">{net.type}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {recentMessages.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Hash className="w-12 h-12 mx-auto text-zinc-600" />
                          <div className="text-sm font-bold text-zinc-400">NO RECENT TRAFFIC</div>
                          <div className="text-[9px] text-zinc-500">All channels quiet</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">LATEST MESSAGES</div>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {recentMessages.map((msg) => (
                              <div key={msg.id} className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-[8px] font-mono text-zinc-400">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                  <div className="text-[8px] text-cyan-400 font-mono truncate">#{msg.channel_id?.slice(0, 8)}</div>
                                </div>
                                <div className="text-[9px] text-zinc-300 line-clamp-2">{msg.content}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {false && activeTab === 'achievements' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">ACHIEVEMENT TRACKER</div>
                        <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">RANK {userRankIndex + 1}/5</Badge>
                      </div>
                      
                      {/* Rank Progress */}
                      <div className="border border-[#ea580c]/30 bg-gradient-to-br from-[#ea580c]/5 to-zinc-950 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#ea580c]" />
                            <span className="text-[9px] font-bold text-zinc-200 uppercase">Current Rank</span>
                          </div>
                          <Badge className={cn('text-[8px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
                            {user?.rank || 'VAGRANT'}
                          </Badge>
                        </div>
                        <div className="h-2 bg-zinc-900/50 border border-zinc-800/50 mb-1">
                          <div 
                            className="h-full bg-gradient-to-r from-[#ea580c] to-yellow-500 transition-all duration-300"
                            style={{ width: `${((userRankIndex + 1) / 5) * 100}%` }}
                          />
                        </div>
                        <div className="text-[7px] text-zinc-400 text-right">
                          {userRankIndex < 4 ? `Next: ${rankHierarchy[userRankIndex + 1]}` : 'Max Rank Achieved'}
                        </div>
                      </div>
                      
                      {/* Organization Achievements */}
                      <div>
                        <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider mb-2">ORGANIZATION MILESTONES</div>
                        <div className="space-y-2">
                          <div className="border border-[#ea580c]/20 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                                  <TrendingUp className="w-4 h-4 text-[#ea580c]" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Mission Success Streak</div>
                                  <div className="text-[8px] text-zinc-400">12 consecutive completions</div>
                                </div>
                              </div>
                              <Star className="w-4 h-4 text-[#ea580c]" />
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-[#ea580c] w-4/5" />
                            </div>
                          </div>
                          
                          <div className="border border-zinc-800/50 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-900/20 border border-emerald-900/50 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Member Milestone</div>
                                  <div className="text-[8px] text-zinc-400">{allUsers.length}/50 operatives</div>
                                </div>
                              </div>
                              {allUsers.length >= 50 && <Star className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min((allUsers.length / 50) * 100, 100)}%` }} />
                            </div>
                          </div>
                          
                          <div className="border border-zinc-800/50 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-cyan-900/20 border border-cyan-900/50 flex items-center justify-center">
                                  <Activity className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Active Operations</div>
                                  <div className="text-[8px] text-zinc-400">{orgMetrics.activeOperations}/10 concurrent</div>
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-cyan-500" style={{ width: `${(orgMetrics.activeOperations / 10) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Personal Achievements */}
                      <div>
                        <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider mb-2">PERSONAL PROGRESS</div>
                        <div className="space-y-2">
                          <div className="border border-blue-900/30 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-900/20 border border-blue-900/50 flex items-center justify-center">
                                  <Target className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Missions Completed</div>
                                  <div className="text-[8px] text-zinc-400">{userEvents.filter(e => e.status === 'completed').length}/25 operations</div>
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-blue-500" style={{ width: `${Math.min((userEvents.filter(e => e.status === 'completed').length / 25) * 100, 100)}%` }} />
                            </div>
                          </div>
                          
                          <div className="border border-zinc-800/50 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-cyan-900/20 border border-cyan-900/50 flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Activity Score</div>
                                  <div className="text-[8px] text-zinc-400">{recentLogs.filter(l => l.actor_user_id === user?.id).length}/50 actions</div>
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-cyan-500" style={{ width: `${Math.min((recentLogs.filter(l => l.actor_user_id === user?.id).length / 50) * 100, 100)}%` }} />
                            </div>
                          </div>
                          
                          <div className="border border-zinc-800/50 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-purple-900/20 border border-purple-900/50 flex items-center justify-center">
                                  <Swords className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-200">Squad Integration</div>
                                  <div className="text-[8px] text-zinc-400">{squadMemberships.length}/3 units</div>
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                              <div className="h-full bg-purple-500" style={{ width: `${Math.min((squadMemberships.length / 3) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>


          </div>
        </div>
      </div>
    </div>
  );
}