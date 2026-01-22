import React from 'react';
import { Target, AlertCircle, Users, Rocket, Hash, ChevronRight, Radio, Clock, Activity, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import RescueAlertPanel from './RescueAlertPanel';
import LiveIncidentCenter from '../incidents/LiveIncidentCenter';
import LiveOperationsFeed from './LiveOperationsFeed';
import EventCalendarView from './EventCalendarView';

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
  user
}) {
  const [achievementsTab, setAchievementsTab] = useState('org');

  if (activeTab === 'ops') {
    return <OpsTab userEvents={userEvents} />;
  }
  
  if (activeTab === 'alerts') {
    return <AlertsTab activeIncidents={activeIncidents} recentLogs={recentLogs} voiceNets={voiceNets} />;
  }
  
  if (activeTab === 'incidents') {
    return <IncidentsTab activeIncidents={activeIncidents} />;
  }
  
  if (activeTab === 'feed') {
    return <FeedTab recentLogs={recentLogs} user={user} />;
  }
  
  if (activeTab === 'calendar') {
    return <CalendarTab />;
  }
  
  if (activeTab === 'squads') {
    return <SquadsTab userSquads={userSquads} squadMemberships={squadMemberships} />;
  }
  
  if (activeTab === 'fleet') {
    return <FleetTab fleetAssets={fleetAssets} canManageFleet={canManageFleet} />;
  }
  
  if (activeTab === 'comms') {
    return <CommsTab voiceNets={voiceNets} onlineUsers={onlineUsers} recentMessages={recentMessages} />;
  }
  
  return null;
}

function OpsTab({ userEvents }) {
  return (
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
  );
}

function AlertsTab({ activeIncidents, recentLogs, voiceNets }) {
  return (
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
  );
}

function IncidentsTab({ activeIncidents }) {
  return (
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
    </div>
  );
}

function FeedTab({ recentLogs, user }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">OPERATIONAL LOG</div>
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
  );
}

function CalendarTab() {
  return (
    <div className="space-y-3">
      <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">EVENT CALENDAR</div>
      <EventCalendarView />
    </div>
  );
}

function SquadsTab({ userSquads, squadMemberships }) {
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

function FleetTab({ fleetAssets, canManageFleet }) {
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

function AchievementsTab({ user, userEvents, recentLogs, squadMemberships, allUsers, orgMetrics, userRankIndex }) {
  const rankHierarchy = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];
  
  return (
    <div className="space-y-4">
      {/* Rank Progress */}
      <div className="border border-[#ea580c]/30 bg-gradient-to-br from-[#ea580c]/5 to-zinc-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#ea580c]" />
            <span className="text-xs font-bold text-zinc-200 uppercase">Current Rank</span>
          </div>
          <Badge className={cn('text-[9px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
            {user?.rank || 'VAGRANT'}
          </Badge>
        </div>
        <div className="h-3 bg-zinc-900/50 border border-zinc-800/50 mb-2">
          <div 
            className="h-full bg-gradient-to-r from-[#ea580c] to-yellow-500 transition-all duration-300"
            style={{ width: `${((userRankIndex + 1) / 5) * 100}%` }}
          />
        </div>
        <div className="text-[8px] text-zinc-400 text-right">
          {userRankIndex < 4 ? `Next: ${rankHierarchy[userRankIndex + 1]}` : 'Max Rank Achieved'}
        </div>
      </div>

      {/* Tab Grid for Org and Personal */}
      <div className="grid grid-cols-2 gap-4">
        {/* Org Achievements */}
        <div className="border border-zinc-800/50 bg-gradient-to-br from-zinc-950 to-[#ea580c]/5 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#ea580c]" />
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">ORG ACHIEVEMENTS</span>
          </div>
          <div className="space-y-3">
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
                    <div className="text-[8px] text-zinc-400">{allUsers?.length || 0}/50 operatives</div>
                  </div>
                </div>
                {(allUsers?.length >= 50) && <Star className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(((allUsers?.length || 0) / 50) * 100, 100)}%` }} />
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
                    <div className="text-[8px] text-zinc-400">{orgMetrics?.activeOperations || 0}/10 concurrent</div>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-900/50 border border-zinc-800/50">
                <div className="h-full bg-cyan-500" style={{ width: `${((orgMetrics?.activeOperations || 0) / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Personal Achievements */}
        <div className="border border-zinc-800/50 bg-gradient-to-br from-zinc-950 to-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">PERSONAL ACHIEVEMENTS</span>
          </div>
          <div className="space-y-3">
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