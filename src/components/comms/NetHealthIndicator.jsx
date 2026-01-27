import { Signal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NetHealthIndicator({ netStatus }) {
  if (!netStatus) return null;

  const signalStrength = netStatus.signal_strength || 100;
  const quality = netStatus.connectivity_quality || 'excellent';
  const isJammed = netStatus.is_jammed;
  const packetLoss = netStatus.packet_loss_percent || 0;

  const qualityConfig = {
    excellent: { color: 'text-emerald-500', bg: 'bg-emerald-500/20', label: 'EXCELLENT', signal: '▓▓▓▓▓' },
    good: { color: 'text-cyan-500', bg: 'bg-cyan-500/20', label: 'GOOD', signal: '▓▓▓▓░' },
    fair: { color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'FAIR', signal: '▓▓▓░░' },
    poor: { color: 'text-orange-500', bg: 'bg-orange-500/20', label: 'POOR', signal: '▓▓░░░' },
    critical: { color: 'text-red-500', bg: 'bg-red-500/20', label: 'CRITICAL', signal: '▓░░░░' }
  };

  const config = qualityConfig[quality] || qualityConfig.fair;

  return (
    <div className={cn('px-2 py-1.5 rounded border text-[10px] font-mono space-y-1.5', config.bg)}>
      {/* Signal Strength */}
      <div className="flex items-center gap-2">
        <Signal className={cn('w-3 h-3', config.color)} />
        <span className={cn('font-bold', config.color)}>SIGNAL</span>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-zinc-400">{config.signal}</span>
          <span className="text-zinc-600">{signalStrength}%</span>
        </div>
      </div>

      {/* Quality Status */}
      <div className={cn('flex items-center gap-2', config.color)}>
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span className="font-bold">{config.label}</span>
      </div>

      {/* Packet Loss */}
      {packetLoss > 0 && (
        <div className="flex items-center justify-between text-zinc-500">
          <span>PKT LOSS:</span>
          <span className={packetLoss > 5 ? 'text-orange-500' : 'text-zinc-400'}>{packetLoss.toFixed(1)}%</span>
        </div>
      )}

      {/* Jamming Warning */}
      {isJammed && (
        <div className="flex items-center gap-2 p-1.5 bg-red-900/30 border border-red-700/50">
          <Zap className="w-3 h-3 text-red-400 animate-pulse" />
          <span className="text-red-400 font-bold">JAMMED</span>
        </div>
      )}
    </div>
  );
}