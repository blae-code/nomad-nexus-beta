import React from 'react';
import { Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';

export default function SystemStatusWidget({ widgetId, config, onRemove, isDragging }) {
  const { state: readinessState, reason } = useReadiness();
  const { latency } = useLatency();

  const stateColors = {
    OPERATIONAL: 'text-green-500',
    DEGRADED: 'text-yellow-500',
    OFFLINE: 'text-red-500',
    UNKNOWN: 'text-zinc-500',
  };

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">System Status</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-zinc-800/50 rounded p-2 border border-orange-500/10">
          <div className="text-xs text-zinc-500 mb-1">System Readiness</div>
          <div className={`text-sm font-bold ${stateColors[readinessState]}`}>
            {readinessState}
          </div>
          {reason && <div className="text-xs text-zinc-600 mt-1">{reason}</div>}
        </div>

        <div className="bg-zinc-800/50 rounded p-2 border border-orange-500/10">
          <div className="text-xs text-zinc-500 mb-1">Network Latency</div>
          <div className="text-sm font-bold text-zinc-200">
            {latency ? `${latency}ms` : '—'}
          </div>
        </div>
      </div>
    </>
  );
}