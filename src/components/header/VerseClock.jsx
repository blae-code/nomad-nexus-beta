import React from 'react';
import { useVerseTime } from '@/components/hooks/useVerseTime';
import { Clock } from 'lucide-react';

export default function VerseClock() {
  const timeData = useVerseTime();

  if (!timeData) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-orange-500/30 rounded hover:border-orange-500/60 transition-colors">
      <Clock className="w-3.5 h-3.5 text-orange-500" />
      <div className="flex flex-col">
        <span className="text-xs font-mono font-bold text-orange-400">{timeData.localTime}</span>
        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">UTC {timeData.utcTime}</span>
      </div>
    </div>
  );
}