import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Radio, Calendar, Shield, Coins, AlertCircle, Zap, Users, Target, TrendingUp, Star, Clock, Activity, Rocket, Award, Swords, MapPin, ChevronRight, Flame, CircleDot } from "lucide-react";
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
    queryFn: () => base44.entities.UserPresence.filter({ status: ['online', 'in-call'] }),
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 hover:border-emerald-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] uppercase text-zinc-600 tracking-wider">Members</span>
                </div>
                <div className="text-2xl font-black text-white mb-0.5">{onlineUsers.length}</div>
                <div className="text-[7px] text-emerald-500">{orgMetrics.activeMemberRate}% online</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] uppercase text-zinc-600 tracking-wider">Operations</span>
                </div>
                <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.activeOperations}</div>
                <div className="text-[7px] text-blue-500">active missions</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 hover:border-purple-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-1.5">
                  <Swords className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] uppercase text-zinc-600 tracking-wider">Squads</span>
                </div>
                <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.totalSquads}</div>
                <div className="text-[7px] text-purple-500">operational units</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 hover:border-yellow-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] uppercase text-zinc-600 tracking-wider">Success Rate</span>
                </div>
                <div className="text-2xl font-black text-white mb-0.5">{orgMetrics.missionSuccessRate}%</div>
                <div className="text-[7px] text-yellow-500">mission efficiency</div>
              </div>

              {activeIncidents.length > 0 && (
                <div className="bg-red-950/30 border border-red-900/50 p-3 hover:border-red-500/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-[8px] uppercase text-red-600 tracking-wider">Alerts</span>
                  </div>
                  <div className="text-2xl font-black text-red-400 mb-0.5">{activeIncidents.length}</div>
                  <div className="text-[7px] text-red-500">{orgMetrics.alertStatus}</div>
                </div>
              )}

              {canAccessTreasury && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 hover:border-yellow-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Coins className="w-3.5 h-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] uppercase text-zinc-600 tracking-wider">Treasury</span>
                  </div>
                  <div className="text-2xl font-black text-white mb-0.5">{(treasuryBalance / 1000000).toFixed(1)}M</div>
                  <div className="text-[7px] text-yellow-500">aUEC reserves</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Bar with Enhanced Context */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
        >
          <Button 
            onClick={() => navigate(createPageUrl('CommsConsole'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50 hover:shadow-lg hover:shadow-[#ea580c]/10 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[#ea580c]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Radio className="w-4 h-4 text-[#ea580c] relative z-10" />
            <span className="text-[9px] font-bold uppercase relative z-10">Comms</span>
            {voiceNets.length > 0 && <Badge className="absolute top-1 right-1 text-[7px] h-3 px-1">{voiceNets.length}</Badge>}
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Events'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Calendar className="w-4 h-4 text-blue-500 relative z-10" />
            <span className="text-[9px] font-bold uppercase relative z-10">Operations</span>
            {userEvents.length > 0 && <Badge className="absolute top-1 right-1 text-[7px] h-3 px-1 bg-blue-600">{userEvents.length}</Badge>}
          </Button>
          {canManageFleet && (
            <Button 
              onClick={() => navigate(createPageUrl('FleetManager'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Rocket className="w-4 h-4 text-purple-500 relative z-10" />
              <span className="text-[9px] font-bold uppercase relative z-10">Fleet</span>
              {fleetAssets.length > 0 && <Badge className="absolute top-1 right-1 text-[7px] h-3 px-1 bg-purple-600">{fleetAssets.length}</Badge>}
            </Button>
          )}
          {canAccessTreasury && (
            <Button 
              onClick={() => navigate(createPageUrl('Treasury'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Coins className="w-4 h-4 text-yellow-500 relative z-10" />
              <span className="text-[9px] font-bold uppercase relative z-10">Treasury</span>
              <div className="text-[7px] text-zinc-600 relative z-10">{treasuryBalance.toLocaleString()}</div>
            </Button>
          )}
          {canAccessIntelligence && (
            <Button 
              onClick={() => navigate(createPageUrl('Intelligence'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Database className="w-4 h-4 text-cyan-500 relative z-10" />
              <span className="text-[9px] font-bold uppercase relative z-10">Intel</span>
            </Button>
          )}
          <Button 
            onClick={() => navigate(createPageUrl('Profile'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-zinc-600/50 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-zinc-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Settings className="w-4 h-4 text-zinc-500 relative z-10" />
            <span className="text-[9px] font-bold uppercase relative z-10">Profile</span>
          </Button>
        </motion.div>

        {/* Live Activity Stream */}
        {recentLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="border border-zinc-800/50 bg-zinc-950/30 p-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#ea580c]" />
                <span className="text-[8px] uppercase text-zinc-600 tracking-wider font-bold">LIVE ACTIVITY STREAM</span>
              </div>
              <Badge variant="outline" className="text-[7px]">REAL-TIME</Badge>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {recentLogs.slice(0, 8).map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/30 min-w-48 hover:border-[#ea580c]/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {log.type === 'STATUS' && <Gauge className="w-2.5 h-2.5 text-blue-500" />}
                      {log.type === 'COMMS' && <Radio className="w-2.5 h-2.5 text-purple-500" />}
                      {log.type === 'RESCUE' && <AlertCircle className="w-2.5 h-2.5 text-red-500" />}
                      {log.type === 'SYSTEM' && <Server className="w-2.5 h-2.5 text-cyan-500" />}
                      {log.type === 'NOTE' && <FileText className="w-2.5 h-2.5 text-zinc-500" />}
                      <span className="text-[7px] text-zinc-600">{new Date(log.created_date).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[8px] text-zinc-400 line-clamp-2">{log.summary}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-8 space-y-4">
            {/* Personal Status */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-zinc-800/50 bg-zinc-950"
            >
              <CurrentStatusHeader user={user} />
            </motion.div>

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
            {/* Clearance & Permissions */}
            <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
              <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider mb-3">CLEARANCE LEVEL</div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-zinc-500">Rank:</span>
                  <Badge className={getRankColorClass(user?.rank, 'bg')}>{user?.rank || 'VAGRANT'}</Badge>
                </div>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-zinc-500">Level:</span>
                  <span className="text-white font-mono">{userRankIndex + 1} / 5</span>
                </div>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-zinc-500">Online:</span>
                  <Badge variant="outline" className="text-[7px] bg-emerald-900/20 text-emerald-400 border-emerald-900/50">
                    {onlineUsers.length} OPERATIVES
                  </Badge>
                </div>
              </div>
            </div>

            {/* Feature Access */}
            <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
              <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider mb-3">ACCESS PRIVILEGES</div>
              <div className="grid grid-cols-2 gap-2 text-[8px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', 'bg-emerald-500')} />
                  <span>Comms Array</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canCreateEvents ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Create Ops</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canManageFleet ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Fleet Mgmt</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canAccessTreasury ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Treasury</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canAccessIntelligence ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Intelligence</span>
                </div>
                {showAdminFeatures && (
                  <div className="flex items-center gap-1.5 text-[#ea580c]">
                    <div className='w-1.5 h-1.5 rounded-full bg-[#ea580c]' />
                    <span>Admin Console</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications Center */}
            {notifications.length > 0 && (
              <div className="border border-yellow-900/50 bg-yellow-950/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase text-yellow-400 tracking-wider">NOTIFICATIONS</span>
                  </div>
                  <Badge variant="outline" className="text-[7px] bg-yellow-900/30 text-yellow-400 border-yellow-900/50">{notifications.length}</Badge>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="px-2 py-1.5 bg-zinc-900/50 border border-yellow-900/30 hover:border-yellow-600/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge className="text-[7px] bg-yellow-900/50 text-yellow-300 border-yellow-900">{notif.type}</Badge>
                        <span className="text-[7px] text-zinc-600">{new Date(notif.created_date).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[9px] text-yellow-200 font-bold mb-0.5">{notif.title}</div>
                      <div className="text-[8px] text-zinc-400 line-clamp-2">{notif.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Alerts */}
            {activeIncidents.length > 0 && (
              <div className="border border-red-900/50 bg-red-950/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase text-red-400 tracking-wider">ACTIVE INCIDENTS</span>
                  </div>
                  <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{activeIncidents.length} OPEN</Badge>
                </div>
                <div className="space-y-1.5">
                  {activeIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="px-2 py-1.5 bg-zinc-900/50 border border-red-900/30 hover:border-red-600/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{incident.severity}</Badge>
                        <Badge variant="outline" className="text-[7px]">{incident.status}</Badge>
                      </div>
                      <div className="text-[9px] text-red-300 font-bold mb-0.5">{incident.title}</div>
                      <div className="text-[7px] text-zinc-600">{incident.incident_type} • {new Date(incident.created_date).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Nets Status */}
            {voiceNets.length > 0 && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">VOICE NETS</span>
                  </div>
                  <Badge variant="outline" className="text-[7px]">{voiceNets.length} ACTIVE</Badge>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {voiceNets.slice(0, 5).map((net) => (
                    <div key={net.id} className="px-2 py-1 bg-zinc-900/50 border border-zinc-800/30 hover:border-purple-600/30 transition-colors cursor-pointer flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-zinc-300 font-bold">{net.code}</div>
                        <div className="text-[7px] text-zinc-600">{net.label}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <Badge className="text-[7px] bg-purple-900/30 text-purple-400 border-purple-900/50">{net.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">SYSTEM STATUS</span>
                </div>
                <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50">NOMINAL</Badge>
              </div>
              <div className="space-y-2.5 text-[8px]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-500">Comms Network:</span>
                    <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">ONLINE</Badge>
                  </div>
                  <Progress value={100} className="h-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-500">Fleet Systems:</span>
                    <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">NOMINAL</Badge>
                  </div>
                  <Progress value={systemHealth.uptime} className="h-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-500">Database:</span>
                    <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">SYNCED</Badge>
                  </div>
                  <Progress value={98} className="h-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-500">User Activity:</span>
                    <span className="text-emerald-400 font-mono">{systemHealth.userActivityRate}%</span>
                  </div>
                  <Progress value={systemHealth.userActivityRate} className="h-1" />
                </div>
              </div>
            </div>

            {/* Online Users Preview */}
            {onlineUsers.length > 0 && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider">ONLINE NOW</span>
                  </div>
                  <Badge variant="outline" className="text-[7px]">{onlineUsers.length} / {allUsers.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {onlineUsers.slice(0, 12).map((presence) => {
                    const onlineUser = allUsers.find(u => u.id === presence.user_id);
                    return onlineUser ? (
                      <Badge 
                        key={presence.id} 
                        variant="outline" 
                        className="text-[7px] bg-emerald-900/20 text-emerald-400 border-emerald-900/50"
                      >
                        {onlineUser.callsign || onlineUser.rsi_handle || 'User'}
                      </Badge>
                    ) : null;
                  })}
                  {onlineUsers.length > 12 && (
                    <Badge variant="outline" className="text-[7px]">
                      +{onlineUsers.length - 12} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Quick Links */}
            {showAdminFeatures && (
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
                <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider mb-2">ADMIN TOOLS</div>
                <Button 
                  onClick={() => navigate(createPageUrl('AdminConsole'))}
                  variant="outline"
                  size="sm"
                  className="w-full text-[9px] border-[#ea580c]/30 hover:border-[#ea580c] text-[#ea580c]"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  ADMIN CONSOLE
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}