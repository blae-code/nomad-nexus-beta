import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LiveSystemMetrics() {
  const [latency, setLatency] = useState(0);
  const [uptime, setUptime] = useState('00:00:00');
  const [systemState, setSystemState] = useState('NOMINAL');

  // Ping for latency
  useEffect(() => {
    const ping = async () => {
      const start = performance.now();
      try {
        await base44.auth.me();
        setLatency(Math.round(performance.now() - start));
        setSystemState('NOMINAL');
      } catch {
        setSystemState('DEGRADED');
      }
    };
    ping();
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track uptime
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const mins = Math.floor((elapsed % 3600) / 60);
      const secs = elapsed % 60;
      setUptime(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: metrics = {} } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const [users, presences, events] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.UserPresence.list(),
        base44.entities.Event.list()
      ]);

      const onlineCount = new Set(
        presences.filter(p => p.status !== 'offline').map(p => p.user_id)
      ).size;

      const activeEvents = events.filter(e => 
        ['active', 'pending', 'briefing'].includes(e.status)
      ).length;

      return {
        totalUsers: users.length,
        onlineUsers: onlineCount,
        activeEvents,
        totalEvents: events.length
      };
    },
    refetchInterval: 3000
  });

  const stateColors = {
    NOMINAL: 'text-emerald-400 bg-emerald-950/30',
    CAUTION: 'text-yellow-400 bg-yellow-950/30',
    DEGRADED: 'text-red-400 bg-red-950/30'
  };

  return (
    <div className="space-y-3 text-[9px]">
      {/* System Status */}
      <div className="border border-zinc-800 bg-zinc-900/50 p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold text-zinc-400">SYSTEM STATUS</span>
          <div className={cn('px-2 py-0.5 font-mono font-bold uppercase', stateColors[systemState])}>
            {systemState}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[8px]">
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Latency</span>
            <div className={cn('text-xs font-bold font-mono mt-0.5', latency > 300 ? 'text-red-400' : latency > 150 ? 'text-yellow-400' : 'text-emerald-400')}>
              {latency}ms
            </div>
          </div>
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Uptime</span>
            <div className="text-xs font-bold font-mono mt-0.5 text-cyan-400">
              {uptime}
            </div>
          </div>
        </div>
      </div>

      {/* User Activity */}
      <div className="border border-zinc-800 bg-zinc-900/50 p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3 h-3 text-zinc-600" />
          <span className="font-mono font-bold text-zinc-400">PERSONNEL</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[8px]">
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Total</span>
            <div className="text-xs font-bold font-mono mt-0.5 text-zinc-300">
              {metrics.totalUsers || 0}
            </div>
          </div>
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Online</span>
            <div className="text-xs font-bold font-mono mt-0.5 text-emerald-400">
              {metrics.onlineUsers || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="border border-zinc-800 bg-zinc-900/50 p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Radio className="w-3 h-3 text-zinc-600" />
          <span className="font-mono font-bold text-zinc-400">OPERATIONS</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[8px]">
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Active</span>
            <div className="text-xs font-bold font-mono mt-0.5 text-yellow-400">
              {metrics.activeEvents || 0}
            </div>
          </div>
          <div className="border border-zinc-800/50 bg-zinc-950/50 p-1.5">
            <span className="text-zinc-600">Total</span>
            <div className="text-xs font-bold font-mono mt-0.5 text-zinc-300">
              {metrics.totalEvents || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}