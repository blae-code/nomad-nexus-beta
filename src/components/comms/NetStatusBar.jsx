import { Radio, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NetStatusBar({ 
  net, 
  activeUsers = 0, 
  transmittingCount = 0,
  connectionQuality = 'good',
  isConnected = false
}) {
  const getQualityColor = (quality) => {
    switch(quality) {
      case 'excellent': return 'text-emerald-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-amber-500';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="w-full px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 text-[11px] font-mono space-y-1">
      <div className="flex items-center justify-between text-zinc-300">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-wider">{net.code}</span>
          {isConnected && (
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              CONNECTED
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">USERS: <span className="text-white font-bold">{activeUsers}</span></span>
          {transmittingCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <Radio className="w-3 h-3 animate-pulse" />
              TX: <span className="font-bold">{transmittingCount}</span>
            </span>
          )}
          <span className={cn('flex items-center gap-1', getQualityColor(connectionQuality))}>
            <Zap className="w-3 h-3" />
            {connectionQuality.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}