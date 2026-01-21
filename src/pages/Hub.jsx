import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Radio, Calendar, Shield, Coins, AlertCircle, Plus, Zap, Users, Target, TrendingUp, Star, Clock, Activity, Rocket, Hash, Bot, Bell, MapPin, Database, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 overflow-auto">
      <div className="p-4 space-y-4">
        {/* Hero Header with Live Stats */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800/50 bg-gradient-to-r from-zinc-950 via-[#ea580c]/5 to-zinc-950 p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ea580c]/5 blur-3xl -z-0" />
          <div className="relative z-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* User Info */}
            <div className="lg:col-span-4">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-1">
                COMMAND HUB
              </h1>
              <p className="text-xs font-mono text-zinc-500 tracking-widest mb-2">
                {user?.callsign || user?.rsi_handle || 'OPERATIVE'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-[9px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
                  {user?.rank || 'VAGRANT'}
                </Badge>
                {user?.role === 'admin' && (
                  <Badge className="text-[9px] font-bold border-[#ea580c]/50 bg-[#ea580c]/10 text-[#ea580c]">
                    SYSTEM ADMIN
                  </Badge>
                )}
                <Badge variant="outline" className="text-[9px]">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>
            </div>
            
            {/* Live Metrics Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3 h-3 text-emerald-500" />
                  <div className="text-[8px] uppercase text-zinc-600 tracking-wider">Online</div>
                </div>
                <div className="text-xl font-black text-white">{onlineUsers.length}</div>
              </div>
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <div className="text-[8px] uppercase text-zinc-600 tracking-wider">Events</div>
                </div>
                <div className="text-xl font-black text-white">{userEvents.length}</div>
              </div>
              <div className="border border-zinc-800/50 bg-zinc-950/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <div className="text-[8px] uppercase text-zinc-600 tracking-wider">Incidents</div>
                </div>
                <div className="text-xl font-black text-white">{activeIncidents.length}</div>
              </div>
              {canAccessTreasury && (
                <div className="border border-zinc-800/50 bg-zinc-950/50 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <div className="text-[8px] uppercase text-zinc-600 tracking-wider">aUEC</div>
                  </div>
                  <div className="text-xl font-black text-white">{treasuryBalance.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2"
        >
          <Button 
            onClick={() => navigate(createPageUrl('CommsConsole'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
          >
            <Radio className="w-4 h-4 text-[#ea580c]" />
            <span className="text-[9px] font-bold uppercase">Comms</span>
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Events'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-[9px] font-bold uppercase">Operations</span>
          </Button>
          {canManageFleet && (
            <Button 
              onClick={() => navigate(createPageUrl('FleetManager'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
            >
              <Rocket className="w-4 h-4 text-purple-500" />
              <span className="text-[9px] font-bold uppercase">Fleet</span>
            </Button>
          )}
          {canAccessTreasury && (
            <Button 
              onClick={() => navigate(createPageUrl('Treasury'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
            >
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-[9px] font-bold uppercase">Treasury</span>
            </Button>
          )}
          {canAccessIntelligence && (
            <Button 
              onClick={() => navigate(createPageUrl('Intelligence'))}
              variant="outline"
              className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
            >
              <Database className="w-4 h-4 text-cyan-500" />
              <span className="text-[9px] font-bold uppercase">Intel</span>
            </Button>
          )}
          <Button 
            onClick={() => navigate(createPageUrl('Profile'))}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-800/50 hover:border-[#ea580c]/50"
          >
            <Settings className="w-4 h-4 text-zinc-500" />
            <span className="text-[9px] font-bold uppercase">Profile</span>
          </Button>
        </motion.div>

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

            {/* Active Alerts */}
            {activeIncidents.length > 0 && (
              <div className="border border-red-900/50 bg-red-950/20 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase text-red-400 tracking-wider">ACTIVE INCIDENTS</span>
                </div>
                <div className="space-y-1.5">
                  {activeIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="px-2 py-1.5 bg-zinc-900/50 border border-red-900/30">
                      <div className="text-[9px] text-red-300 font-bold mb-0.5">{incident.title}</div>
                      <div className="flex items-center justify-between">
                        <Badge className="text-[7px] bg-red-900/50 text-red-300 border-red-900">{incident.severity}</Badge>
                        <span className="text-[7px] text-zinc-600">{incident.incident_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="border border-zinc-800/50 bg-zinc-950/50 p-3">
              <div className="text-[9px] font-bold uppercase text-zinc-600 tracking-wider mb-3">SYSTEM STATUS</div>
              <div className="space-y-2 text-[8px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Comms Network:</span>
                  <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">ONLINE</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Fleet Systems:</span>
                  <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">NOMINAL</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Database:</span>
                  <Badge className="text-[7px] bg-emerald-900/30 text-emerald-400">SYNCED</Badge>
                </div>
              </div>
            </div>

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