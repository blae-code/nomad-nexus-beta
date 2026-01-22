import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Mic, Volume2, Users, Wifi, Activity, Signal, MicOff, VolumeX, ChevronDown, ChevronUp, UserCircle, Volume1, Headphones, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export default function ActiveNetMonitor() {
  const [expandedNets, setExpandedNets] = useState(new Set(['default']));
  const [currentUser, setCurrentUser] = useState(null);
  const [userVolumes, setUserVolumes] = useState({});
  const [hoveredUser, setHoveredUser] = useState(null);

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
    refetchInterval: 2000
  });

  // Fetch user directory for names
  const { data: userDirectory = {} } = useQuery({
    queryKey: ['user-directory-voice'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getUserDirectory', {});
        return result.data.userById || {};
      } catch {
        return {};
      }
    },
    refetchInterval: 10000
  });

  // Simulated connection state (would be from LiveKit in production)
  const [connectedNets, setConnectedNets] = useState(new Set(['default']));
  const [transmittingNet, setTransmittingNet] = useState(null);

  const setUserVolume = (userId, volume) => {
    setUserVolumes(prev => ({ ...prev, [userId]: volume }));
  };

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

  const renderUserInNet = (presence, netType) => {
    const user = userDirectory[presence.user_id];
    const callsign = user?.callsign || user?.full_name || 'Unknown';
    const isSpeaking = presence.is_transmitting;
    const userVolume = userVolumes[presence.user_id] || 100;
    const isHovered = hoveredUser === presence.user_id;

    return (
      <div
        key={presence.id}
        onMouseEnter={() => setHoveredUser(presence.user_id)}
        onMouseLeave={() => setHoveredUser(null)}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 transition-all relative',
          'hover:bg-zinc-800/50',
          isSpeaking && 'bg-emerald-950/20'
        )}
      >
        {/* Speaking Ring Animation */}
        <div className="relative shrink-0">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-all',
            isSpeaking 
              ? 'bg-emerald-600 ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950' 
              : 'bg-zinc-700'
          )}>
            <UserCircle className={cn('w-4 h-4', isSpeaking ? 'text-white' : 'text-zinc-400')} />
          </div>
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-zinc-200 truncate">{callsign}</div>
          <div className="flex items-center gap-1">
            {isSpeaking && (
              <div className="flex items-center gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 8 + 4}px`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}
            <span className="text-[8px] text-zinc-500 font-mono">
              {isSpeaking ? 'SPEAKING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Quick Controls (on hover) */}
        <div className={cn(
          'flex items-center gap-1 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setUserVolume(presence.user_id, userVolume === 0 ? 100 : 0);
            }}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            title={userVolume === 0 ? 'Unmute user' : 'Mute user'}
          >
            {userVolume === 0 ? (
              <VolumeX className="w-3 h-3 text-red-400" />
            ) : (
              <Volume1 className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Volume Slider (on hover) */}
        {isHovered && (
          <div className="absolute left-0 right-0 bottom-0 bg-zinc-900/95 border-t border-zinc-800 p-2 z-10">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3 h-3 text-zinc-400 shrink-0" />
              <Slider
                value={[userVolume]}
                onValueChange={(val) => setUserVolume(presence.user_id, val[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-[8px] font-mono text-zinc-400 w-8 text-right">{userVolume}%</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (connectedNets.size === 0) {
    return (
      <div className="border border-zinc-800/50 bg-zinc-950/50 p-6 text-center rounded">
        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3">
          <Phone className="w-6 h-6 text-zinc-600" />
        </div>
        <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1 tracking-wider">NO VOICE CONNECTION</div>
        <div className="text-[8px] text-zinc-600 leading-relaxed">
          Navigate to Comms Console to join a voice net
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activeNets.filter(net => connectedNets.has(net.id)).map((net) => {
        const isExpanded = expandedNets.has(net.id);
        const users = getNetUsers(net.id);
        const isTransmitting = transmittingNet === net.id;
        const speakingCount = users.filter(u => u.is_transmitting).length;

        return (
          <div
            key={net.id}
            className={cn(
              'border rounded overflow-hidden transition-all bg-zinc-950/50',
              getNetTypeColor(net.type),
              isTransmitting && 'ring-1 ring-emerald-500/50'
            )}
          >
            {/* Net Header - Discord Style */}
            <button
              onClick={() => toggleNetExpansion(net.id)}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-zinc-900/30 transition-colors group"
            >
              <div className="relative shrink-0">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isTransmitting ? 'bg-emerald-600' : 'bg-zinc-800'
                )}>
                  <Radio className={cn(
                    'w-4 h-4',
                    isTransmitting ? 'text-white animate-pulse' : getNetTypeIcon(net.type)
                  )} />
                </div>
                {speakingCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">{speakingCount}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="text-[10px] font-bold text-white uppercase tracking-wide truncate">
                  {net.code}
                </div>
                <div className="text-[8px] text-zinc-500 truncate flex items-center gap-1.5">
                  <Users className="w-2.5 h-2.5" />
                  {users.length} connected
                </div>
              </div>

              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
              )}
            </button>

            {/* User List - Discord/Guilded Style */}
            {isExpanded && users.length > 0 && (
              <div className="border-t border-zinc-800/50 bg-zinc-950/80 max-h-64 overflow-y-auto">
                {users.map((presence) => renderUserInNet(presence, net.type))}
              </div>
            )}

            {/* Connection Quality Bar */}
            {isExpanded && (
              <div className="border-t border-zinc-800/50 px-3 py-2 bg-zinc-950/80 flex items-center gap-2">
                <Signal className="w-3 h-3 text-emerald-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[95%] rounded-full" />
                    </div>
                  </div>
                </div>
                <span className="text-[8px] font-mono text-zinc-500">45ms</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}