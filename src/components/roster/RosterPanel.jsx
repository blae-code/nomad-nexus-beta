import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Users, Filter, Activity, MapPin, Clock, Circle, Mic, Radio } from 'lucide-react';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';
import { getRankColorClass } from '@/components/utils/rankUtils';
import EmptyState from '@/components/feedback/EmptyState';

const STATUS_COLORS = {
  READY: 'bg-emerald-500',
  IN_QUANTUM: 'bg-blue-500',
  ENGAGED: 'bg-red-500',
  RTB: 'bg-amber-500',
  DOWN: 'bg-zinc-100',
  DISTRESS: 'bg-red-600',
  OFFLINE: 'bg-zinc-700',
};

const PRESENCE_ICONS = {
  online: { icon: Circle, color: 'text-emerald-500' },
  idle: { icon: Clock, color: 'text-amber-500' },
  'in-call': { icon: Circle, color: 'text-blue-500' },
  transmitting: { icon: Radio, color: 'text-red-500' },
  away: { icon: Circle, color: 'text-zinc-600' },
};

export default function RosterPanel({
  mode = 'presence', // 'presence' | 'status' | 'comms'
  eventId,
  netId,
  showRank = true,
  showVoiceState = true,
  showLocation = false,
  showLastSeen = true,
}) {
  const [items, setItems] = useState([]);
  const [filterRank, setFilterRank] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();
  const { users, userById } = useUserDirectory();

  // Build query based on mode
  const query = useMemo(() => {
    const q = {};
    if (eventId && (mode === 'status' || mode === 'presence')) q.event_id = eventId;
    if (netId && (mode === 'comms' || mode === 'presence')) q.net_id = netId;
    return q;
  }, [eventId, netId, mode]);

  // Fetch data based on mode
  const { data: rawData = [] } = useQuery({
    queryKey: [
      mode === 'status' ? 'player-statuses-roster' : 'user-presence',
      eventId,
      netId,
    ],
    queryFn: async () => {
      if (mode === 'status') {
        if (Object.keys(query).length === 0) {
          return await base44.entities.PlayerStatus.list('-last_updated', 100);
        }
        return await base44.entities.PlayerStatus.filter(query, '-last_updated', 100);
      } else {
        // presence / comms mode
        if (Object.keys(query).length === 0) {
          return await base44.entities.UserPresence.list('-last_activity', 50);
        }
        return await base44.entities.UserPresence.filter(query, '-last_activity', 50);
      }
    },
    enabled: mode === 'status' || Object.keys(query).length > 0,
    refetchInterval: mode === 'comms' ? 2000 : undefined,
  });

  // Fetch events for status filter (status mode only)
  const { data: events = [] } = useQuery({
    queryKey: ['events-for-roster-filter'],
    queryFn: () =>
      base44.entities.Event.filter(
        { status: { $in: ['scheduled', 'active'] } },
        '-start_time',
        50
      ),
    enabled: mode === 'status',
  });

  // Real-time subscription
  useEffect(() => {
    const entityName = mode === 'status' ? 'PlayerStatus' : 'UserPresence';
    if (!base44.entities[entityName]?.subscribe) return;

    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        setItems((prev) => {
          const filtered = prev.filter((p) => p.id !== event.data?.id);
          return [...filtered, event.data].sort((a, b) => {
            const aTime = new Date(a.last_updated || a.last_activity);
            const bTime = new Date(b.last_updated || b.last_activity);
            return bTime - aTime;
          });
        });
      } else if (event.type === 'delete') {
        setItems((prev) => prev.filter((p) => p.id !== event.id));
      }
    });

    return unsubscribe;
  }, [mode]);

  // Sync data
  useEffect(() => {
    setItems(rawData);
  }, [rawData]);

  // Filter for comms mode (exclude offline)
  const displayItems = useMemo(() => {
    let filtered = items;

    if (mode === 'comms') {
      filtered = filtered.filter((p) => p.status !== 'offline');
    }

    // Apply rank filter
    if (filterRank !== 'all' && mode !== 'comms') {
      filtered = filtered.filter((item) => {
        const user = userById[item.user_id];
        return user?.rank === filterRank;
      });
    }

    // Apply status filter (status mode only)
    if (filterStatus !== 'all' && mode === 'status') {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    return filtered;
  }, [items, filterRank, filterStatus, mode, userById]);

  // Get available ranks
  const availableRanks = useMemo(() => {
    const ranks = new Set(users.map((u) => u.rank).filter(Boolean));
    return Array.from(ranks).sort();
  }, [users]);

  const onlineCount = items.filter((p) => p.status !== 'offline').length;
  const transmittingCount = items.filter((p) => p.is_transmitting).length;

  // Comms mode - simple inline list (no card wrapper)
  if (mode === 'comms') {
    if (displayItems.length === 0) {
      return (
        <EmptyState
          icon={Radio}
          title="No Active Users"
          description="Awaiting personnel on frequency."
        />
      );
    }

    return (
      <div className="space-y-2">
        {displayItems.map((presence) => {
          const user = userById[presence.user_id];
          if (!user) return null;

          const statusConfig = PRESENCE_ICONS[presence.status] || PRESENCE_ICONS.online;
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={presence.id}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded border transition-colors',
                presence.is_transmitting
                  ? 'bg-red-950/20 border-red-800/50'
                  : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
              )}
            >
              <div className="relative">
                <StatusIcon className={cn('w-3 h-3 shrink-0', statusConfig.color)} />
                {(presence.is_transmitting || presence.status === 'transmitting') && (
                  <div className="absolute inset-0 animate-pulse">
                    <StatusIcon className={cn('w-3 h-3', statusConfig.color)} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {user.callsign || user.rsi_handle || user.full_name}
                  </span>
                  {showRank && user.rank && (
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] h-5 px-1', getRankColorClass(user.rank, 'text'))}
                    >
                      {user.rank}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {presence.is_transmitting ? (
                    <span className="flex items-center gap-1 text-red-400">
                      <Mic className="w-2.5 h-2.5" />
                      TRANSMITTING
                    </span>
                  ) : (
                    <span>{presence.status}</span>
                  )}
                </div>
              </div>

              {presence.status === 'idle' && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5">
                  IDLE
                </Badge>
              )}
              {presence.is_transmitting && (
                <Badge className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50 px-1.5 py-0 h-5">
                  TX
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Status/Presence mode - card wrapper with filters
  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-zinc-200">
            <Users className="w-4 h-4 text-[#ea580c]" />
            {mode === 'status' ? 'Operational Roster' : 'Active Personnel'}
            <Badge variant="outline" className="text-[10px]">
              {displayItems.length}
            </Badge>
          </CardTitle>
          {transmittingCount > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 gap-1">
              <Radio className="w-3 h-3" />
              {transmittingCount} TX
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className={cn('grid gap-2', mode === 'status' ? 'grid-cols-3' : 'grid-cols-2')}>
          {mode === 'status' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all" className="text-xs">
                  All Status
                </SelectItem>
                <SelectItem value="READY" className="text-xs">
                  Ready
                </SelectItem>
                <SelectItem value="ENGAGED" className="text-xs">
                  Engaged
                </SelectItem>
                <SelectItem value="IN_QUANTUM" className="text-xs">
                  In Quantum
                </SelectItem>
                <SelectItem value="RTB" className="text-xs">
                  RTB
                </SelectItem>
                <SelectItem value="DOWN" className="text-xs">
                  Down
                </SelectItem>
                <SelectItem value="DISTRESS" className="text-xs">
                  Distress
                </SelectItem>
                <SelectItem value="OFFLINE" className="text-xs">
                  Offline
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={filterRank} onValueChange={setFilterRank}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8">
              <SelectValue placeholder="Rank" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">
                All Ranks
              </SelectItem>
              {availableRanks.map((rank) => (
                <SelectItem key={rank} value={rank} className="text-xs">
                  {rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-3 space-y-2">
            {displayItems.length === 0 ? (
              <EmptyState
                icon={Activity}
                title={mode === 'status' ? 'No Active Signals' : 'No Active Personnel'}
                description={mode === 'status' ? 'Awaiting operational status updates.' : 'No personnel currently online.'}
              />
            ) : (
              displayItems.map((item) => {
                const user = userById[item.user_id];
                if (!user) return null;

                if (mode === 'status') {
                  const statusColor = STATUS_COLORS[item.status] || 'bg-zinc-600';
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-3 h-3 rounded-full mt-1 shrink-0', statusColor)} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold text-zinc-200">
                              {user?.callsign || user?.rsi_handle || 'Unknown'}
                            </span>
                            {showRank && (
                              <Badge variant="outline" className="text-[9px] h-4">
                                {user?.rank || 'N/A'}
                              </Badge>
                            )}
                            <Badge className={cn('text-[9px] h-4', statusColor, 'text-black')}>
                              {item.status}
                            </Badge>
                          </div>

                          {item.role && item.role !== 'OTHER' && (
                            <div className="text-xs text-zinc-500 mb-1">Role: {item.role}</div>
                          )}

                          {showLocation && item.current_location && (
                            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                              <MapPin className="w-3 h-3" />
                              {item.current_location}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-xs text-zinc-400 bg-zinc-900 p-2 rounded mt-2 border-l-2 border-zinc-700">
                              {item.notes}
                            </div>
                          )}

                          {showLastSeen && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-2">
                              <Clock className="w-3 h-3" />
                              {new Date(item.last_updated).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Presence mode
                const statusConfig = PRESENCE_ICONS[item.status] || PRESENCE_ICONS.online;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-800/30 border border-zinc-700 hover:border-zinc-600 transition-colors rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <StatusIcon className={cn('w-3 h-3 shrink-0', statusConfig.color)} />
                        {item.is_transmitting && (
                          <div className="absolute inset-0 animate-pulse">
                            <StatusIcon className={cn('w-3 h-3', statusConfig.color)} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-zinc-200">
                            {user?.callsign || user?.rsi_handle || 'Unknown'}
                          </span>
                          {showRank && user?.rank && (
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] h-4 px-1', getRankColorClass(user.rank, 'text'))}
                            >
                              {user.rank}
                            </Badge>
                          )}
                        </div>

                        {showVoiceState && (
                          <div className="text-[10px] text-zinc-400">
                            {item.is_transmitting ? (
                              <span className="flex items-center gap-1 text-red-400">
                                <Mic className="w-2.5 h-2.5" />
                                TRANSMITTING
                              </span>
                            ) : (
                              <span>{item.status}</span>
                            )}
                          </div>
                        )}

                        {showLastSeen && (
                          <div className="text-[10px] text-zinc-600 mt-1">
                            {new Date(item.last_activity).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>

                      {item.is_transmitting && (
                        <Badge className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50">
                          TX
                        </Badge>
                      )}
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