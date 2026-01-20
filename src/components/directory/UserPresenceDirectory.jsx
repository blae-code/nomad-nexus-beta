import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff, Volume2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  'online': 'bg-emerald-500',
  'in-call': 'bg-blue-500',
  'transmitting': 'bg-red-500',
  'idle': 'bg-yellow-500',
  'away': 'bg-orange-500',
  'offline': 'bg-zinc-600'
};

const statusLabels = {
  'online': 'ONLINE',
  'in-call': 'IN-CALL',
  'transmitting': 'XMIT',
  'idle': 'IDLE',
  'away': 'AWAY',
  'offline': 'OFFLINE'
};

export default function UserPresenceDirectory() {
  const [mutedUsers, setMutedUsers] = useState(new Set());
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: presences = [] } = useQuery({
    queryKey: ['user-presences-directory'],
    queryFn: async () => {
      const p = await base44.entities.UserPresence.list();
      return p.filter(u => u.status !== 'offline').sort((a, b) => {
        const orderMap = { 'transmitting': 0, 'in-call': 1, 'online': 2, 'idle': 3, 'away': 4 };
        return (orderMap[a.status] || 5) - (orderMap[b.status] || 5);
      });
    },
    refetchInterval: 3000
  });

  const { data: userDirectory = {} } = useQuery({
    queryKey: ['user-directory-context'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getUserDirectory', {});
        return result.data.userById || {};
      } catch {
        return {};
      }
    }
  });

  const toggleMute = (userId) => {
    const newMuted = new Set(mutedUsers);
    if (newMuted.has(userId)) {
      newMuted.delete(userId);
    } else {
      newMuted.add(userId);
    }
    setMutedUsers(newMuted);
  };

  const handleVolumeChange = (userId, direction) => {
    setVolumeAdjustments(prev => {
      const current = prev[userId] || 100;
      const newVolume = direction === 'up' 
        ? Math.min(150, current + 10) 
        : Math.max(50, current - 10);
      return { ...prev, [userId]: newVolume };
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase font-bold text-zinc-500 px-1">
        Online ({presences.length})
      </div>
      
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {presences.length === 0 ? (
          <div className="text-[10px] text-zinc-600 px-1 py-2">No users online</div>
        ) : (
          presences.map(presence => {
            const user = userDirectory[presence.user_id];
            const callsign = user?.callsign || 'UNKNOWN';
            const isMuted = mutedUsers.has(presence.user_id);
            const volume = volumeAdjustments[presence.user_id] || 100;
            const isCurrentUser = currentUser?.id === presence.user_id;

            return (
              <div key={presence.user_id} className="bg-zinc-900/50 border border-zinc-800 p-1.5 space-y-1 text-[9px]">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    statusColors[presence.status] || statusColors.offline,
                    presence.is_transmitting && 'animate-pulse'
                  )} />
                  <span className="font-bold text-zinc-300 truncate flex-1">{callsign}</span>
                  <span className="text-zinc-500">{statusLabels[presence.status]}</span>
                </div>

                {!isCurrentUser && (
                  <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/50">
                    {/* Hail Button */}
                    <button
                      onClick={() => {
                        console.log('Hailing', callsign);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-emerald-900/30 border border-emerald-800/50 hover:bg-emerald-900/50 transition-colors text-emerald-300"
                      title="Hail"
                    >
                      <Phone className="w-2.5 h-2.5" />
                      <span className="hidden xs:inline">HAIL</span>
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => toggleMute(presence.user_id)}
                      className={cn(
                        'flex items-center justify-center p-1 transition-colors',
                        isMuted 
                          ? 'bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50'
                          : 'bg-zinc-800/30 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50'
                      )}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-0.5 bg-zinc-800/30 border border-zinc-700/50 px-1 py-1">
                      <button
                        onClick={() => handleVolumeChange(presence.user_id, 'down')}
                        className="text-zinc-400 hover:text-zinc-300 text-[8px] px-0.5"
                      >
                        −
                      </button>
                      <span className="text-[8px] text-zinc-400 w-5 text-center">{volume}%</span>
                      <button
                        onClick={() => handleVolumeChange(presence.user_id, 'up')}
                        className="text-zinc-400 hover:text-zinc-300 text-[8px] px-0.5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}