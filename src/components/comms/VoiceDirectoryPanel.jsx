/**
 * Voice Directory Panel
 * Smart, context-aware voice room suggestions with one-click join
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Star, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVoiceDirectory, enrichWithOpNets, enrichWithSquadNets, getRecommendedNets, groupDirectoryByScope } from './voiceDirectory';

export default function VoiceDirectoryPanel({ user, onJoinRoom }) {
  const [directory, setDirectory] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const queryClient = useQueryClient();

  // Fetch user's active operation
  const { data: activeOp } = useQuery({
    queryKey: ['user-active-op', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const assignments = await base44.entities.EventDutyAssignment.filter(
        { user_id: user.id },
        '-created_date',
        1
      );
      if (assignments?.length > 0) {
        const events = await base44.entities.Event.list();
        return events.find(e => e.id === assignments[0].event_id) || null;
      }
      return null;
    },
    enabled: !!user?.id
  });

  // Build directory
  useEffect(() => {
    async function buildDirectory() {
      let dir = await getVoiceDirectory(user);
      if (activeOp) {
        dir = await enrichWithOpNets(dir, user, activeOp);
      }
      dir = await enrichWithSquadNets(dir, user, base44);
      setDirectory(dir);
    }
    buildDirectory();
  }, [user, activeOp]);

  const handleJoinRoom = (room) => {
    setCurrentRoom(room.roomName);
    onJoinRoom?.(room);
  };

  const recommended = getRecommendedNets(directory);
  const grouped = groupDirectoryByScope(directory);

  return (
    <div className="space-y-2 text-[9px]">
      {/* Quick Join (Recommended) */}
      {recommended.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500 flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-yellow-500" />
            Recommended
          </div>
          {recommended.map(room => (
            <button
              key={room.roomName}
              onClick={() => handleJoinRoom(room)}
              className={cn(
                'w-full px-2 py-1.5 text-left transition-all rounded-none border',
                currentRoom === room.roomName
                  ? 'bg-orange-950/40 border-[#ea580c] text-[#ea580c]'
                  : 'bg-zinc-900/40 border-zinc-700 hover:border-[#ea580c] text-zinc-300'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{room.label}</p>
                  <p className="text-[7px] text-zinc-500 truncate">{room.description}</p>
                </div>
                <div className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  room.discipline === 'focused' ? 'bg-red-500' : 'bg-emerald-500'
                )} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Organization Nets */}
      {grouped.ORG.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500">
            Organization
          </div>
          {grouped.ORG.map(room => (
            <button
              key={room.roomName}
              onClick={() => handleJoinRoom(room)}
              className={cn(
                'w-full px-2 py-1 text-left transition-colors border rounded-none',
                currentRoom === room.roomName
                  ? 'bg-zinc-800 border-[#ea580c]'
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-300 truncate">{room.label}</span>
                {room.discipline === 'focused' ? (
                  <Lock className="w-2.5 h-2.5 text-red-500 shrink-0" />
                ) : (
                  <Unlock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Operation Nets */}
      {grouped.OP.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500">
            Active Operation
          </div>
          {grouped.OP.map(room => (
            <button
              key={room.roomName}
              onClick={() => handleJoinRoom(room)}
              className={cn(
                'w-full px-2 py-1 text-left transition-colors border rounded-none',
                currentRoom === room.roomName
                  ? 'bg-zinc-800 border-[#ea580c]'
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-300 truncate">{room.label}</span>
                {room.discipline === 'focused' ? (
                  <Lock className="w-2.5 h-2.5 text-red-500 shrink-0" />
                ) : (
                  <Radio className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Squad Nets */}
      {grouped.SQUAD.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500">
            Squads
          </div>
          {grouped.SQUAD.map(room => (
            <button
              key={room.roomName}
              onClick={() => handleJoinRoom(room)}
              className={cn(
                'w-full px-2 py-1 text-left transition-colors border rounded-none',
                currentRoom === room.roomName
                  ? 'bg-zinc-800 border-[#ea580c]'
                  : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-300 truncate">{room.label}</span>
                <Unlock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}