import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, MoreHorizontal, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function UserProfileCard({ 
  user, 
  presence, 
  userDirectory,
  isFavorite,
  isMuted,
  notes,
  onToggleFavorite,
  onToggleMute,
  onSaveNote,
  onMessage,
  onCall,
  onClose,
  mutualSquads = [],
  recentActivity = null
}) {
  const userInfo = userDirectory[user.id];
  const callsign = userInfo?.callsign || 'UNKNOWN';
  const rank = userInfo?.rank || user?.rank || 'VAGRANT';
  const bio = userInfo?.bio || user?.bio || '';
  const joinDate = user?.created_date ? new Date(user.created_date) : null;

  const statusColors = {
    'online': 'bg-emerald-500 text-emerald-100',
    'in-call': 'bg-blue-500 text-blue-100',
    'transmitting': 'bg-red-500 text-red-100',
    'idle': 'bg-yellow-500 text-yellow-100',
    'away': 'bg-orange-500 text-orange-100',
    'offline': 'bg-zinc-600 text-zinc-300'
  };

  return (
    <div className="w-80 bg-zinc-900 border border-zinc-700 shadow-xl overflow-hidden">
      {/* Header with backdrop */}
      <div className="relative h-24 bg-gradient-to-br from-zinc-800 to-zinc-900">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="px-4 pb-4 -mt-8 relative">
        {/* Avatar/Status Circle */}
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-4 border-zinc-900 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-300">{callsign[0]}</span>
          </div>
          <div className={cn(
            'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-zinc-900',
            statusColors[presence?.status || 'offline'].split(' ')[0]
          )} />
        </div>

        {/* Callsign & Rank */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white mb-1">{callsign}</h3>
          <Badge className={cn('text-[9px]', getRankColorClass(rank, 'bg'))}>
            {rank}
          </Badge>
        </div>

        {/* Bio */}
        {bio && (
          <div className="mb-3 px-3 py-2 bg-zinc-950/50 border border-zinc-800 text-[10px] text-zinc-300 leading-relaxed">
            {bio}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            onClick={onMessage}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-[10px]"
          >
            <MessageSquare className="w-3 h-3 mr-1.5" />
            Message
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCall}
            className="h-8 px-3"
            disabled={presence?.status === 'offline'}
          >
            <Phone className="w-3 h-3" />
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-3">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-48 bg-zinc-900 border border-zinc-700 shadow-xl p-1 z-50">
                <DropdownMenu.Item
                  onClick={onToggleFavorite}
                  className="px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 cursor-pointer outline-none"
                >
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={onToggleMute}
                  className="px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 cursor-pointer outline-none"
                >
                  {isMuted ? 'Unmute User' : 'Mute User'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-zinc-800 my-1" />
                <DropdownMenu.Item className="px-3 py-2 text-[11px] text-red-400 hover:bg-red-950 cursor-pointer outline-none">
                  Block User
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Info Sections */}
        <div className="space-y-2">
          {/* Member Since */}
          {joinDate && (
            <div className="flex items-center gap-2 text-[10px]">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-500">Member since</span>
              <span className="text-zinc-300 font-medium">
                {joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Mutual Squads */}
          {mutualSquads.length > 0 && (
            <div className="px-3 py-2 bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] text-zinc-500 uppercase font-bold">
                  {mutualSquads.length} Mutual Squad{mutualSquads.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1">
                {mutualSquads.slice(0, 3).map((squad, i) => (
                  <div key={i} className="text-[10px] text-zinc-300 truncate">
                    • {squad.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity && (
            <div className="px-3 py-2 bg-zinc-950/50 border border-zinc-800">
              <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Recent Activity</div>
              <div className="text-[10px] text-zinc-300">{recentActivity}</div>
            </div>
          )}

          {/* Notes */}
          <div className="px-3 py-2 bg-zinc-950/50 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1.5">Notes</div>
            <textarea
              placeholder="Add a note about this user..."
              defaultValue={notes || ''}
              onBlur={(e) => onSaveNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}