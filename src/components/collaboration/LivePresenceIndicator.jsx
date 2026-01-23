import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Radio, Circle } from 'lucide-react';

export function PresenceDot({ userId, className }) {
  const { data: presence } = useQuery({
    queryKey: ['presence', userId],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ user_id: userId });
      return presences[0] || null;
    },
    refetchInterval: 5000,
    staleTime: 3000
  });

  const status = presence?.status || 'offline';
  
  const statusColors = {
    online: 'bg-emerald-500',
    idle: 'bg-yellow-500',
    'in-call': 'bg-blue-500 animate-pulse',
    transmitting: 'bg-orange-500 animate-pulse',
    away: 'bg-zinc-500',
    offline: 'bg-zinc-700'
  };

  return (
    <div className={cn('w-2 h-2 rounded-full', statusColors[status], className)} />
  );
}

export function PresenceBadge({ userId, showLabel = false }) {
  const queryClient = useQueryClient();
  
  const { data: presence } = useQuery({
    queryKey: ['presence', userId],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ user_id: userId });
      return presences[0] || null;
    },
    refetchInterval: 5000
  });

  useEffect(() => {
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.user_id === userId) {
        queryClient.invalidateQueries(['presence', userId]);
      }
    });
    return unsubscribe;
  }, [userId, queryClient]);

  const status = presence?.status || 'offline';
  
  const statusConfig = {
    online: { color: 'text-emerald-400', label: 'Online', icon: Circle },
    idle: { color: 'text-yellow-400', label: 'Idle', icon: Circle },
    'in-call': { color: 'text-blue-400', label: 'In Call', icon: Radio },
    transmitting: { color: 'text-orange-400', label: 'Transmitting', icon: Radio },
    away: { color: 'text-zinc-500', label: 'Away', icon: Circle },
    offline: { color: 'text-zinc-600', label: 'Offline', icon: Circle }
  };

  const config = statusConfig[status] || statusConfig.offline;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('w-3 h-3', config.color, status === 'transmitting' && 'animate-pulse')} />
      {showLabel && (
        <span className={cn('text-xs', config.color)}>{config.label}</span>
      )}
    </div>
  );
}

export function VoiceNetPresence({ netId }) {
  const queryClient = useQueryClient();
  
  const { data: presences = [] } = useQuery({
    queryKey: ['net-presence', netId],
    queryFn: async () => {
      return await base44.entities.UserPresence.filter({ net_id: netId });
    },
    refetchInterval: 3000
  });

  useEffect(() => {
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.net_id === netId) {
        queryClient.invalidateQueries(['net-presence', netId]);
      }
    });
    return unsubscribe;
  }, [netId, queryClient]);

  const activeUsers = presences.filter(p => p.status !== 'offline');
  const transmitting = presences.filter(p => p.status === 'transmitting');

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Circle className={cn(
          'w-2 h-2',
          activeUsers.length > 0 ? 'text-emerald-500' : 'text-zinc-600'
        )} />
        <span className="text-xs text-zinc-400">{activeUsers.length}</span>
      </div>
      {transmitting.length > 0 && (
        <div className="flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 text-orange-500 animate-pulse" />
          <span className="text-xs text-orange-400">{transmitting.length}</span>
        </div>
      )}
    </div>
  );
}