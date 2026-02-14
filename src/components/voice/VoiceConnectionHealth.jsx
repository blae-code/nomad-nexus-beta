import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import HelpTooltip from '@/components/common/HelpTooltip';

export default function VoiceConnectionHealth({ 
  status = 'disconnected', 
  quality = 'unknown',
  latency = null,
  showLabel = true,
  compact = false
}) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'bg-green-500/10 text-green-400 border-green-500/30',
      label: 'Connected',
      pulse: false,
    },
    connecting: {
      icon: Signal,
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      label: 'Connecting',
      pulse: true,
    },
    reconnecting: {
      icon: Signal,
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      label: 'Reconnecting',
      pulse: true,
    },
    disconnected: {
      icon: WifiOff,
      color: 'bg-zinc-700/10 text-zinc-500 border-zinc-700/30',
      label: 'Disconnected',
      pulse: false,
    },
    error: {
      icon: WifiOff,
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      label: 'Error',
      pulse: false,
    },
  };

  const qualityIcons = {
    excellent: SignalHigh,
    good: SignalHigh,
    fair: SignalMedium,
    poor: SignalLow,
    unknown: Signal,
  };

  const config = statusConfig[status] || statusConfig.disconnected;
  const Icon = config.icon;
  const QualityIcon = qualityIcons[quality] || Signal;

  const tooltipContent = `
    Status: ${config.label}
    ${quality !== 'unknown' ? `Quality: ${quality}` : ''}
    ${latency ? `Latency: ${latency}ms` : ''}
  `.trim();

  if (compact) {
    return (
      <HelpTooltip content={tooltipContent}>
        <div className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full border ${config.color}`}>
          <Icon className="w-4 h-4" />
          {config.pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-75" 
                  style={{ backgroundColor: 'currentColor' }} />
          )}
        </div>
      </HelpTooltip>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Badge className={`${config.color} relative`}>
        <Icon className="w-3 h-3 mr-1.5" />
        {showLabel && config.label}
        {config.pulse && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" 
                style={{ backgroundColor: 'currentColor' }} />
        )}
      </Badge>
      
      {status === 'connected' && quality !== 'unknown' && (
        <HelpTooltip content={tooltipContent}>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <QualityIcon className="w-3 h-3" />
            {latency && <span>{latency}ms</span>}
          </div>
        </HelpTooltip>
      )}
    </div>
  );
}