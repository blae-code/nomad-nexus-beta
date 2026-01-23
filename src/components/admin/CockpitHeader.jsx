import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CockpitHeader({ readinessScore, auditLogs }) {
  const [commsMode, setCommsMode] = useState('LIVE');

  // Check LiveKit environment
  const hasLiveKit = process.env.VITE_LIVEKIT_URL && process.env.VITE_LIVEKIT_API_KEY;

  // Get last run time
  const lastRun = auditLogs[0]?.executed_at;
  const lastRunTime = lastRun ? new Date(lastRun).toLocaleTimeString() : 'Never';

  // Export report as JSON
  const exportReport = () => {
    const report = {
      cockpit: {
        readiness_score: readinessScore,
        comms_mode: commsMode,
        livekit: hasLiveKit ? 'READY' : 'MISSING',
        last_run: lastRunTime,
        exported_at: new Date().toISOString()
      },
      recent_audits: auditLogs.slice(0, 10).map(log => ({
        step: log.step_name,
        action: log.action,
        status: log.status,
        duration: log.duration_ms,
        executed_at: log.executed_at
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cockpit-report-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-900/30 text-green-400 border-green-700/50';
    if (score >= 50) return 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50';
    return 'bg-red-900/30 text-red-400 border-red-700/50';
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950/80 p-3 space-y-2">
      {/* First row: Score & badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-mono">READINESS SCORE</p>
            <p className={cn('text-2xl font-bold font-mono', {
              'text-green-400': readinessScore >= 80,
              'text-yellow-400': readinessScore >= 50 && readinessScore < 80,
              'text-red-400': readinessScore < 50
            })}>
              {readinessScore}%
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap ml-4">
            <Badge className={cn('text-[9px]', getBadgeColor(readinessScore))}>
              {readinessScore >= 80 ? 'READY' : readinessScore >= 50 ? 'PARTIAL' : 'NEEDS WORK'}
            </Badge>
            <Badge variant={hasLiveKit ? 'default' : 'outline'} className="text-[9px] bg-blue-900/30 text-blue-400 border-blue-700/50">
              {hasLiveKit ? 'LIVEKIT ✓' : 'LIVEKIT ✗'}
            </Badge>
          </div>
        </div>

        {/* Right side: Mode, last run, export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">COMMS MODE</p>
            <button
              onClick={() => setCommsMode(commsMode === 'LIVE' ? 'SIM' : 'LIVE')}
              className={cn(
                'px-2 py-1 text-[9px] font-bold border rounded transition-colors',
                commsMode === 'LIVE'
                  ? 'bg-red-900/30 border-red-700/50 text-red-400'
                  : 'bg-blue-900/30 border-blue-700/50 text-blue-400'
              )}
            >
              {commsMode}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-mono">
            <Clock className="w-3 h-3" />
            {lastRunTime}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={exportReport}
            className="gap-1.5 h-7 text-[9px] border-zinc-700 text-zinc-300 hover:text-zinc-100"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}