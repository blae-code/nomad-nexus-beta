import React, { useState, useEffect } from 'react';
import { Flame, Clock, Users, Zap } from 'lucide-react';
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
      <div className="flex items-center gap-1.5 px-2.5 py-2 border border-zinc-800/50 bg-zinc-900/40 text-[9px] font-mono cursor-pointer hover:border-zinc-700/50 transition-colors group">
        <Flame className="w-2.5 h-2.5 text-zinc-700" />
        <span className="font-bold uppercase tracking-wider text-zinc-700">NO BONFIRE</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono cursor-pointer transition-all group',
        isPulsing 
          ? 'bg-[#ea580c]/20 border-[#ea580c]/60 animate-pulse hover:bg-[#ea580c]/30' 
          : 'bg-amber-950/30 border-amber-700/50 hover:border-amber-600/70'
      )}
      title={`${nextBonfire.title} - ${new Date(nextBonfire.scheduled_time).toLocaleString()}`}
    >
      <Flame className={cn(
        'w-2.5 h-2.5',
        isPulsing ? 'text-[#ea580c]' : 'text-amber-500'
      )} />
      <div className="flex items-center gap-1">
        <span className={cn(
          'font-bold uppercase tracking-wider',
          isPulsing ? 'text-[#ea580c]' : 'text-amber-400'
        )}>
          {timeRemaining === 'NOW' ? 'BONFIRE' : 'BONFIRE'}
        </span>
        <span className="text-zinc-600">•</span>
        <span className={cn(
          'font-mono font-bold',
          isPulsing ? 'text-[#ea580c]' : 'text-amber-300'
        )}>
          {timeRemaining}
        </span>
      </div>
      {nextBonfire.attendee_ids?.length > 0 && (
        <>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-0.5">
            <Users className="w-2 h-2 text-zinc-500" />
            <span className="text-zinc-500 font-bold">{nextBonfire.attendee_ids.length}</span>
          </div>
        </>
      )}
    </div>
  );
}