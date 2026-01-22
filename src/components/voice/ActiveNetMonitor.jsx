import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Mic, Volume2, Users, Wifi, Activity, Signal, MicOff, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ActiveNetMonitor() {
  const [expandedNets, setExpandedNets] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch active voice nets
  const { data: activeNets = [] } = useQuery({
    queryKey: ['active-voice-nets'],
    queryFn: async () => {
      const nets = await base44.entities.VoiceNet.filter({ status: 'active' });
      return nets;
    },
    refetchInterval: 5000
  });

  // Fetch user presence for active nets
  const { data: presences = [] } = useQuery({
    queryKey: ['net-presences'],
    queryFn: async () => {
      return await base44.entities.UserPresence.list();
    },
    refetchInterval: 3000
  });

  // Simulated connection state (would be from LiveKit in production)
  const [connectedNets, setConnectedNets] = useState(new Set());
  const [transmittingNet, setTransmittingNet] = useState(null);

  const toggleNetExpansion = (netId) => {
    const newExpanded = new Set(expandedNets);
    if (newExpanded.has(netId)) {
      newExpanded.delete(netId);
    } else {
      newExpanded.add(netId);
    }
    setExpandedNets(newExpanded);
  };

  const getNetUsers = (netId) => {
    return presences.filter(p => p.net_id === netId && p.status !== 'offline');
  };

  const getNetTypeColor = (type) => {
    switch (type) {
      case 'command': return 'border-red-600 bg-red-950/30';
      case 'squad': return 'border-blue-600 bg-blue-950/30';
      case 'support': return 'border-purple-600 bg-purple-950/30';
      default: return 'border-zinc-700 bg-zinc-900/30';
    }
  };

  const getNetTypeIcon = (type) => {
    switch (type) {
      case 'command': return 'text-red-400';
      case 'squad': return 'text-blue-400';
      case 'support': return 'text-purple-400';
      default: return 'text-zinc-400';
    }
  };

  if (connectedNets.size === 0) {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-4 text-center">
        <Radio className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">NOT CONNECTED</div>
        <div className="text-[8px] text-zinc-600">Join a voice net to start</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeNets.filter(net => connectedNets.has(net.id)).map((net) => {
        const isExpanded = expandedNets.has(net.id);
        const users = getNetUsers(net.id);
        const isTransmitting = transmittingNet === net.id;

        return (
          <div
            key={net.id}
            className={cn(
              'border overflow-hidden transition-all',
              getNetTypeColor(net.type),
              isTransmitting && 'ring-2 ring-red-500 shadow-lg shadow-red-900/30'
            )}
          >
            {/* Net Header */}
            <button
              onClick={() => toggleNetExpansion(net.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-900/50 transition-colors"
            >
              <Radio className={cn('w-3.5 h-3.5', getNetTypeIcon(net.type), isTransmitting && 'animate-pulse')} />
              
              <div className="flex-1 text-left min-w-0">
                <div className="text-[9px] font-bold text-white uppercase tracking-wider truncate">
                  {net.code}
                </div>
                <div className="text-[7px] text-zinc-400 truncate">{net.label}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge className="text-[7px] bg-zinc-800 text-zinc-300 border-zinc-700">
                  <Users className="w-2.5 h-2.5 mr-0.5" />
                  {users.length}
                </Badge>
                
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                )}
              </div>
            </button>

            {/* Expanded Net Details */}
            {isExpanded && (
              <div className="border-t border-zinc-800 bg-zinc-950/50 p-2 space-y-2">
                {/* Connection Stats */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-1.5 text-center">
                    <Signal className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
                    <div className="text-[7px] text-zinc-500 uppercase">EXCELLENT</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-1.5 text-center">
                    <Activity className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
                    <div className="text-[7px] text-zinc-500 uppercase">45ms</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-1.5 text-center">
                    <Wifi className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                    <div className="text-[7px] text-zinc-500 uppercase">STABLE</div>
                  </div>
                </div>

                {/* Users in Net */}
                {users.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[7px] font-bold text-zinc-500 uppercase">ACTIVE USERS</div>
                    {users.slice(0, 5).map((presence) => (
                      <div
                        key={presence.id}
                        className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 border border-zinc-800"
                      >
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          presence.is_transmitting ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                        )} />
                        <span className="text-[8px] font-mono text-zinc-300 flex-1 truncate">
                          {presence.user_id?.slice(0, 8)}
                        </span>
                        {presence.is_transmitting && (
                          <Mic className="w-2.5 h-2.5 text-red-400" />
                        )}
                      </div>
                    ))}
                    {users.length > 5 && (
                      <div className="text-[7px] text-zinc-600 text-center">
                        +{users.length - 5} more
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-1 pt-1 border-t border-zinc-800">
                  <button className="flex-1 py-1.5 text-[8px] font-bold uppercase bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 transition-colors">
                    <MicOff className="w-3 h-3 mx-auto" />
                  </button>
                  <button className="flex-1 py-1.5 text-[8px] font-bold uppercase bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 transition-colors">
                    <VolumeX className="w-3 h-3 mx-auto" />
                  </button>
                  <button className="flex-1 py-1.5 text-[8px] font-bold uppercase bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 transition-colors">
                    LEAVE
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}