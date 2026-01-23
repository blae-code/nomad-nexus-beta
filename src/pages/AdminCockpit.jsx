import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { 
  Radio, AlertTriangle, CheckCircle2, RefreshCw, 
  Download, Activity, Clock, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CockpitHeader from '@/components/admin/CockpitHeader';
import TelemetryPanel from '@/components/admin/TelemetryPanel';
import SchemaCheckStep from '@/components/admin/steps/SchemaCheckStep';
import WipeDataStep from '@/components/admin/steps/WipeDataStep';
import SeedDataStep from '@/components/admin/steps/SeedDataStep';
import CommsTestStep from '@/components/admin/steps/CommsTestStep';
import TacticalMapStep from '@/components/admin/steps/TacticalMapStep';

const READINESS_STEPS = [
  { id: 'schema_check', title: '① Schema Check', component: SchemaCheckStep },
  { id: 'wipe_data', title: '② Wipe Data', component: WipeDataStep },
  { id: 'seed_data', title: '③ Seed Faux Week', component: SeedDataStep },
  { id: 'comms_test', title: '④ Comms Tests', component: CommsTestStep },
  { id: 'tactical_map', title: '⑤ Tactical Map', component: TacticalMapStep }
];

export default function AdminCockpitPage() {
  const [user, setUser] = useState(null);
  const [readinessScore, setReadinessScore] = useState(0);
  const [logs, setLogs] = useState([]);
  const [expandedStep, setExpandedStep] = useState('schema_check');

  // Auth check - gate to Pioneer/Founder (rank check if needed)
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== 'admin') {
        window.location.href = '/hub';
      }
      setUser(u);
    });
  }, []);

  // Fetch recent audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => base44.entities.AdminAuditLog.list('-executed_at', 20),
    enabled: !!user
  });

  // Calculate readiness score based on last runs
  useEffect(() => {
    const stepStatus = {};
    READINESS_STEPS.forEach(step => {
      const lastRun = auditLogs.find(log => log.step_name === step.id && log.status === 'success');
      stepStatus[step.id] = lastRun ? 20 : 0;
    });
    const score = Object.values(stepStatus).reduce((a, b) => a + b, 0);
    setReadinessScore(Math.min(score, 100));
  }, [auditLogs]);

  // Handle step completion - add audit log
  const logAuditAction = async (stepName, action, status, duration, params, results, error) => {
    try {
      await base44.entities.AdminAuditLog.create({
        step_name: stepName,
        action,
        status,
        duration_ms: duration,
        params,
        results,
        error_message: error,
        executed_by: user.id,
        executed_at: new Date().toISOString()
      });
      
      // Add to local logs for telemetry panel
      setLogs(prev => [{
        timestamp: new Date().toLocaleTimeString(),
        action: `${stepName} → ${action}`,
        status,
        duration: `${duration}ms`
      }, ...prev].slice(0, 50));
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Radio className="w-12 h-12 text-[#ea580c] animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-500">LOADING COCKPIT...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout title="Admin Cockpit">
      <div className="h-full overflow-hidden flex flex-col gap-4 p-4 bg-black">
        {/* Header with readiness score & badges */}
        <CockpitHeader readinessScore={readinessScore} auditLogs={auditLogs} />

        {/* Main 2-column layout */}
        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          {/* LEFT: Runbook steps */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">READINESS RUNBOOK</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {READINESS_STEPS.map((step, idx) => {
                const Component = step.component;
                const isExpanded = expandedStep === step.id;
                
                return (
                  <div key={step.id} className="border border-zinc-800 bg-zinc-950/50">
                    {/* Step header */}
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{step.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {auditLogs.find(log => log.step_name === step.id && log.status === 'success') && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                        <span className={cn('text-[10px]', isExpanded ? 'text-zinc-400' : 'text-zinc-600')}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>

                    {/* Step content */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 p-3 bg-zinc-950/80 space-y-2">
                        <Component user={user} onAudit={logAuditAction} auditLogs={auditLogs} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Telemetry panel */}
          <TelemetryPanel logs={logs} auditLogs={auditLogs} />
        </div>
      </div>
    </PageLayout>
  );
}