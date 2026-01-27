import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ReadinessMeter: 3-state indicator (green/amber/red)
 * 
 * Green: optimal comms + low latency (<150ms)
 * Amber: degraded comms OR elevated latency (150-300ms)
 * Red: connection lost OR high latency (>300ms)
 * 
 * Single pulse animation only on amber/red states.
 * Clickable to open diagnostics.
 */

export default function ReadinessMeter({ 
  connectionStatus = 'OPTIMAL', 
  latency = 0,
  onDiagnosticsClick 
}) {
  // Determine state: green, amber, or red
  const getState = () => {
    if (connectionStatus !== 'OPTIMAL') return 'red';
    if (latency > 300) return 'red';
    if (latency > 150) return 'amber';
    return 'green';
  };

  const state = getState();

  const stateConfig = {
    green: {
      label: 'READY',
      bgClass: 'bg-emerald-950/20 border-emerald-700/40 text-emerald-300',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    amber: {
      label: 'CHECK',
      bgClass: 'bg-amber-950/20 border-amber-700/40 text-amber-300',
      dotClass: 'bg-amber-500',
      icon: AlertCircle,
    },
    red: {
      label: 'ALERT',
      bgClass: 'bg-red-950/20 border-red-700/40 text-red-300',
      dotClass: 'bg-red-500',
      icon: AlertCircle,
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <button
      onClick={onDiagnosticsClick}
      className={cn(
        'flex items-center gap-1.5 px-3 h-10 border rounded-sm transition-all duration-150 focus-visible:ring-1 focus-visible:ring-[#ea580c]/30',
        config.bgClass,
        (state === 'amber' || state === 'red') && 'animate-pulse'
      )}
      title={`Readiness: ${config.label} (${connectionStatus}, ${latency}ms)`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-[10px] font-mono font-bold uppercase hidden sm:inline">
        {config.label}
      </span>
    </button>
  );
}