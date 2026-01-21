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
                      <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">UPCOMING MISSIONS</div>
                      <EventProjectionPanel user={user} />
                    </div>
                  )}
                  {activeTab === 'alerts' && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">STATUS ALERTS</div>
                      <RescueAlertPanel />
                    </div>
                  )}
                  {activeTab === 'incidents' && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">ACTIVE INCIDENTS</div>
                      <LiveIncidentCenter />
                    </div>
                  )}
                  {activeTab === 'feed' && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">OPERATIONAL FEED</div>
                      <div className="max-h-80 overflow-y-auto">
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
                </div>
              </motion.div>
            </motion.div>

            {/* Secondary Panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Squads */}
              {userSquads.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border border-zinc-800/50 bg-zinc-950/50 p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">YOUR SQUADS</span>
                    </div>
                    <Badge variant="outline" className="text-[8px]">{userSquads.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {userSquads.slice(0, 4).map((squad) => (
                      <div key={squad.id} className="px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/30 flex items-center justify-between hover:border-[#ea580c]/30 transition-colors">
                        <span className="text-[9px] text-zinc-300 font-bold">{squad.name}</span>
                        <span className="text-[7px] text-zinc-600 uppercase">{squad.hierarchy_level}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Fleet Assets */}
              {canManageFleet && fleetAssets.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="border border-zinc-800/50 bg-zinc-950/50 p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">FLEET STATUS</span>
                    </div>
                    <Badge variant="outline" className="text-[8px]">{fleetAssets.length} READY</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {fleetAssets.slice(0, 4).map((asset) => (
                      <div key={asset.id} className="px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/30 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-zinc-300 font-bold">{asset.name}</div>
                          <div className="text-[7px] text-zinc-600">{asset.model}</div>
                        </div>
                        <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50">READY</Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recent Activity */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border border-zinc-800/50 bg-zinc-950/50 p-3"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">RECENT COMMS</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recentMessages.slice(0, 4).map((msg) => (
                    <div key={msg.id} className="px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/30">
                      <div className="text-[8px] text-zinc-500 mb-0.5">{new Date(msg.created_date).toLocaleTimeString()}</div>
                      <div className="text-[9px] text-zinc-400 line-clamp-2">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Personal Log */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="border border-zinc-800/50 bg-zinc-950/50 p-3"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">PERSONAL LOG</span>
                </div>
                <PersonalLogPanel user={user} />
              </motion.div>
            </div>
          </div>

          {/* Right Sidebar: Info & Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-4"
          >


            {/* Squad Engagement */}
            {userSquads.length > 0 && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">YOUR SQUADS</span>
                  </div>
                  <Badge variant="outline" className="text-[7px]">{userSquads.length} UNITS</Badge>
                </div>
                <div className="space-y-2">
                  {userSquads.map((squad) => (
                    <div key={squad.id} className="p-2.5 bg-zinc-900/30 border border-zinc-800/30 hover:border-purple-500/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-bold text-zinc-300 group-hover:text-purple-400 transition-colors">{squad.name}</div>
                        <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[7px]">{squad.hierarchy_level}</Badge>
                        <div className="text-[7px] text-zinc-600">{squad.description?.slice(0, 40)}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Alerts */}
            {activeIncidents.length > 0 && (
              <div className="border border-red-900/50 bg-red-950/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase text-red-400 tracking-wider">CRITICAL ALERTS</span>
                  </div>
                  <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900 animate-pulse">{activeIncidents.length} ACTIVE</Badge>
                </div>
                <div className="space-y-2">
                  {activeIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="p-2.5 bg-zinc-900/50 border border-red-900/30 hover:border-red-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{incident.severity}</Badge>
                        <span className="text-[7px] text-zinc-600">{new Date(incident.created_date).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[10px] text-red-300 font-bold mb-1 group-hover:text-red-200 transition-colors">{incident.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[7px]">{incident.status}</Badge>
                        <span className="text-[7px] text-zinc-600">{incident.incident_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mission Board Preview */}
            {userEvents.length > 0 && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">ACTIVE MISSIONS</span>
                  </div>
                  <Button 
                    onClick={() => navigate(createPageUrl('Events'))}
                    variant="ghost"
                    size="sm"
                    className="text-[8px] h-5 px-2 gap-1"
                  >
                    VIEW ALL
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {userEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="p-2.5 bg-zinc-900/30 border border-zinc-800/30 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-bold text-zinc-300 group-hover:text-blue-400 transition-colors truncate">{event.title}</div>
                        <Badge className={cn(
                          'text-[7px]',
                          event.status === 'active' && 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50',
                          event.status === 'pending' && 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
                          event.status === 'scheduled' && 'bg-blue-900/30 text-blue-400 border-blue-900/50'
                        )}>{event.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[7px] text-zinc-600">
                        <span>{event.event_type}</span>
                        <span>•</span>
                        <span>{event.priority}</span>
                        {event.start_time && <span>• {new Date(event.start_time).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fleet Assets Preview */}
            {canManageFleet && fleetAssets.length > 0 && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">FLEET READY</span>
                  </div>
                  <Badge variant="outline" className="text-[7px]">{fleetAssets.length} SHIPS</Badge>
                </div>
                <div className="space-y-1.5">
                  {fleetAssets.slice(0, 4).map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/30 hover:border-purple-500/30 transition-colors">
                      <div>
                        <div className="text-[9px] font-bold text-zinc-300">{asset.name}</div>
                        <div className="text-[7px] text-zinc-600">{asset.model}</div>
                      </div>
                      <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50">READY</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Org Achievements */}
            <div className="border border-zinc-800/50 bg-gradient-to-br from-zinc-950 to-[#ea580c]/5 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">ORG ACHIEVEMENTS</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-[#ea580c]/20">
                  <div className="w-6 h-6 bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[#ea580c]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-zinc-300">Mission Success Streak</div>
                    <div className="text-[7px] text-zinc-600">12 consecutive completions</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800/30">
                  <div className="w-6 h-6 bg-emerald-900/20 border border-emerald-900/50 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-zinc-300">Member Milestone</div>
                    <div className="text-[7px] text-zinc-600">{allUsers.length} operatives reached</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Achievements */}
            <div className="border border-zinc-800/50 bg-gradient-to-br from-zinc-950 to-blue-500/5 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">PERSONAL ACHIEVEMENTS</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-blue-900/30">
                  <div className="w-6 h-6 bg-blue-900/20 border border-blue-900/50 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-zinc-300">Missions Completed</div>
                    <div className="text-[7px] text-zinc-600">{userEvents.filter(e => e.status === 'completed').length} operations</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800/30">
                  <div className="w-6 h-6 bg-cyan-900/20 border border-cyan-900/50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-zinc-300">Recent Activity</div>
                    <div className="text-[7px] text-zinc-600">{recentLogs.filter(l => l.actor_user_id === user?.id).length} actions logged</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800/30">
                  <div className="w-6 h-6 bg-purple-900/20 border border-purple-900/50 flex items-center justify-center">
                    <Swords className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-zinc-300">Squad Assignments</div>
                    <div className="text-[7px] text-zinc-600">{squadMemberships.length} active units</div>
                  </div>
                </div>
              </div>
            </div>
                </motion.div>
                </div>
                </div>
                </div>
                );
                }