import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Radio, Calendar, Shield, Coins, AlertCircle, Zap, Users, Target, TrendingUp, Star, Clock, Activity, Rocket, Award, Swords, MapPin, ChevronRight, Flame, CircleDot, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import LiveOperationsFeed from "@/components/dashboard/LiveOperationsFeed";
import LiveIncidentCenter from "@/components/incidents/LiveIncidentCenter";
import EventCalendarView from "@/components/dashboard/EventCalendarView";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import CurrentStatusHeader from "@/components/dashboard/CurrentStatusHeader";

const rankHierarchy = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];

export default function HubPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ops');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Get user rank index
  const userRankIndex = useMemo(() => {
    return rankHierarchy.indexOf(user?.rank || 'Vagrant');
  }, [user?.rank]);

  // Determine which features to show based on rank
  const showAdminFeatures = user?.role === 'admin';
  const canCreateEvents = userRankIndex >= rankHierarchy.indexOf('Voyager');
  const canManageFleet = userRankIndex >= rankHierarchy.indexOf('Scout');
  const canAccessTreasury = userRankIndex >= rankHierarchy.indexOf('Scout');
  const canAccessIntelligence = userRankIndex >= rankHierarchy.indexOf('Scout');

  // Fetch comprehensive dashboard data
  const { data: userEvents = [] } = useQuery({
    queryKey: ['hub-user-events', user?.id],
    queryFn: () => user ? base44.entities.Event.filter({ status: ['active', 'pending', 'scheduled'] }, '-updated_date', 10) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: squadMemberships = [] } = useQuery({
    queryKey: ['hub-squad-memberships', user?.id],
    queryFn: () => user ? base44.entities.SquadMembership.filter({ user_id: user.id, status: 'active' }) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: userSquads = [] } = useQuery({
    queryKey: ['hub-squads', squadMemberships.map(m => m.squad_id).join(',')],
    queryFn: async () => {
      if (squadMemberships.length === 0) return [];
      const squads = await Promise.all(
        squadMemberships.map(m => base44.entities.Squad.get(m.squad_id).catch(() => null))
      );
      return squads.filter(Boolean);
    },
    enabled: squadMemberships.length > 0,
  });

  const { data: fleetAssets = [] } = useQuery({
    queryKey: ['hub-fleet-assets'],
    queryFn: () => base44.entities.FleetAsset.filter({ status: 'operational' }, '-updated_date', 5),
    enabled: !!user && canManageFleet,
    initialData: [],
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['hub-recent-messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5),
    enabled: !!user,
    initialData: [],
  });

  const { data: treasuryBalance } = useQuery({
    queryKey: ['hub-treasury'],
    queryFn: async () => {
      const coffers = await base44.entities.Coffer.list();
      return coffers.reduce((sum, c) => sum + (c.balance || 0), 0);
    },
    enabled: !!user && canAccessTreasury,
    initialData: 0,
  });

  const { data: activeIncidents = [] } = useQuery({
    queryKey: ['hub-incidents'],
    queryFn: () => base44.entities.Incident.filter({ status: ['active', 'responding'] }, '-created_date', 3),
    enabled: !!user,
    initialData: [],
  });

  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['hub-online-users'],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ status: ['online', 'in-call'] });
      // Filter out stale presence records (no activity in last 30 seconds)
      const now = new Date();
      return presences.filter(p => {
        if (!p.last_activity) return true; // Include if no timestamp
        const lastActivity = new Date(p.last_activity);
        const diffSeconds = (now - lastActivity) / 1000;
        return diffSeconds < 30; // Only count as online if activity within 30 seconds
      });
    },
    enabled: !!user,
    initialData: [],
    refetchInterval: 10000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['hub-all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
    initialData: [],
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['hub-voice-nets'],
    queryFn: () => base44.entities.VoiceNet.filter({ status: 'active' }),
    enabled: !!user,
    initialData: [],
    refetchInterval: 15000,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['hub-event-logs'],
    queryFn: () => base44.entities.EventLog.filter({}, '-created_date', 10),
    enabled: !!user,
    initialData: [],
    refetchInterval: 5000,
  });

  // Calculate org engagement metrics
  const orgMetrics = useMemo(() => {
    const totalUsers = allUsers.length;
    const onlineCount = onlineUsers.length;
    const completedEvents = userEvents.filter(e => e.status === 'completed').length;
    const activeOps = userEvents.filter(e => e.status === 'active').length;
    
    return {
      activeMemberRate: totalUsers > 0 ? Math.round((onlineCount / totalUsers) * 100) : 0,
      activeOperations: activeOps,
      missionSuccessRate: 87, // Could calculate from event outcomes
      totalSquads: userSquads.length,
      alertStatus: activeIncidents.length > 0 ? 'ELEVATED' : 'NOMINAL',
      recentActivity: recentLogs.length
    };
  }, [allUsers.length, onlineUsers.length, userEvents, userSquads.length, activeIncidents.length, recentLogs.length]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 overflow-auto">
      <div className="p-4 space-y-4">
        {/* Immersive Org Identity Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800/50 bg-gradient-to-br from-zinc-950 via-[#ea580c]/10 to-zinc-950 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ea580c]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-3xl" />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">NOMAD NEXUS</h1>
                    <p className="text-xs font-mono text-zinc-500 tracking-widest">AUTONOMOUS OPERATIONS NETWORK</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-[9px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
                    {user?.callsign || user?.rsi_handle || 'OPERATIVE'}
                  </Badge>
                  <Badge variant="outline" className="text-[8px]">{user?.rank || 'VAGRANT'}</Badge>
                  {user?.role === 'admin' && <Badge className="text-[8px] bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/50">ADMIN</Badge>}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[8px] text-zinc-600 uppercase mb-1">Operational Status</div>
                <Badge className="text-xs bg-emerald-900/30 text-emerald-400 border-emerald-900/50">
                  <CircleDot className="w-2.5 h-2.5 mr-1 animate-pulse" />
                  NOMINAL
                </Badge>
                <div className="text-[8px] text-zinc-600 mt-2 font-mono">
                  {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Live Org Metrics */}
            <div className="space-y-3">
              <div>
                <div className="text-[7px] uppercase text-zinc-500 tracking-widest mb-2 font-bold">ORGANIZATION STATUS</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-zinc-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Roster</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{allUsers.length}</div>
                    <div className="text-[7px] text-zinc-400 font-medium">total members</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-emerald-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Online</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{onlineUsers.length}</div>
                    <div className="text-[7px] text-emerald-400 font-medium">{orgMetrics.activeMemberRate}% active</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-blue-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Operations</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.activeOperations}</div>
                    <div className="text-[7px] text-blue-400 font-medium">active missions</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-purple-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Swords className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Squads</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.totalSquads}</div>
                    <div className="text-[7px] text-purple-400 font-medium">operational units</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-yellow-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Success Rate</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.missionSuccessRate}%</div>
                    <div className="text-[7px] text-yellow-400 font-medium">mission efficiency</div>
                  </div>

                  {activeIncidents.length > 0 && (
                    <div className="bg-red-950/50 border border-red-700 p-3 hover:border-red-400/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                        <span className="text-[8px] uppercase text-red-300 tracking-wider font-bold">Alerts</span>
                      </div>
                      <div className="text-2xl font-black text-red-200 mb-0.5">{activeIncidents.length}</div>
                      <div className="text-[7px] text-red-400 font-medium">{orgMetrics.alertStatus}</div>
                    </div>
                  )}

                  {canAccessTreasury && (
                    <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-yellow-400/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Coins className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Treasury</span>
                      </div>
                      <div className="text-2xl font-black text-white mb-0.5">{(treasuryBalance / 1000000).toFixed(1)}M</div>
                      <div className="text-[7px] text-yellow-400 font-medium">aUEC reserves</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Stats Row */}
              <div>
                <div className="text-[7px] uppercase text-zinc-500 tracking-widest mb-2 font-bold">PERSONAL PERFORMANCE</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-[#ea580c]/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="w-3.5 h-3.5 text-[#ea580c] group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Missions</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{userEvents.length}</div>
                    <div className="text-[7px] text-[#ea580c] font-medium">assigned ops</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-cyan-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Activity</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{recentLogs.filter(l => l.actor_user_id === user?.id).length}</div>
                    <div className="text-[7px] text-cyan-400 font-medium">recent actions</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-purple-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Swords className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Squads</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{squadMemberships.length}</div>
                    <div className="text-[7px] text-purple-400 font-medium">assignments</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-emerald-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Rank</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{userRankIndex + 1}</div>
                    <div className="text-[7px] text-emerald-400 font-medium">{user?.rank || 'VAGRANT'}</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-blue-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Comms</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">{voiceNets.length}</div>
                    <div className="text-[7px] text-blue-400 font-medium">available nets</div>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-zinc-400/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Activity className="w-3.5 h-3.5 text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] uppercase text-zinc-400 tracking-wider font-bold">Clearance</span>
                    </div>
                    <div className="text-2xl font-black text-white mb-0.5">L{userRankIndex + 1}</div>
                    <div className="text-[7px] text-zinc-400 font-medium">access level</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Operational Pulse */}
        {recentLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="border border-[#ea580c]/20 bg-zinc-950/50 p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#ea580c]" />
                <span className="text-[9px] uppercase text-zinc-600 tracking-wider font-bold">OPERATIONAL PULSE</span>
              </div>
              <Badge className="text-[7px] bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/50 animate-pulse">LIVE</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {recentLogs.slice(0, 4).map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-zinc-900/50 border border-zinc-800/50 p-2.5 hover:border-[#ea580c]/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-6 h-6 flex items-center justify-center border",
                      log.type === 'STATUS' && "bg-blue-900/20 border-blue-900/50",
                      log.type === 'COMMS' && "bg-purple-900/20 border-purple-900/50",
                      log.type === 'RESCUE' && "bg-red-900/20 border-red-900/50",
                      log.type === 'SYSTEM' && "bg-cyan-900/20 border-cyan-900/50",
                      log.type === 'NOTE' && "bg-zinc-800/20 border-zinc-800/50"
                    )}>
                      {log.type === 'STATUS' && <Target className="w-3 h-3 text-blue-500" />}
                      {log.type === 'COMMS' && <Radio className="w-3 h-3 text-purple-500" />}
                      {log.type === 'RESCUE' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      {log.type === 'SYSTEM' && <Activity className="w-3 h-3 text-cyan-500" />}
                      {log.type === 'NOTE' && <Clock className="w-3 h-3 text-zinc-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className={cn(
                          "text-[7px] font-bold",
                          log.type === 'STATUS' && "bg-blue-900/40 text-blue-200 border-blue-600",
                          log.type === 'COMMS' && "bg-purple-900/40 text-purple-200 border-purple-600",
                          log.type === 'RESCUE' && "bg-red-900/40 text-red-200 border-red-600",
                          log.type === 'SYSTEM' && "bg-cyan-900/40 text-cyan-200 border-cyan-600",
                          log.type === 'NOTE' && "bg-zinc-800/40 text-zinc-200 border-zinc-600"
                        )}>{log.type}</Badge>
                        <span className="text-[7px] text-zinc-500">{new Date(log.created_date).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[9px] text-zinc-200 line-clamp-2 font-medium">{log.summary}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-8 space-y-4">


            {/* Primary Tabbed Interface */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto mb-0">
                {[
                  { id: 'ops', label: 'OPERATIONS', icon: Calendar },
                  { id: 'alerts', label: 'ALERTS', icon: AlertCircle },
                  { id: 'incidents', label: 'INCIDENTS', icon: Zap },
                  { id: 'feed', label: 'FEED', icon: Activity },
                  { id: 'calendar', label: 'CALENDAR', icon: Clock },
                  { id: 'squads', label: 'SQUADS', icon: Users },
                  { id: 'fleet', label: 'FLEET', icon: Rocket },
                  { id: 'comms', label: 'COMMS', icon: Hash },
                  { id: 'achievements', label: 'ACHIEVEMENTS', icon: Award },
                ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-all duration-100 border-b-2 whitespace-nowrap',
                        activeTab === tab.id
                          ? 'text-[#ea580c] border-b-[#ea580c]'
                          : 'text-zinc-500 border-b-transparent hover:text-zinc-400'
                      )}
                    >
                      <TabIcon className="w-3 h-3" />
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
                className="border border-zinc-800/50 border-t-0 bg-zinc-950"
              >
                <div className="p-3">
                  {activeTab === 'ops' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">MISSION BOARD</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[7px]">{userEvents.length} ACTIVE</Badge>
                          <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50">{userEvents.filter(e => e.status === 'active').length} LIVE</Badge>
                        </div>
                      </div>
                      
                      {userEvents.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Target className="w-12 h-12 mx-auto text-zinc-700" />
                          <div className="text-sm font-bold text-zinc-600">NO ACTIVE OPERATIONS</div>
                          <div className="text-[9px] text-zinc-700">Awaiting mission assignment</div>
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
                                    <div className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-[#ea580c] transition-colors">{event.title}</div>
                                    <div className="text-[9px] text-zinc-500 line-clamp-2">{event.description || 'No briefing available'}</div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#ea580c] transition-colors shrink-0" />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Departure</div>
                                    <div className={cn("text-[9px] font-mono font-bold", isImmediate ? "text-[#ea580c]" : "text-zinc-400")}>
                                      {isImmediate ? 'IMMEDIATE' : timeUntil > 0 ? `T-${timeUntil}m` : 'ACTIVE'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Location</div>
                                    <div className="text-[9px] font-mono text-zinc-400 truncate">{event.location || 'TBD'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Personnel</div>
                                    <div className="text-[9px] font-mono text-zinc-400">{event.assigned_user_ids?.length || 0} assigned</div>
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
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">SYSTEM ALERTS</div>
                        <Badge className={cn(
                          'text-[7px]',
                          activeIncidents.length > 0 ? 'bg-red-900/30 text-red-400 border-red-900/50 animate-pulse' : 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50'
                        )}>
                          {activeIncidents.length > 0 ? 'ELEVATED' : 'NOMINAL'}
                        </Badge>
                      </div>
                      
                      <RescueAlertPanel />
                      
                      {recentLogs.filter(l => l.severity === 'HIGH' || l.type === 'RESCUE').length > 0 && (
                        <div className="space-y-2 mt-3">
                          <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">HIGH PRIORITY LOG</div>
                          {recentLogs.filter(l => l.severity === 'HIGH' || l.type === 'RESCUE').slice(0, 3).map((log) => (
                            <div key={log.id} className="border border-red-900/30 bg-red-950/20 p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{log.type}</Badge>
                                <span className="text-[7px] text-zinc-600 font-mono">{new Date(log.created_date).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-[9px] text-red-300 font-medium">{log.summary}</div>
                              {log.details?.recommended_action && (
                                <div className="text-[8px] text-zinc-500 mt-1">→ {log.details.recommended_action}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-1">System Health</div>
                          <div className="text-sm font-bold text-emerald-400">98%</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-1">Avg Response</div>
                          <div className="text-sm font-bold text-cyan-400">2.4m</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-1">Active Nets</div>
                          <div className="text-sm font-bold text-blue-400">{voiceNets.length}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'incidents' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">INCIDENT TRACKING</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[7px]">{activeIncidents.length} ACTIVE</Badge>
                          {activeIncidents.some(i => i.severity === 'CRITICAL') && (
                            <Badge className="text-[7px] bg-red-900/30 text-red-400 border-red-900/50 animate-pulse">CRITICAL</Badge>
                          )}
                        </div>
                      </div>
                      
                      <LiveIncidentCenter />
                      
                      {activeIncidents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">INCIDENT DETAILS</div>
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
                                  <div className="text-sm font-bold text-zinc-200 mb-1">{incident.title}</div>
                                  <div className="text-[9px] text-zinc-500 line-clamp-2">{incident.description}</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-zinc-800/30">
                                <div>
                                  <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Status</div>
                                  <div className="text-[9px] font-mono text-zinc-400">{incident.status}</div>
                                </div>
                                <div>
                                  <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Location</div>
                                  <div className="text-[9px] font-mono text-zinc-400 truncate">{incident.affected_area || 'Unknown'}</div>
                                </div>
                                <div>
                                  <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Assigned</div>
                                  <div className="text-[9px] font-mono text-zinc-400">{incident.assigned_user_ids?.length || 0} personnel</div>
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
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">OPERATIONAL LOG</div>
                        <div className="flex items-center gap-1">
                          {['ALL', 'STATUS', 'COMMS', 'RESCUE', 'SYSTEM'].map((filter) => (
                            <button
                              key={filter}
                              className="px-2 py-1 text-[7px] font-mono border border-zinc-800/50 hover:border-[#ea580c]/50 transition-colors"
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Total Logs</div>
                          <div className="text-sm font-bold text-zinc-300">{recentLogs.length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">High Priority</div>
                          <div className="text-sm font-bold text-red-400">{recentLogs.filter(l => l.severity === 'HIGH').length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Your Activity</div>
                          <div className="text-sm font-bold text-cyan-400">{recentLogs.filter(l => l.actor_user_id === user?.id).length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Last Update</div>
                          <div className="text-[9px] font-mono text-zinc-400">
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
                      <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">EVENT CALENDAR</div>
                      <EventCalendarView />
                    </div>
                  )}
                  {activeTab === 'squads' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">SQUAD ROSTER</div>
                        <Badge variant="outline" className="text-[7px]">{squadMemberships.length} ASSIGNMENTS</Badge>
                      </div>
                      
                      {userSquads.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Users className="w-12 h-12 mx-auto text-zinc-700" />
                          <div className="text-sm font-bold text-zinc-600">NO SQUAD ASSIGNMENTS</div>
                          <div className="text-[9px] text-zinc-700">Contact squad leadership for assignment</div>
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
                                    <div className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-purple-400 transition-colors">{squad.name}</div>
                                    {squad.description && (
                                      <div className="text-[9px] text-zinc-500 line-clamp-2">{squad.description}</div>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-500 transition-colors shrink-0" />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Status</div>
                                    <div className="text-[9px] font-mono text-emerald-400">ACTIVE</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Your Role</div>
                                    <div className="text-[9px] font-mono text-zinc-400 uppercase">{membership?.role || 'member'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Joined</div>
                                    <div className="text-[9px] font-mono text-zinc-400">
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
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">FLEET REGISTRY</div>
                        {canManageFleet && (
                          <Badge variant="outline" className="text-[7px]">{fleetAssets.length} VESSELS</Badge>
                        )}
                      </div>
                      
                      {!canManageFleet ? (
                        <div className="text-center py-16 space-y-2">
                          <Shield className="w-12 h-12 mx-auto text-zinc-700" />
                          <div className="text-sm font-bold text-zinc-600">INSUFFICIENT CLEARANCE</div>
                          <div className="text-[9px] text-zinc-700">Requires Scout rank or higher</div>
                        </div>
                      ) : fleetAssets.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <Rocket className="w-12 h-12 mx-auto text-zinc-700" />
                          <div className="text-sm font-bold text-zinc-600">NO FLEET ASSETS</div>
                          <div className="text-[9px] text-zinc-700">Register vessels in Fleet Manager</div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Total Fleet</div>
                              <div className="text-sm font-bold text-zinc-300">{fleetAssets.length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Operational</div>
                              <div className="text-sm font-bold text-emerald-400">{fleetAssets.filter(a => a.status === 'operational').length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Deployed</div>
                              <div className="text-sm font-bold text-blue-400">{fleetAssets.filter(a => a.current_event_id).length}</div>
                            </div>
                            <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                              <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Maintenance</div>
                              <div className="text-sm font-bold text-yellow-400">0</div>
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
                                      <div className="text-sm font-bold text-zinc-200 mb-0.5 group-hover:text-blue-400 transition-colors">{asset.name}</div>
                                      <div className="text-[9px] text-zinc-500">{asset.model}</div>
                                    </div>
                                  </div>
                                  <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50 shrink-0">
                                    {asset.status?.toUpperCase() || 'OPERATIONAL'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/30">
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Owner</div>
                                    <div className="text-[9px] font-mono text-zinc-400 truncate">{asset.owner_name || 'Org Fleet'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Location</div>
                                    <div className="text-[9px] font-mono text-zinc-400 truncate">{asset.current_location || 'Stanton'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Crew</div>
                                    <div className="text-[9px] font-mono text-zinc-400">{asset.crew_capacity || '1-4'}</div>
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
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">COMMS TRAFFIC</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[7px]">{voiceNets.length} NETS</Badge>
                          <Badge className="text-[7px] bg-blue-900/30 text-blue-400 border-blue-900/50">{onlineUsers.length} ONLINE</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Active Channels</div>
                          <div className="text-sm font-bold text-cyan-400">{voiceNets.filter(n => n.status === 'active').length}</div>
                        </div>
                        <div className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                          <div className="text-[7px] text-zinc-600 uppercase mb-0.5">Recent Messages</div>
                          <div className="text-sm font-bold text-zinc-300">{recentMessages.length}</div>
                        </div>
                      </div>
                      
                      {voiceNets.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">VOICE NETWORKS</div>
                          {voiceNets.slice(0, 3).map((net) => (
                            <div key={net.id} className="border border-zinc-800/50 bg-zinc-900/30 p-2 hover:border-blue-500/30 transition-all cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Radio className="w-3 h-3 text-blue-400" />
                                  <div>
                                    <div className="text-[9px] font-bold text-zinc-300">{net.code}</div>
                                    <div className="text-[7px] text-zinc-600">{net.label}</div>
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
                          <Hash className="w-12 h-12 mx-auto text-zinc-700" />
                          <div className="text-sm font-bold text-zinc-600">NO RECENT TRAFFIC</div>
                          <div className="text-[9px] text-zinc-700">All channels quiet</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">LATEST MESSAGES</div>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {recentMessages.map((msg) => (
                              <div key={msg.id} className="border border-zinc-800/50 bg-zinc-900/30 p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-[8px] font-mono text-zinc-500">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                  <div className="text-[8px] text-cyan-400 font-mono truncate">#{msg.channel_id?.slice(0, 8)}</div>
                                </div>
                                <div className="text-[9px] text-zinc-400 line-clamp-2">{msg.content}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'achievements' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">ACHIEVEMENT TRACKER</div>
                        <Badge variant="outline" className="text-[7px]">RANK {userRankIndex + 1}/5</Badge>
                      </div>
                      
                      {/* Rank Progress */}
                      <div className="border border-[#ea580c]/30 bg-gradient-to-br from-[#ea580c]/5 to-zinc-950 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#ea580c]" />
                            <span className="text-[9px] font-bold text-zinc-300 uppercase">Current Rank</span>
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
                        <div className="text-[7px] text-zinc-600 text-right">
                          {userRankIndex < 4 ? `Next: ${rankHierarchy[userRankIndex + 1]}` : 'Max Rank Achieved'}
                        </div>
                      </div>
                      
                      {/* Organization Achievements */}
                      <div>
                        <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider mb-2">ORGANIZATION MILESTONES</div>
                        <div className="space-y-2">
                          <div className="border border-[#ea580c]/20 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                                  <TrendingUp className="w-4 h-4 text-[#ea580c]" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Mission Success Streak</div>
                                  <div className="text-[8px] text-zinc-600">12 consecutive completions</div>
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
                                  <Users className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Member Milestone</div>
                                  <div className="text-[8px] text-zinc-600">{allUsers.length}/50 operatives</div>
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
                                  <Activity className="w-4 h-4 text-cyan-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Active Operations</div>
                                  <div className="text-[8px] text-zinc-600">{orgMetrics.activeOperations}/10 concurrent</div>
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
                        <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider mb-2">PERSONAL PROGRESS</div>
                        <div className="space-y-2">
                          <div className="border border-blue-900/30 bg-zinc-900/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-900/20 border border-blue-900/50 flex items-center justify-center">
                                  <Target className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Missions Completed</div>
                                  <div className="text-[8px] text-zinc-600">{userEvents.filter(e => e.status === 'completed').length}/25 operations</div>
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
                                  <Clock className="w-4 h-4 text-cyan-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Activity Score</div>
                                  <div className="text-[8px] text-zinc-600">{recentLogs.filter(l => l.actor_user_id === user?.id).length}/50 actions</div>
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
                                  <Swords className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300">Squad Integration</div>
                                  <div className="text-[8px] text-zinc-600">{squadMemberships.length}/3 units</div>
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