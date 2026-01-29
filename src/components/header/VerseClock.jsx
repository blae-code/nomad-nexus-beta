import React from 'react';
import { useVerseTime } from '@/components/hooks/useVerseTime';
import { Clock } from 'lucide-react';

export default function VerseClock() {
  const timeData = useVerseTime();

  if (!timeData) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-orange-500/40 rounded-lg backdrop-blur hover:border-orange-500/70 hover:bg-zinc-900/80 transition-all duration-300">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <Clock className="w-3.5 h-3.5 text-orange-500" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-mono font-bold text-orange-300 tracking-tight">{timeData.localTime}</span>
        <span className="text-[9px] text-orange-500/70 font-semibold uppercase tracking-wider">UTC {timeData.utcTime}</span>
      </div>
    </div>
  );
}