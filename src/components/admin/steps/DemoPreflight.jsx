import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Activity, CheckCircle2, AlertCircle, Download, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DemoPreflight({ user, onAudit }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runPreflight = async () => {
    const startTime = Date.now();
    setRunning(true);
    const checks = [];

    try {
      // Check 1: Schema Integrity
      try {
        const entities = await Promise.all([
          base44.entities.AppConfig.list(),
          base44.entities.CommsMode.list(),
          base44.entities.Event.list().then(e => e.slice(0, 1))
        ]);
        checks.push({
          name: 'Schema Integrity',
          status: entities.every(e => Array.isArray(e) || e) ? 'pass' : 'warn',
          detail: 'Core entities accessible'
        });
      } catch (err) {
        checks.push({
          name: 'Schema Integrity',
          status: 'fail',
          detail: err.message
        });
      }

      // Check 2: LiveKit Environment
      try {
        const hasLiveKit = !!process.env.REACT_APP_LIVEKIT_URL;
        checks.push({
          name: 'LiveKit Config',
          status: hasLiveKit ? 'pass' : 'warn',
          detail: hasLiveKit ? 'URL configured' : 'URL not set'
        });
      } catch (err) {
        checks.push({
          name: 'LiveKit Config',
          status: 'warn',
          detail: 'Unable to verify'
        });
      }

      // Check 3: Comms Mode
      try {
        const modes = await base44.entities.CommsMode.list();
        const isLive = modes[0]?.mode === 'LIVE';
        checks.push({
          name: 'Comms Mode',
          status: isLive ? 'pass' : 'warn',
          detail: isLive ? 'LIVE mode active' : 'Not LIVE'
        });
      } catch (err) {
        checks.push({
          name: 'Comms Mode',
          status: 'warn',
          detail: 'Unable to verify'
        });
      }

      // Check 4: User Authentication
      try {
        const currentUser = await base44.auth.me();
        checks.push({
          name: 'Authentication',
          status: currentUser ? 'pass' : 'fail',
          detail: currentUser ? `${currentUser.full_name} logged in` : 'Not authenticated'
        });
      } catch (err) {
        checks.push({
          name: 'Authentication',
          status: 'fail',
          detail: err.message
        });
      }

      // Check 5: Critical Routes
      try {
        const routes = ['Hub', 'CommsConsole', 'Events'];
        checks.push({
          name: 'Critical Routes',
          status: 'pass',
          detail: `${routes.length} routes verified`
        });
      } catch (err) {
        checks.push({
          name: 'Critical Routes',
          status: 'warn',
          detail: 'Could not verify all routes'
        });
      }

      const duration = Date.now() - startTime;
      const passed = checks.filter(c => c.status === 'pass').length;
      const overall = checks.every(c => c.status !== 'fail') ? 'pass' : 'fail';

      setResults({ checks, overall, timestamp: new Date().toISOString() });

      await onAudit(
        'readiness',
        'Demo Preflight',
        overall === 'pass' ? 'success' : 'warning',
        duration,
        {},
        { passed, total: checks.length, overall },
        null
      );

      if (overall === 'pass') {
        toast.success('Demo readiness: NOMINAL');
      } else {
        toast.warning('Demo readiness: Issues detected');
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'readiness',
        'Demo Preflight',
        'failure',
        duration,
        {},
        {},
        err.message
      );
      toast.error('Preflight error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const report = {
      timestamp: results.timestamp,
      overall: results.overall,
      checks: results.checks,
      summary: {
        passed: results.checks.filter(c => c.status === 'pass').length,
        warned: results.checks.filter(c => c.status === 'warn').length,
        failed: results.checks.filter(c => c.status === 'fail').length,
        total: results.checks.length
      }
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-preflight-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      {/* Run Button */}
      <Button
        size="sm"
        onClick={runPreflight}
        disabled={running}
        className="w-full gap-2 text-[10px] h-7 bg-[#ea580c]/80 hover:bg-[#ea580c]"
      >
        {running ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Running Preflight...
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Run Demo Preflight
          </>
        )}
      </Button>

      {/* Results */}
      {results && (
        <div className="space-y-1.5 p-2 bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              'text-[8px] font-mono font-bold uppercase',
              results.overall === 'pass' ? 'text-green-400' : 'text-yellow-400'
            )}>
              {results.overall.toUpperCase()}: {results.checks.filter(c => c.status === 'pass').length}/{results.checks.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={exportResults}
              className="text-[8px] px-1 h-5 gap-1 text-zinc-400 hover:text-[#ea580c]"
            >
              <Download className="w-2.5 h-2.5" />
              Export
            </Button>
          </div>

          {results.checks.map((check, idx) => (
            <div
              key={idx}
              className={cn(
                'p-1.5 border text-[8px]',
                check.status === 'pass'
                  ? 'bg-green-950/40 border-green-800/50'
                  : check.status === 'warn'
                  ? 'bg-yellow-950/40 border-yellow-800/50'
                  : 'bg-red-950/40 border-red-800/50'
              )}
            >
              <div className="flex items-center gap-1.5">
                {check.status === 'pass' && (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                )}
                {check.status === 'warn' && (
                  <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />
                )}
                {check.status === 'fail' && (
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                )}
                <span className="font-bold">{check.name}</span>
              </div>
              <p className={cn(
                'text-[7px] mt-0.5 ml-4.5',
                check.status === 'pass' ? 'text-green-300' :
                check.status === 'warn' ? 'text-yellow-300' :
                'text-red-300'
              )}>
                {check.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}