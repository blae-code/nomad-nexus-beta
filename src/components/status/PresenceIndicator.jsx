import { Phone, Circle, Clock, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  online: {
    color: 'bg-emerald-500',
    icon: Circle,
    label: 'Online',
    pulse: true
  },
  idle: {
    color: 'bg-amber-500',
    icon: Clock,
    label: 'Idle',
    pulse: false
  },
  'in-call': {
    color: 'bg-blue-500',
    icon: Phone,
    label: 'In Call',
    pulse: true
  },
  transmitting: {
    color: 'bg-red-500',
    icon: Radio,
    label: 'Transmitting',
    pulse: true
  },
  away: {
    color: 'bg-zinc-600',
    icon: Circle,
    label: 'Away',
    pulse: false
  },
  offline: {
    color: 'bg-zinc-700',
    icon: Circle,
    label: 'Offline',
    pulse: false
  }
};

export default function PresenceIndicator({ 
  presence, 
  user, 
  size = 'sm',
  showLabel = true,
  showNet = true 
}) {
  if (!presence || !user) return null;

  const status = presence.status || 'offline';
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn(sizeClasses[size], config.color, 'rounded-full')} />
        {config.pulse && (
          <div className={cn(
            sizeClasses[size],
            config.color,
            'rounded-full absolute inset-0 animate-pulse'
          )} />
        )}
      </div>

      {showLabel && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-200">
            {user.callsign || user.rsi_handle || user.full_name}
          </span>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[9px]">
              {user.rank || 'Vagrant'}
            </Badge>
            <Badge className={cn('text-[9px] text-black', config.color)}>
              {config.label}
            </Badge>
            {presence.is_transmitting && (
              <Badge className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50">
                TX
              </Badge>
            )}
          </div>
          {showNet && presence.current_net && (
            <span className="text-[9px] text-zinc-400 font-mono">
              {presence.current_net.code}
            </span>
          )}
        </div>
      )}
    </div>
  );
}