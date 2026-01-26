import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommsModeToggle from './CommsModeToggle';

export default function CockpitHeader({ readinessScore, auditLogs, effectiveCommsMode = 'SIM', modeFallbackReason = null }) {

  // Check LiveKit environment
  const hasLiveKit = !!import.meta.env.VITE_LIVEKIT_URL; // Check if env is configured
  const commsReady = effectiveCommsMode === 'LIVE'; // True if LIVE and stable

  // Get last run time
  const lastRun = auditLogs[0]?.executed_at;
  const lastRunTime = lastRun ? new Date(lastRun).toLocaleTimeString() : 'Never';

  // Export report as JSON
  const exportReport = () => {
    const report = {
      cockpit: {
        readiness_score: readinessScore,
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
            <Badge 
              variant={commsReady ? 'default' : 'outline'} 
              className={cn('text-[9px]', 
                commsReady ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50' : 'bg-amber-900/30 text-amber-400 border-amber-700/50'
              )}
              title={modeFallbackReason || 'Comms system operational'}
            >
              {commsReady ? 'COMMS: LIVE' : 'COMMS: SIM'}
              {modeFallbackReason && ' (fallback)'}
            </Badge>
          </div>
        </div>

        {/* Right side: Comms mode, last run, export */}
        <div className="flex items-center gap-4">
          <CommsModeToggle />

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
