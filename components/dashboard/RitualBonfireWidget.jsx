import { useState, useEffect } from 'react';
import { Flame, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function RitualBonfireWidget() {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isPulsing, setIsPulsing] = useState(false);

  // Fetch the next scheduled bonfire
  const { data: nextBonfire } = useQuery({
    queryKey: ['next-ritual-bonfire'],
    queryFn: async () => {
      const bonfires = await base44.entities.RitualBonfire.filter(
        { status: 'scheduled' },
        'scheduled_time',
        1
      );
      return bonfires[0] || null;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Update countdown timer
  useEffect(() => {
    if (!nextBonfire?.scheduled_time) {
      setTimeRemaining('—');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const bonfireTime = new Date(nextBonfire.scheduled_time);
      const diff = bonfireTime - now;

      if (diff <= 0) {
        setTimeRemaining('NOW');
        setIsPulsing(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
        setIsPulsing(false);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
        setIsPulsing(hours < 2); // Pulse when less than 2 hours
      } else {
        setTimeRemaining(`${minutes}m`);
        setIsPulsing(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [nextBonfire]);

  if (!nextBonfire) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-2 border border-zinc-800/50 bg-zinc-900/40 text-[9px] font-mono cursor-pointer hover:border-zinc-700/50 transition-all group relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.05) 50%)',
          backgroundSize: '100% 2px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
          style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }}
        />
        <Flame className="w-2.5 h-2.5 text-zinc-700 group-hover:text-zinc-600 transition-colors relative z-10" />
        <span className="font-bold uppercase tracking-wider text-zinc-700 group-hover:text-zinc-600 transition-colors relative z-10">NO BONFIRE</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono cursor-pointer transition-all group relative overflow-hidden',
        isPulsing 
          ? 'bg-[#ea580c]/20 border-[#ea580c]/60 hover:bg-[#ea580c]/30 hover:border-[#ea580c]/80 shadow-[0_0_8px_rgba(234,88,12,0.15)]' 
          : 'bg-amber-950/30 border-amber-700/50 hover:border-amber-600/70 hover:shadow-[0_0_8px_rgba(217,119,6,0.1)]'
      )}
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.05) 50%)',
        backgroundSize: '100% 2px',
      }}
      title={`${nextBonfire.title} - ${new Date(nextBonfire.scheduled_time).toLocaleString()}`}
    >
      {/* Animated ember glow effect */}
      <div 
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          isPulsing ? 'bg-gradient-to-r from-transparent via-[#ea580c]/10 to-transparent' : 'bg-gradient-to-r from-transparent via-amber-600/10 to-transparent'
        )}
        style={{ 
          backgroundSize: '200% 100%',
          animation: isPulsing ? 'shimmer 1.5s infinite' : 'shimmer 3s infinite'
        }}
      />
      
      {/* Pulsing backdrop for imminent bonfire */}
      {isPulsing && (
        <div className="absolute inset-0 bg-[#ea580c]/5 animate-pulse" />
      )}
      
      {/* Fire icon with glow */}
      <div className="relative z-10">
        <Flame className={cn(
          'w-2.5 h-2.5 transition-all duration-300',
          isPulsing 
            ? 'text-[#ea580c] drop-shadow-[0_0_3px_rgba(234,88,12,0.6)] group-hover:scale-110' 
            : 'text-amber-500 drop-shadow-[0_0_2px_rgba(217,119,6,0.4)] group-hover:scale-105'
        )} />
      </div>
      
      <div className="flex items-center gap-1 relative z-10">
        <span className={cn(
          'font-bold uppercase tracking-wider transition-colors',
          isPulsing ? 'text-[#ea580c] group-hover:text-[#ea580c]/90' : 'text-amber-400 group-hover:text-amber-300'
        )}>
          {timeRemaining === 'NOW' ? '⚡ BONFIRE ⚡' : 'BONFIRE'}
        </span>
        <span className={cn('transition-colors', isPulsing ? 'text-[#ea580c]/40' : 'text-zinc-600')}>•</span>
        <span className={cn(
          'font-mono font-bold tabular-nums transition-colors',
          isPulsing ? 'text-[#ea580c] group-hover:text-[#ea580c]/90' : 'text-amber-300 group-hover:text-amber-200'
        )}>
          {timeRemaining}
        </span>
      </div>
      
      {nextBonfire.attendee_ids?.length > 0 && (
        <>
          <span className={cn('transition-colors relative z-10', isPulsing ? 'text-[#ea580c]/30' : 'text-zinc-700')}>|</span>
          <div className="flex items-center gap-0.5 relative z-10 transition-all group-hover:scale-105">
            <Users className={cn(
              'w-2 h-2 transition-colors',
              isPulsing ? 'text-[#ea580c]/70' : 'text-zinc-500 group-hover:text-amber-600'
            )} />
            <span className={cn(
              'font-bold transition-colors',
              isPulsing ? 'text-[#ea580c]/70' : 'text-zinc-500 group-hover:text-amber-600'
            )}>
              {nextBonfire.attendee_ids.length}
            </span>
          </div>
        </>
      )}
      
      {/* Subtle corner accent */}
      <div className={cn(
        'absolute top-0 left-0 w-1.5 h-1.5 border-t border-l transition-colors',
        isPulsing ? 'border-[#ea580c]/60' : 'border-amber-700/40'
      )} />
      <div className={cn(
        'absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r transition-colors',
        isPulsing ? 'border-[#ea580c]/60' : 'border-amber-700/40'
      )} />
    </div>
  );
}