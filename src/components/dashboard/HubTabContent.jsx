import { useState } from 'react';
import { Target, AlertCircle, Users, Rocket, Hash, ChevronRight, Radio, Clock, Activity, Shield, TrendingUp, Star, Swords, Award, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import RescueAlertPanel from './RescueAlertPanel';
import LiveIncidentCenter from '../incidents/LiveIncidentCenter';
import LiveOperationsFeed from './LiveOperationsFeed';
import PersonalLogPanel from './PersonalLogPanel';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HubTabContent({ 
  activeTab, 
  userEvents, 
  activeIncidents, 
  recentLogs, 
  voiceNets, 
  onlineUsers, 
  recentMessages,
  userSquads,
  squadMemberships,
  fleetAssets,
  canManageFleet,
  user,
  allUsers = [],
  orgMetrics = {},
  userRankIndex = 0
}) {
  const [achievementsTab, setAchievementsTab] = useState('org');

  if (activeTab === 'ops') {
    return <OpsTab userEvents={userEvents} />;
  }
  
  if (activeTab === 'alerts') {
    return <AlertsAndIncidentsTab activeIncidents={activeIncidents} recentLogs={recentLogs} voiceNets={voiceNets} />;
  }
  
  if (activeTab === 'activity') {
    return <ActivityTab recentLogs={recentLogs} recentMessages={recentMessages} user={user} />;
  }
  
  if (activeTab === 'organization') {
    return <OrganizationTab 
      userSquads={userSquads} 
      squadMemberships={squadMemberships}
      fleetAssets={fleetAssets}
      canManageFleet={canManageFleet}
      allUsers={allUsers}
      orgMetrics={orgMetrics}
      user={user}
      userEvents={userEvents}
      recentLogs={recentLogs}
      userRankIndex={userRankIndex}
      achievementsTab={achievementsTab}
      setAchievementsTab={setAchievementsTab}
    />;
  }
  
  if (activeTab === 'comms') {
    return <CommsTab voiceNets={voiceNets} onlineUsers={onlineUsers} recentMessages={recentMessages} />;
  }
  
  return null;
}

function RecentCommsTab({ recentMessages }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">RECENT COMMUNICATIONS</div>
        <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{recentMessages.length} MESSAGES</Badge>
      </div>
      
      {recentMessages.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Hash className="w-12 h-12 mx-auto text-zinc-600" />
          <div className="text-sm font-bold text-zinc-400">NO RECENT MESSAGES</div>
          <div className="text-[9px] text-zinc-500">All channels quiet</div>
        </div>
      ) : (
        <div className="space-y-2">
          {recentMessages.map((msg) => (
            <div key={msg.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[8px] font-mono text-zinc-400">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                <div className="text-[8px] text-cyan-400 font-mono truncate">#{msg.channel_id?.slice(0, 8)}</div>
              </div>
              <div className="text-[10px] text-zinc-200 leading-relaxed">{msg.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonalLogTab({ user }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">PERSONAL NOTIFICATIONS</div>
      </div>
      <PersonalLogPanel user={user} />
    </div>
  );
}


function AchievementsTab({ achievementsTab, setAchievementsTab, allUsers, orgMetrics, user, userEvents, recentLogs, squadMemberships, userRankIndex }) {
  const rankHierarchy = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setAchievementsTab('org')}
          className={cn(
            'px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all',
            achievementsTab === 'org'
              ? 'bg-[#ea580c] text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          )}
        >
          Organization
        </button>
        <button
          onClick={() => setAchievementsTab('personal')}
          className={cn(
            'px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all',
            achievementsTab === 'personal'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          )}
        >
          Personal
        </button>
      </div>

      {achievementsTab === 'org' ? (
        <div className="space-y-4">
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">ORGANIZATION MILESTONES</div>
          <div className="space-y-2">
          <div className="border border-[#ea580c]/20 bg-zinc-900/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#ea580c]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-200">Operation Success Streak</div>
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
                    <div className="text-[8px] text-zinc-400">{orgMetrics.activeOperations || 0}/10 concurrent</div>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                <div className="h-full bg-cyan-500" style={{ width: `${((orgMetrics.activeOperations || 0) / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
          
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">PERSONAL PROGRESS</div>
          <div className="space-y-2">
            <div className="border border-blue-900/30 bg-zinc-900/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-900/20 border border-blue-900/50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-200">Operations Completed</div>
                    <div className="text-[8px] text-zinc-400">{userEvents.filter(e => e.status === 'completed').length}/25 ops</div>
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
      )}
    </div>
  );
}

function OpsTab({ userEvents }) {
  const navigate = useNavigate();
  const activeCount = userEvents.filter(e => e.status === 'active').length;
  const scheduledCount = userEvents.filter(e => e.status === 'scheduled').length;
  const pendingCount = userEvents.filter(e => e.status === 'pending').length;
  const completedCount = userEvents.filter(e => e.status === 'completed').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">OPERATIONS DASHBOARD</div>
        <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">{userEvents.length} TOTAL</Badge>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-emerald-950/60 border border-emerald-600 p-2">
          <div className="text-[7px] text-emerald-300 uppercase mb-0.5 font-bold tracking-wider">Active</div>
          <div className="text-2xl font-bold text-emerald-100">{activeCount}</div>
          <div className="text-[7px] text-emerald-400 mt-0.5">Live ops</div>
        </div>
        <div className="bg-blue-950/60 border border-blue-600 p-2">
          <div className="text-[7px] text-blue-300 uppercase mb-0.5 font-bold tracking-wider">Scheduled</div>
          <div className="text-2xl font-bold text-blue-100">{scheduledCount}</div>
          <div className="text-[7px] text-blue-400 mt-0.5">Upcoming</div>
        </div>
        <div className="bg-yellow-950/60 border border-yellow-600 p-2">
          <div className="text-[7px] text-yellow-300 uppercase mb-0.5 font-bold tracking-wider">Pending</div>
          <div className="text-2xl font-bold text-yellow-100">{pendingCount}</div>
          <div className="text-[7px] text-yellow-400 mt-0.5">Review</div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-600 p-2">
          <div className="text-[7px] text-zinc-300 uppercase mb-0.5 font-bold tracking-wider">Completed</div>
          <div className="text-2xl font-bold text-zinc-100">{completedCount}</div>
          <div className="text-[7px] text-zinc-400 mt-0.5">Total</div>
        </div>
      </div>
      
      {/* Active & Upcoming Section */}
      <div className="text-[8px] font-bold uppercase text-zinc-300 tracking-wider mb-2">ACTIVE & UPCOMING OPERATIONS</div>

      {userEvents.filter(e => ['active', 'scheduled', 'pending'].includes(e.status)).length === 0 ? (
        <div className="text-center py-12 space-y-2 border border-zinc-800 bg-zinc-900/30">
          <Target className="w-10 h-10 mx-auto text-zinc-600" />
          <div className="text-xs font-bold text-zinc-400">NO ACTIVE OPERATIONS</div>
          <div className="text-[8px] text-zinc-500">Awaiting mission assignment</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {userEvents.filter(e => ['active', 'scheduled', 'pending'].includes(e.status)).slice(0, 12).map((event) => {
            const startTime = new Date(event.start_time);
            const timeUntil = Math.floor((startTime - new Date()) / 1000 / 60);
            const isImmediate = timeUntil < 60;
            const objectiveCount = event.objectives?.length || 0;
            const completedObjectives = event.objectives?.filter(o => o.is_completed).length || 0;

            return (
              <div 
                key={event.id} 
                className={cn(
                  'border p-3 h-full flex flex-col transition-all cursor-pointer group relative overflow-hidden',
                  event.status === 'active' && 'bg-emerald-950/40 border-emerald-700/50 hover:border-emerald-600',
                  event.status === 'pending' && 'bg-yellow-950/40 border-yellow-700/50 hover:border-yellow-600',
                  event.status === 'scheduled' && 'bg-blue-950/40 border-blue-700/50 hover:border-blue-600'
                )}
                onClick={() => navigate(createPageUrl('Events') + `?event=${event.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className={cn(
                      'text-[7px] font-bold px-1 py-0.5 shrink-0',
                      event.status === 'active' && 'bg-emerald-600/90 text-white',
                      event.status === 'pending' && 'bg-yellow-600/90 text-white',
                      event.status === 'scheduled' && 'bg-blue-600/90 text-white'
                    )}>{event.status.slice(0, 3).toUpperCase()}</Badge>
                    <div className={cn(
                      "text-[8px] font-mono font-bold",
                      isImmediate ? "text-[#ea580c]" : "text-zinc-300"
                    )}>
                      {isImmediate ? '⚡NOW' : timeUntil > 0 ? `T-${timeUntil}m` : 'LIVE'}
                    </div>
                  </div>

                  <h3 className="text-[11px] font-bold text-zinc-100 mb-2 line-clamp-2 group-hover:text-[#ea580c] transition-colors">{event.title}</h3>

                  {event.description && (
                    <p className="text-[8px] text-zinc-400 line-clamp-2 mb-2 flex-1">{event.description}</p>
                  )}

                  <div className="space-y-1.5 mb-2 text-[8px]">
                    {event.location && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-2.5 h-2.5 shrink-0" />
                      <span className="font-mono">{startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {event.assigned_user_ids?.length > 0 && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Users className="w-2.5 h-2.5 shrink-0" />
                        <span>{event.assigned_user_ids.length} personnel</span>
                      </div>
                    )}
                    {objectiveCount > 0 && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Target className="w-2.5 h-2.5 shrink-0" />
                        <span>{completedObjectives}/{objectiveCount} objectives</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap mt-auto pt-2 border-t border-zinc-700/30">
                    <Badge className="text-[7px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 border-zinc-700/50">{event.priority}</Badge>
                    <Badge className="text-[7px] px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 border-zinc-700/50">{event.event_type}</Badge>
                    {event.phase && (
                      <Badge className="text-[7px] px-1.5 py-0.5 bg-cyan-900/30 text-cyan-400 border-cyan-900/50">{event.phase}</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlertsAndIncidentsTab({ activeIncidents, recentLogs, voiceNets }) {
  const [subTab, setSubTab] = useState('alerts');
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('alerts')}
            className={cn(
              'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
              subTab === 'alerts'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            )}
          >
            System Alerts
          </button>
          <button
            onClick={() => setSubTab('incidents')}
            className={cn(
              'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
              subTab === 'incidents'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            )}
          >
            Incidents ({activeIncidents.length})
          </button>
        </div>
        <Badge className={cn(
          'text-[7px] font-bold',
          activeIncidents.length > 0 ? 'bg-red-900/50 text-red-200 border-red-700 animate-pulse' : 'bg-emerald-900/50 text-emerald-200 border-emerald-700'
        )}>
          {activeIncidents.length > 0 ? 'ELEVATED' : 'NOMINAL'}
        </Badge>
      </div>

      {subTab === 'alerts' ? (
        <>
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
        </>
      ) : (
        <>
          <LiveIncidentCenter />
        </>
      )}
    </div>
  );
}

function ActivityTab({ recentLogs, recentMessages, user }) {
  const [subTab, setSubTab] = useState('feed');
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('feed')}
            className={cn(
              'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
              subTab === 'feed'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            )}
          >
            Activity Feed
          </button>
          <button
            onClick={() => setSubTab('comms')}
            className={cn(
              'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
              subTab === 'comms'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            )}
          >
            Recent Comms
          </button>
          <button
            onClick={() => setSubTab('personal')}
            className={cn(
              'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
              subTab === 'personal'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            )}
          >
            Personal Log
          </button>
        </div>
      </div>

      {subTab === 'feed' && (
        <>
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
        </>
      )}

      {subTab === 'comms' && (
        <div className="space-y-2">
          <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider mb-2">RECENT COMMUNICATIONS</div>
          <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700 mb-3">{recentMessages.length} MESSAGES</Badge>
          
          {recentMessages.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Hash className="w-12 h-12 mx-auto text-zinc-600" />
              <div className="text-sm font-bold text-zinc-400">NO RECENT MESSAGES</div>
              <div className="text-[9px] text-zinc-500">All channels quiet</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[8px] font-mono text-zinc-400">{new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="w-1 h-1 rounded-full bg-cyan-500" />
                    <div className="text-[8px] text-cyan-400 font-mono truncate">#{msg.channel_id?.slice(0, 8)}</div>
                  </div>
                  <div className="text-[10px] text-zinc-200 leading-relaxed">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'personal' && (
        <PersonalLogPanel user={user} />
      )}
    </div>
  );
}

function OrganizationTab({ 
  userSquads, 
  squadMemberships, 
  fleetAssets, 
  canManageFleet,
  allUsers,
  orgMetrics,
  user,
  userEvents,
  recentLogs,
  userRankIndex,
  achievementsTab,
  setAchievementsTab
}) {
  const [subTab, setSubTab] = useState('squads');
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSubTab('squads')}
          className={cn(
            'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
            subTab === 'squads'
              ? 'bg-[#ea580c] text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          )}
        >
          Squads
        </button>
        <button
          onClick={() => setSubTab('fleet')}
          className={cn(
            'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
            subTab === 'fleet'
              ? 'bg-[#ea580c] text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          )}
        >
          Fleet
        </button>
        <button
          onClick={() => setSubTab('achievements')}
          className={cn(
            'px-3 py-1.5 text-[9px] font-bold uppercase transition-all',
            subTab === 'achievements'
              ? 'bg-[#ea580c] text-white'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          )}
        >
          Achievements
        </button>
      </div>

      {subTab === 'squads' && <SquadsContent userSquads={userSquads} squadMemberships={squadMemberships} />}
      {subTab === 'fleet' && <FleetContent fleetAssets={fleetAssets} canManageFleet={canManageFleet} />}
      {subTab === 'achievements' && (
        <AchievementsTab 
          achievementsTab={achievementsTab}
          setAchievementsTab={setAchievementsTab}
          allUsers={allUsers}
          orgMetrics={orgMetrics}
          user={user}
          userEvents={userEvents}
          recentLogs={recentLogs}
          squadMemberships={squadMemberships}
          userRankIndex={userRankIndex}
        />
      )}
    </div>
  );
}

function SquadsContent({ userSquads, squadMemberships }) {
  return (
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
  );
}

function FleetContent({ fleetAssets, canManageFleet }) {
  return (
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
  );
}

function CommsTab({ voiceNets, onlineUsers, recentMessages }) {
  return (
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
        <div className="text-center py-8 space-y-2">
          <Hash className="w-8 h-8 mx-auto text-zinc-600" />
          <div className="text-sm font-bold text-zinc-400">NO RECENT TRAFFIC</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">LATEST MESSAGES</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
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
  );
}