import React, { useState, useEffect } from 'react';
import { Wifi, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function NetworkConditionsMonitor({ conditions, isSimulating }) {
  const [displayValues, setDisplayValues] = useState(conditions);

  useEffect(() => {
    if (!isSimulating) {
      setDisplayValues(conditions);
      return;
    }

    // Simulate jitter
    const interval = setInterval(() => {
      setDisplayValues(prev => ({
        simulated_latency_ms: Math.max(
          0,
          conditions.simulated_latency_ms + (Math.random() - 0.5) * (conditions.jitter_ms || 0)
        ),
        packet_loss_percent: conditions.packet_loss_percent + (Math.random() - 0.5) * 2,
        jitter_ms: conditions.jitter_ms
      }));
    }, 500);

    return () => clearInterval(interval);
  }, [conditions, isSimulating]);

  const getLatencyColor = (latency) => {
    if (latency < 50) return 'text-emerald-400';
    if (latency < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPacketLossColor = (loss) => {
    if (loss < 1) return 'text-emerald-400';
    if (loss < 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
        <Wifi className="w-4 h-4 text-[#ea580c]" />
        <h3 className="text-sm font-bold uppercase text-white">Network Conditions</h3>
        {isSimulating && (
          <motion.div
            animate={{ opacity: [1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="ml-auto text-xs text-[#ea580c] font-mono"
          >
            ACTIVE
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Latency */}
        <div className="space-y-1">
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider">Latency</div>
          <div className={cn('text-lg font-mono font-bold', getLatencyColor(displayValues.simulated_latency_ms))}>
            {Math.round(displayValues.simulated_latency_ms)}ms
          </div>
          <div className="text-[9px] text-zinc-600">
            {displayValues.simulated_latency_ms < 50 && '→ Optimal'}
            {displayValues.simulated_latency_ms >= 50 && displayValues.simulated_latency_ms < 150 && '→ Good'}
            {displayValues.simulated_latency_ms >= 150 && '→ Degraded'}
          </div>
        </div>

        {/* Packet Loss */}
        <div className="space-y-1">
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider">Packet Loss</div>
          <div className={cn('text-lg font-mono font-bold', getPacketLossColor(displayValues.packet_loss_percent))}>
            {displayValues.packet_loss_percent.toFixed(1)}%
          </div>
          <div className="text-[9px] text-zinc-600">
            {displayValues.packet_loss_percent < 1 && '→ None'}
            {displayValues.packet_loss_percent >= 1 && displayValues.packet_loss_percent < 5 && '→ Minimal'}
            {displayValues.packet_loss_percent >= 5 && '→ Severe'}
          </div>
        </div>

        {/* Jitter */}
        <div className="space-y-1">
          <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-wider">Jitter</div>
          <div className="text-lg font-mono font-bold text-zinc-400">
            ±{displayValues.jitter_ms}ms
          </div>
          <div className="text-[9px] text-zinc-600">Variance</div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="h-1 bg-zinc-900 overflow-hidden">
          <motion.div
            className={cn(
              'h-full',
              displayValues.simulated_latency_ms < 50 && 'bg-emerald-500',
              displayValues.simulated_latency_ms >= 50 && displayValues.simulated_latency_ms < 150 && 'bg-yellow-500',
              displayValues.simulated_latency_ms >= 150 && 'bg-red-500'
            )}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, (displayValues.simulated_latency_ms / 500) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}