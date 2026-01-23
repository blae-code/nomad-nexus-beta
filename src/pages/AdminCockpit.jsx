import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Radio, AlertTriangle, CheckCircle2, RefreshCw, 
  Download, Activity, Clock, Zap, MessageSquare, Gamepad2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CockpitHeader from '@/components/admin/CockpitHeader';
import TelemetryPanel from '@/components/admin/TelemetryPanel';
import SchemaCheckStep from '@/components/admin/steps/SchemaCheckStep';
import WipeDataStep from '@/components/admin/steps/WipeDataStep';
import SeedDataStep from '@/components/admin/steps/SeedDataStep';
import CommsTestStep from '@/components/admin/steps/CommsTestStep';
import TacticalMapStep from '@/components/admin/steps/TacticalMapStep';
import CommsModeControl from '@/components/admin/CommsModeControl';
import TicketBoard from '@/components/admin/TicketBoard';
import DemoScenarioController from '@/components/admin/DemoScenarioController';
import UserManagementTab from '@/components/admin/UserManagementTab';

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
  const [activeTab, setActiveTab] = useState('cockpit');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoScenario, setDemoScenario] = useState(null);
  const [isSetupDemo, setIsSetupDemo] = useState(false);
  const queryClient = useQueryClient();

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
      
      // Invalidate audit logs query to refresh
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      
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

  // Setup demo scenario
  const handleEnableDemo = async () => {
    setIsSetupDemo(true);
    try {
      const response = await base44.functions.invoke('setupDemoScenario', {});
      setDemoScenario(response.data?.scenario);
      setDemoEnabled(true);
    } catch (err) {
      console.error('Demo setup failed:', err);
    } finally {
      setIsSetupDemo(false);
    }
  };

  const handleDisableDemo = () => {
    setDemoEnabled(false);
    setDemoScenario(null);
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

        {/* Tabs: Cockpit or Feedback Tickets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="h-8 gap-0.5">
            <TabsTrigger value="cockpit" className="text-[9px] h-6 px-2">
              Cockpit
            </TabsTrigger>
            <TabsTrigger value="users" className="text-[9px] h-6 px-2">
              Users
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-[9px] h-6 px-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Cockpit Tab */}
          <TabsContent value="cockpit" className="flex-1 overflow-hidden flex flex-col gap-4 mt-0">
            {/* Demo Scenario Toggle */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase">Demo Mode</div>
                  <p className="text-[8px] text-zinc-600 mt-0.5">5-step guided operational walkthrough</p>
                </div>
                <Button
                  onClick={demoEnabled ? handleDisableDemo : handleEnableDemo}
                  disabled={isSetupDemo}
                  className={cn(
                    'text-[9px] h-8 px-3 font-bold uppercase flex items-center gap-2',
                    demoEnabled
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300'
                      : 'bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300'
                  )}
                >
                  <Gamepad2 className="w-3 h-3" />
                  {demoEnabled ? 'Active' : 'Enable'}
                </Button>
              </div>
            </div>

            {/* Comms Mode Control */}
            <div className="border border-zinc-800 bg-zinc-950/50 p-3">
              <CommsModeControl />
            </div>

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
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="flex-1 overflow-hidden mt-0">
            <UserManagementTab user={user} />
          </TabsContent>

          {/* Feedback Tickets Tab */}
          <TabsContent value="tickets" className="flex-1 overflow-hidden mt-0">
            <TicketBoard user={user} />
          </TabsContent>
        </Tabs>

        {/* Demo Sequence Guide */}
        {demoEnabled && demoScenario && (
          <DemoScenarioController 
            scenario={demoScenario}
            onStepChange={(stepIndex, highlight) => {
              // Can be used to highlight elements
              window.dispatchEvent(new CustomEvent('demo:highlight', { detail: { target: highlight } }));
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}