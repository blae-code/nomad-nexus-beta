import { useState } from 'react';
import { Users, Radio, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Health score calculation based on participant count and transmission activity
const calculateNetHealth = (participantCount, isTransmitting, lastActivity) => {
  let health = 75; // base health
  
  // Adjust for participant count
  if (participantCount > 0) health = Math.min(100, health + (participantCount * 5));
  
  // Boost for active transmission
  if (isTransmitting) health = Math.min(100, health + 15);
  
  // Decay if inactive
  if (lastActivity) {
    const minutesSinceActivity = (Date.now() - lastActivity) / 60000;
    if (minutesSinceActivity > 10) health = Math.max(20, health - 20);
  }
  
  return Math.round(health);
};

const getHealthColor = (health) => {
  if (health >= 80) return 'text-emerald-500';
  if (health >= 60) return 'text-amber-500';
  return 'text-red-500';
};

const getHealthBg = (health) => {
  if (health >= 80) return 'bg-emerald-950/30 border-emerald-700/40';
  if (health >= 60) return 'bg-amber-950/30 border-amber-700/40';
  return 'bg-red-950/30 border-red-700/40';
};

export default function NetActivityIndicator({
  net,
  activeUsers = 0,
  transmittingUsers = [],
  isJoined = false,
  onJoin,
  onLeave,
  connectionQuality = 'good',
  lastActivity = null
}) {
  const [hovering, setHovering] = useState(false);
  const health = calculateNetHealth(activeUsers, transmittingUsers.length > 0, lastActivity);

  const signalBars = {
    excellent: 4,
    good: 3,
    poor: 1,
    unknown: 0
  };

  const barCount = signalBars[connectionQuality] || 0;

  return (
    <div
      className={cn(
        'p-3 rounded border transition-all duration-200',
        getHealthBg(health),
        hovering && 'ring-1 ring-zinc-600'
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Header with Net Code and Health */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-zinc-200">{net.code}</span>
          {isJoined && (
            <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 text-[9px] px-1.5 py-0">
              ACTIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold', getHealthColor(health))}>
            {health}%
          </span>
          <div className="flex gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 h-3 rounded-[1px] transition-colors',
                  i < barCount ? getHealthColor(health) : 'bg-zinc-800'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Net Label and Type */}
      <div className="mb-2">
        <p className="text-xs text-zinc-300 font-medium">{net.label}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
          {net.type} {net.discipline === 'focused' ? '• FOCUSED' : '• CASUAL'}
        </p>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
        <div className="flex items-center gap-1 bg-zinc-950/50 p-1.5 rounded">
          <Users className="w-3 h-3 text-blue-400" />
          <span className="text-zinc-300 font-mono">{activeUsers}</span>
          <span className="text-zinc-600">active</span>
        </div>
        
        {transmittingUsers.length > 0 && (
          <div className="flex items-center gap-1 bg-red-950/40 p-1.5 rounded border border-red-900/30">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-red-400 font-mono text-xs font-bold">
              {transmittingUsers.length} TX
            </span>
          </div>
        )}
      </div>

      {/* Transmitting Users List */}
      {transmittingUsers.length > 0 && (
        <div className="mb-3 p-2 bg-red-950/20 border border-red-900/30 rounded">
          <p className="text-[9px] text-red-400 font-bold mb-1 uppercase tracking-wider">
            On Air Now:
          </p>
          <div className="space-y-1">
            {transmittingUsers.slice(0, 3).map((user, idx) => (
              <div key={idx} className="text-[9px] text-red-300 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                {user.callsign || user.rsi_handle || 'Unknown'}
              </div>
            ))}
            {transmittingUsers.length > 3 && (
              <p className="text-[9px] text-red-400 ml-1">
                +{transmittingUsers.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Join/Leave Button */}
      <Button
        onClick={isJoined ? onLeave : onJoin}
        variant={isJoined ? 'destructive' : 'default'}
        size="sm"
        className={cn(
          'w-full text-xs font-bold gap-2',
          isJoined
            ? 'bg-red-900 hover:bg-red-800 text-red-100'
            : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100'
        )}
      >
        {isJoined ? (
          <>
            <LogOut className="w-3 h-3" />
            LEAVE NET
          </>
        ) : (
          <>
            <LogIn className="w-3 h-3" />
            JOIN NET
          </>
        )}
      </Button>
    </div>
  );
}