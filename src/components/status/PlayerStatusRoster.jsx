import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Users, Filter, Activity, MapPin, Clock } from "lucide-react";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";

const STATUS_COLORS = {
  READY: 'bg-emerald-500',
  IN_QUANTUM: 'bg-blue-500',
  ENGAGED: 'bg-red-500',
  RTB: 'bg-amber-500',
  DOWN: 'bg-zinc-100',
  DISTRESS: 'bg-red-600',
  OFFLINE: 'bg-zinc-700',
};

export default function PlayerStatusRoster({ eventId }) {
  const [filterEvent, setFilterEvent] = useState(eventId || 'all');
  const [filterRank, setFilterRank] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: statuses } = useQuery({
    queryKey: ['player-statuses-roster', filterEvent],
    queryFn: () => {
      if (filterEvent === 'all') {
        return base44.entities.PlayerStatus.list('-last_updated', 100);
      }
      return base44.entities.PlayerStatus.filter({ event_id: filterEvent }, '-last_updated', 100);
    },
    initialData: []
  });

  const { data: events } = useQuery({
    queryKey: ['events-for-filter'],
    queryFn: () => base44.entities.Event.filter({ 
      status: { $in: ['scheduled', 'active'] } 
    }, '-start_time', 50),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-roster'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Filter statuses
  const filteredStatuses = React.useMemo(() => {
    return statuses.filter(status => {
      const user = users.find(u => u.id === status.user_id);
      
      // Filter by rank
      if (filterRank !== 'all' && user?.rank !== filterRank) return false;
      
      // Filter by status
      if (filterStatus !== 'all' && status.status !== filterStatus) return false;
      
      return true;
    });
  }, [statuses, users, filterRank, filterStatus]);

  // Get unique ranks from users
  const availableRanks = React.useMemo(() => {
    const ranks = new Set(users.map(u => u.rank).filter(Boolean));
    return Array.from(ranks).sort();
  }, [users]);

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-zinc-200">
            <Users className="w-4 h-4 text-[#ea580c]" />
            Operational Roster
            <Badge variant="outline" className="text-[10px]">
              {filteredStatuses.length}
            </Badge>
          </CardTitle>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-2">
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
              <SelectValue placeholder="Event" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">All Events</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id} className="text-xs">
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRank} onValueChange={setFilterRank}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
              <SelectValue placeholder="Rank" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">All Ranks</SelectItem>
              {availableRanks.map(rank => (
                <SelectItem key={rank} value={rank} className="text-xs">
                  {rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="READY" className="text-xs">Ready</SelectItem>
              <SelectItem value="ENGAGED" className="text-xs">Engaged</SelectItem>
              <SelectItem value="IN_QUANTUM" className="text-xs">In Quantum</SelectItem>
              <SelectItem value="RTB" className="text-xs">RTB</SelectItem>
              <SelectItem value="DOWN" className="text-xs">Down</SelectItem>
              <SelectItem value="DISTRESS" className="text-xs">Distress</SelectItem>
              <SelectItem value="OFFLINE" className="text-xs">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-3 space-y-2">
            {filteredStatuses.length === 0 ? (
              <div className="text-center py-8 text-zinc-600">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">NO ACTIVE SIGNALS</p>
              </div>
            ) : (
              filteredStatuses.map(status => {
                const user = users.find(u => u.id === status.user_id);
                const statusColor = STATUS_COLORS[status.status] || 'bg-zinc-600';
                
                return (
                  <div 
                    key={status.id}
                    className="p-3 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0", statusColor)} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-zinc-200">
                            {user?.callsign || user?.rsi_handle || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4">
                            {user?.rank || 'N/A'}
                          </Badge>
                          <Badge className={cn("text-[9px] h-4", statusColor, "text-black")}>
                            {status.status}
                          </Badge>
                        </div>
                        
                        {status.role && status.role !== 'OTHER' && (
                          <div className="text-xs text-zinc-500 mb-1">
                            Role: {status.role}
                          </div>
                        )}
                        
                        {status.current_location && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                            <MapPin className="w-3 h-3" />
                            {status.current_location}
                          </div>
                        )}
                        
                        {status.notes && (
                          <div className="text-xs text-zinc-400 bg-zinc-900 p-2 rounded mt-2 border-l-2 border-zinc-700">
                            {status.notes}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date(status.last_updated).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}