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
import HubAnalyticsPanel from "@/components/dashboard/HubAnalyticsPanel";
import MetricsChartPanel from "@/components/dashboard/MetricsChartPanel";
import IncidentHeatmap from "@/components/incidents/IncidentHeatmap";
import ReportExporter from "@/components/dashboard/ReportExporter";

const rankHierarchy = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState('ops');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [pulseCollapsed, setPulseCollapsed] = useState(false);
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
    <div className="h-screen bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-2.5 space-y-2 flex-shrink-0 overflow-y-auto max-h-fit">
          {/* Immersive Org Identity Header - Collapsible */}
          <div className="border border-zinc-800 bg-gradient-to-br from-zinc-950 via-[#ea580c]/10 to-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#ea580c]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-3xl" />

            {/* Collapse Toggle Bar - Always Visible */}
              <div 
                className="relative z-20 flex items-center justify-between p-1.5 cursor-pointer hover:bg-zinc-900/30 transition-colors group border-b border-zinc-800/50"
              >
                <div onClick={() => setHeaderCollapsed(!headerCollapsed)} className="flex-1 flex items-center gap-2">
                  <span className="text-[7px] uppercase text-zinc-300 tracking-wider font-bold">OPS CONTEXT</span>
                  <motion.div animate={{ rotate: headerCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-[#ea580c] transition-colors" />
                  </motion.div>
                </div>
              </div>

            <motion.div 
              initial={false}
              animate={{ height: headerCollapsed ? 0 : 'auto', opacity: headerCollapsed ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="relative z-10 p-1.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-[#ea580c] border-2 border-[#ea580c] flex items-center justify-center shadow-lg shadow-[#ea580c]/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tighter text-white drop-shadow-lg">NOMAD NEXUS</h1>
                  <p className="text-[8px] font-mono text-zinc-400 tracking-widest">OPERATIONS NETWORK</p>
                </div>
              </div>

              {/* Compact Metrics & Data */}
              <div className="space-y-2">
                <HubMetricsPanel 
                  allUsers={allUsers}
                  onlineUsers={onlineUsers}
                  orgMetrics={orgMetrics}
                  activeIncidents={activeIncidents}
                  canAccessTreasury={canAccessTreasury}
                  treasuryBalance={treasuryBalance}
                />

                <MetricsChartPanel 
                  userEvents={userEvents}
                  allUsers={allUsers}
                  recentLogs={recentLogs}
                  treasuryBalance={treasuryBalance}
                />
              </div>
              </div>
            </motion.div>
          </div>

          {/* Live Operational Pulse - Compact */}
          {recentLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border border-[#ea580c]/30 bg-zinc-950/80"
            >
              <div 
                onClick={() => setPulseCollapsed(!pulseCollapsed)}
                className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3 text-[#ea580c] animate-pulse" />
                  <span className="text-[8px] uppercase text-zinc-300 tracking-wider font-bold">PULSE</span>
                  <Badge className="text-[6px] bg-[#ea580c] text-white border-[#ea580c] animate-pulse">LIVE</Badge>
                </div>
                <motion.div animate={{ rotate: pulseCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                </motion.div>
                </div>

                <motion.div
                initial={false}
                animate={{ height: pulseCollapsed ? 0 : 'auto', opacity: pulseCollapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
                >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 p-1.5 border-t border-zinc-800/30">
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
                      className="bg-zinc-900/70 border border-zinc-800 p-1.5 hover:border-[#ea580c]/50 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c]/0 via-[#ea580c]/5 to-[#ea580c]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative flex items-start gap-1.5 text-[9px]">
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center border shrink-0 transition-all group-hover:scale-110",
                          log.type === 'STATUS' && "bg-blue-500/20 border-blue-500 group-hover:bg-blue-500/30",
                          log.type === 'COMMS' && "bg-purple-500/20 border-purple-500 group-hover:bg-purple-500/30",
                          log.type === 'RESCUE' && "bg-red-500/20 border-red-500 group-hover:bg-red-500/30",
                          log.type === 'SYSTEM' && "bg-cyan-500/20 border-cyan-500 group-hover:bg-cyan-500/30",
                          log.type === 'NOTE' && "bg-zinc-600/20 border-zinc-600 group-hover:bg-zinc-600/30"
                        )}>
                          {log.type === 'STATUS' && <Target className="w-2.5 h-2.5 text-blue-300" />}
                          {log.type === 'COMMS' && <Radio className="w-2.5 h-2.5 text-purple-300" />}
                          {log.type === 'RESCUE' && <AlertCircle className="w-2.5 h-2.5 text-red-300" />}
                          {log.type === 'SYSTEM' && <Activity className="w-2.5 h-2.5 text-cyan-300" />}
                          {log.type === 'NOTE' && <Clock className="w-2.5 h-2.5 text-zinc-300" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[8px] text-zinc-500 font-mono">{new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <Badge className={cn(
                              'text-[6px] px-1 py-0',
                              log.severity === 'HIGH' && 'bg-red-900/50 text-red-300 border-red-900',
                              log.severity === 'MEDIUM' && 'bg-yellow-900/50 text-yellow-300 border-yellow-900',
                              log.severity === 'LOW' && 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            )}>{log.type}</Badge>
                          </div>
                          <div className="text-[9px] text-zinc-100 line-clamp-1 font-medium group-hover:text-white transition-colors">
                            {log.summary}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                  })}
                  </div>
                  </motion.div>
                  </motion.div>
                  )}
        </div>

        {/* Main Dashboard Grid */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="space-y-0 flex flex-col min-h-0 flex-1 p-2">
            {/* Primary Tabbed Interface */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-zinc-800 bg-zinc-950 flex-1 min-h-0 flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="flex gap-0 border-b border-zinc-800 overflow-x-auto shrink-0 bg-zinc-900/30">
                {[
                    { id: 'ops', label: 'OPS', icon: Calendar },
                    { id: 'alerts', label: 'ALERTS', icon: AlertCircle },
                    { id: 'activity', label: 'ACTIVITY', icon: Activity },
                    { id: 'analytics', label: 'ANALYTICS', icon: TrendingUp },
                    { id: 'organization', label: 'ORG', icon: Users },
                    { id: 'comms', label: 'COMMS', icon: Radio },
                  ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1.5 text-[7px] font-bold uppercase tracking-wider transition-all duration-100 whitespace-nowrap border-b-2',
                        activeTab === tab.id
                          ? 'text-white bg-zinc-900 border-b-[#ea580c]'
                          : 'text-zinc-500 border-b-transparent hover:text-zinc-300'
                      )}
                    >
                      <TabIcon className="w-2.5 h-2.5" />
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
                className="flex-1 min-h-0 overflow-auto flex-shrink-0"
              >
                <div className="p-2 h-full">
                   {activeTab === 'analytics' ? (
                     <HubAnalyticsPanel
                       userEvents={userEvents}
                       allUsers={allUsers}
                       recentLogs={recentLogs}
                       voiceNets={voiceNets}
                       user={user}
                     />
                   ) : (
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