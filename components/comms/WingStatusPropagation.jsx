import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WingStatusPropagation({ eventId }) {
  const [expandedWings, setExpandedWings] = useState({});

  const { data: squads } = useQuery({
    queryKey: ['squads-hierarchy', eventId],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  const { data: playerStatuses } = useQuery({
    queryKey: ['player-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.list(),
    initialData: [],
    refetchInterval: 5000
  });

  const { data: assignedUsers } = useQuery({
    queryKey: ['event-users', eventId],
    queryFn: async () => {
      const event = await base44.entities.Event.get(eventId);
      const users = await Promise.all(
        (event.assigned_user_ids || []).map(id => base44.entities.User.get(id))
      );
      return users;
    },
    enabled: !!eventId,
    initialData: []
  });

  // Build hierarchy
  const fleets = squads.filter(s => s.hierarchy_level === 'fleet');
  
  const getWingStatus = (wingId) => {
    const wingSquads = squads.filter(s => s.parent_id === wingId);
    const wingMembers = assignedUsers.filter(u => 
      wingSquads.some(sq => sq.id === u.squad_id)
    );
    
    const statuses = wingMembers.map(u => 
      playerStatuses.find(ps => ps.user_id === u.id)?.status || 'unknown'
    );

    const healthy = statuses.filter(s => s === 'operational').length;
    const wounded = statuses.filter(s => s === 'wounded').length;
    const distress = statuses.filter(s => s === 'distress').length;

    return { healthy, wounded, distress, total: wingMembers.length };
  };

  const getStatusColor = (status) => {
    const colors = {
      operational: 'bg-emerald-500/20 border-emerald-700 text-emerald-300',
      wounded: 'bg-amber-500/20 border-amber-700 text-amber-300',
      distress: 'bg-red-500/20 border-red-700 text-red-300',
      unknown: 'bg-zinc-500/20 border-zinc-700 text-zinc-300'
    };
    return colors[status] || colors.unknown;
  };

  const toggleWing = (wingId) => {
    setExpandedWings(prev => ({
      ...prev,
      [wingId]: !prev[wingId]
    }));
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          Wing Status Tree
        </OpsPanelTitle>
      </OpsPanelHeader>
      <OpsPanelContent className="space-y-2">
        {fleets.map(fleet => {
          const wings = squads.filter(s => s.parent_id === fleet.id && s.hierarchy_level === 'wing');
          
          return (
            <div key={fleet.id} className="space-y-1">
              <div className="text-xs font-bold uppercase text-zinc-300 px-2 py-1">
                {fleet.name} (Fleet)
              </div>
              
              {wings.map(wing => {
                const wingStatus = getWingStatus(wing.id);
                const isExpanded = expandedWings[wing.id];
                const wingSquads = squads.filter(s => s.parent_id === wing.id);

                return (
                  <div key={wing.id} className="ml-2">
                    <button
                      onClick={() => toggleWing(wing.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors text-left"
                    >
                      {isExpanded ? 
                        <ChevronDown className="w-3 h-3 text-zinc-500" /> :
                        <ChevronRight className="w-3 h-3 text-zinc-500" />
                      }
                      <span className="text-xs font-mono text-zinc-400">{wing.name}</span>
                      <div className="flex gap-1 ml-auto">
                        {wingStatus.distress > 0 && (
                          <Badge className="h-5 bg-red-500/20 border-red-700 text-red-300 text-[10px] px-1.5">
                            {wingStatus.distress} DISTRESS
                          </Badge>
                        )}
                        {wingStatus.wounded > 0 && (
                          <Badge className="h-5 bg-amber-500/20 border-amber-700 text-amber-300 text-[10px] px-1.5">
                            {wingStatus.wounded} WND
                          </Badge>
                        )}
                        <Badge className="h-5 bg-emerald-500/20 border-emerald-700 text-emerald-300 text-[10px] px-1.5">
                          {wingStatus.healthy}/{wingStatus.total}
                        </Badge>
                      </div>
                    </button>

                    {isExpanded && wingSquads.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-zinc-800/50 pl-2 py-1">
                        {wingSquads.map(squad => {
                          const squadMembers = assignedUsers.filter(u => u.squad_id === squad.id);
                          const squadStatuses = squadMembers.map(u => 
                            playerStatuses.find(ps => ps.user_id === u.id)?.status || 'unknown'
                          );

                          return (
                            <div key={squad.id} className="text-xs">
                              <div className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-950/50">
                                <Users className="w-3 h-3 text-zinc-600" />
                                <span className="text-zinc-500 flex-1">{squad.name}</span>
                                <div className="flex gap-0.5">
                                  {squadStatuses.map((status, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        'w-2 h-2 rounded-full border',
                                        getStatusColor(status)
                                      )}
                                      title={status}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </OpsPanelContent>
    </OpsPanel>
  );
}