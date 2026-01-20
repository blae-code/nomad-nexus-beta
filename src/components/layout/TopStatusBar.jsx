import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TopStatusBar() {
  const [time, setTime] = useState(new Date());
  const [systemHealth, setSystemHealth] = useState('nominal');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const healthColor = {
    nominal: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
  }[systemHealth];

  return (
    <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between shrink-0">
      {/* Left: System Health */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className={cn('w-3 h-3', healthColor)} />
          <span className={cn('uppercase tracking-wider font-bold', healthColor)}>
            {systemHealth.toUpperCase()}
          </span>
        </div>
        <div className="text-zinc-600">|</div>
        <span className="text-zinc-500">ALL SYSTEMS OPERATIONAL</span>
      </div>

      {/* Right: Time */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-[#ea580c]" />
          <div>
            <div className="text-zinc-300 font-bold">
              {time.toLocaleTimeString([], { hour12: false })}
            </div>
            <div className="text-zinc-600 text-[10px]">UTC</div>
          </div>
        </div>
      </div>
    </div>
  );
}