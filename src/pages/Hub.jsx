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

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 lg:grid-cols-4">
          {/* Primary Dashboard (2 columns) */}
          <div className="col-span-3 lg:col-span-3 space-y-6">
            {/* Tabbed Work Area */}
            <div className="space-y-2">
              <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
                {[
                  { id: 'ops', label: 'OPERATIONS', icon: Calendar },
                  { id: 'alerts', label: 'ALERTS', icon: AlertCircle },
                  { id: 'incidents', label: 'INCIDENTS', icon: Zap },
                  { id: 'comms', label: 'FEED', icon: Activity },
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

              {/* Tab Content with Animation */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="border border-zinc-800/50 bg-zinc-950 min-h-96"
              >
                <div className="p-4">
                  {activeTab === 'ops' && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                        MISSION PROJECTION
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <EventProjectionPanel user={user} />
                      </div>
                    </div>
                  )}
                  {activeTab === 'alerts' && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                        STATUS ALERTS
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <RescueAlertPanel />
                      </div>
                    </div>
                  )}
                  {activeTab === 'incidents' && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                        LIVE INCIDENTS
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <LiveIncidentCenter />
                      </div>
                    </div>
                  )}
                  {activeTab === 'comms' && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                        OPERATIONAL FEED
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <LiveOperationsFeed eventId={null} limit={20} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Personalized Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userSquads.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-zinc-800/50 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[#ea580c]" />
                    <span className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">YOUR SQUADS</span>
                  </div>
                  <div className="space-y-1.5 text-[9px]">
                    {userSquads.slice(0, 3).map((squad) => (
                      <div key={squad.id} className="px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/30 flex items-center justify-between">
                        <span className="text-zinc-300">{squad.name}</span>
                        <span className="text-[8px] text-zinc-600 uppercase">{squad.hierarchy_level}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {canCreateEvents && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-zinc-800/50 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[#ea580c]" />
                    <span className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">QUICK START</span>
                  </div>
                  <div className="space-y-1.5">
                    <button 
                      onClick={() => navigate(createPageUrl('Events'))}
                      className="w-full px-2 py-1.5 bg-zinc-900/50 border border-zinc-800/50 hover:border-[#ea580c]/50 text-[9px] text-zinc-300 hover:text-[#ea580c] transition-colors uppercase font-bold"
                    >
                      + CREATE EVENT
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Personalized Dashboard */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-3 lg:col-span-1 border border-zinc-800/50 bg-zinc-950/50 p-4 h-fit space-y-4"
          >
            {/* Role-Based Info */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">CLEARANCE INFO</div>
              <div className="text-[8px] space-y-1.5 font-mono text-zinc-500">
                <div className="flex justify-between">
                  <span>Rank:</span>
                  <span className="text-white">{user?.rank || 'VAGRANT'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="text-white">{userRankIndex + 1}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="text-white">{user?.role === 'admin' ? 'ADMIN' : 'USER'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800/30" />

            {/* Features Available */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider">AVAILABLE FEATURES</div>
              <div className="space-y-1.5 text-[8px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canCreateEvents ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Create Events</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canManageFleet ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Fleet Manager</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canAccessTreasury ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Treasury Access</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className={cn('w-1.5 h-1.5 rounded-full', canAccessIntelligence ? 'bg-emerald-500' : 'bg-zinc-700')} />
                  <span>Intelligence</span>
                </div>
                {showAdminFeatures && (
                  <div className="flex items-center gap-1.5 text-[#ea580c]">
                    <div className='w-1.5 h-1.5 rounded-full bg-[#ea580c]' />
                    <span>Admin Panel</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800/30" />

            {/* Quick Navigation */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-zinc-600 tracking-wider mb-2">NAVIGATE</div>
              <div className="space-y-1 text-[9px]">
                <button 
                  onClick={() => navigate(createPageUrl('CommsConsole'))}
                  className="w-full text-left px-2 py-1.5 border border-zinc-800/30 hover:border-[#ea580c]/50 bg-zinc-900/50 hover:bg-zinc-900/70 text-zinc-400 hover:text-[#ea580c] transition-colors flex items-center gap-2"
                >
                  <Radio className="w-3 h-3" />
                  COMMS
                </button>
                <button 
                  onClick={() => navigate(createPageUrl('Events'))}
                  className="w-full text-left px-2 py-1.5 border border-zinc-800/30 hover:border-[#ea580c]/50 bg-zinc-900/50 hover:bg-zinc-900/70 text-zinc-400 hover:text-[#ea580c] transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-3 h-3" />
                  OPERATIONS
                </button>
                {canManageFleet && (
                  <button 
                    onClick={() => navigate(createPageUrl('FleetManager'))}
                    className="w-full text-left px-2 py-1.5 border border-zinc-800/30 hover:border-[#ea580c]/50 bg-zinc-900/50 hover:bg-zinc-900/70 text-zinc-400 hover:text-[#ea580c] transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-3 h-3" />
                    FLEET
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}