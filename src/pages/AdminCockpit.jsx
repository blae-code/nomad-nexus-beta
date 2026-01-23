import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Radio, AlertTriangle, CheckCircle2, RefreshCw, 
  Download, Activity, Clock, Zap, MessageSquare, Gamepad2,
  Server, Users, Zap as ZapIcon, Shield, TrendingUp, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CockpitHeader from '@/components/admin/CockpitHeader';
import TelemetryPanel from '@/components/admin/TelemetryPanel';
import AdminCockpitAccordion from '@/components/admin/AdminCockpitAccordion';
import { COCKPIT_SECTIONS, hasRank } from '@/components/admin/cockpitSectionConfig';

// Utility to filter accessible sections by user rank
const getAccessibleSections = (user) => {
  return COCKPIT_SECTIONS.filter(section => {
    const rankHierarchy = ['vagrant', 'scout', 'voyager', 'founder', 'pioneer'];
    const userRankIndex = rankHierarchy.indexOf((user?.rank || 'vagrant').toLowerCase());
    const minRankIndex = rankHierarchy.indexOf((section.minRank || 'vagrant').toLowerCase());
    return userRankIndex >= minRankIndex && section.visible;
  });
};
import TicketBoard from '@/components/admin/TicketBoard';
import DemoScenarioController from '@/components/admin/DemoScenarioController';
import UserManagementTab from '@/components/admin/UserManagementTab';
import BootMediaAdmin from '@/components/admin/BootMediaAdmin';
import CommsPreflightPanel from '@/components/admin/CommsPreflightPanel';
import { checkLiveKitReadiness } from '@/components/comms/checkLiveKitReadiness';
import { useCommsMode } from '@/components/comms/useCommsMode';

export default function AdminCockpitPage() {
  const [user, setUser] = useState(null);
  const [readinessScore, setReadinessScore] = useState(0);
  const [logs, setLogs] = useState([]);
  const [expandedSection, setExpandedSection] = useState('readiness');
  const [activeTab, setActiveTab] = useState('cockpit');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoScenario, setDemoScenario] = useState(null);
  const [isSetupDemo, setIsSetupDemo] = useState(false);
  const [effectiveCommsMode, setEffectiveCommsMode] = useState('SIM');
  const [modeFallbackReason, setModeFallbackReason] = useState(null);
  const queryClient = useQueryClient();
  
  // Get desired mode from config
  const { isLive: desiredLive } = useCommsMode();

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
    ['readiness', 'comms', 'data'].forEach(sectionId => {
      const lastRun = auditLogs.find(log => log.step_name === sectionId && log.status === 'success');
      stepStatus[sectionId] = lastRun ? 33 : 0;
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
      <div className="h-full overflow-hidden flex flex-col bg-black">
        {/* Header with readiness score & real-time system status */}
          <div className="border-b border-zinc-800 px-4 py-3 shrink-0 space-y-2">
            <CockpitHeader readinessScore={readinessScore} auditLogs={auditLogs} />

            {/* System Status Indicators */}
            <div className="flex items-center gap-3 flex-wrap text-[8px]">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                <Server className="w-3 h-3 text-blue-400" />
                <span className="text-zinc-300">Backend:</span>
                <span className="font-mono font-bold text-blue-400">OPERATIONAL</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                <MessageSquare className="w-3 h-3 text-green-400" />
                <span className="text-zinc-300">Comms:</span>
                <span className="font-mono font-bold text-green-400">{demoEnabled ? 'DEMO' : 'LIVE'}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                <Users className="w-3 h-3 text-purple-400" />
                <span className="text-zinc-300">Users:</span>
                <span className="font-mono font-bold text-purple-400">{auditLogs.length > 0 ? 'Active' : 'Ready'}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                <TrendingUp className="w-3 h-3 text-yellow-400" />
                <span className="text-zinc-300">Health:</span>
                <span className="font-mono font-bold text-yellow-400">{readinessScore}%</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span className="text-zinc-300">Sync:</span>
                <span className="font-mono font-bold text-cyan-400">In-Sync</span>
              </div>
            </div>
          </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Tab navigation - compact and sticky */}
            <div className="border-b border-zinc-800 px-4 shrink-0 bg-zinc-950/40">
              <TabsList className="h-9 gap-0.5 bg-transparent border-none">
                <TabsTrigger value="cockpit" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                  ◆ COCKPIT
                </TabsTrigger>
                <TabsTrigger value="users" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                  👥 USERS
                </TabsTrigger>
                <TabsTrigger value="tickets" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c] flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  FEEDBACK
                </TabsTrigger>
                <TabsTrigger value="boot-media" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                   🎬 BOOT MEDIA
                 </TabsTrigger>
                 <TabsTrigger value="comms-preflight" className="text-[9px] h-7 px-3 data-[state=active]:bg-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c]">
                   📡 COMMS PREFLIGHT
                 </TabsTrigger>
                </TabsList>
                </div>

            {/* Cockpit Tab - accordion layout */}
            <TabsContent value="cockpit" className="flex-1 overflow-hidden mt-0 flex gap-0">
              {/* LEFT SIDEBAR: Demo Control (240px) */}
              <div className="w-60 border-r border-zinc-800 overflow-y-auto flex flex-col p-2 bg-zinc-950/60 shrink-0 gap-2">
                {/* Demo Mode Card */}
                <div className="border border-zinc-800 bg-zinc-900/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase">Demo</p>
                    <Button
                      onClick={demoEnabled ? handleDisableDemo : handleEnableDemo}
                      disabled={isSetupDemo}
                      size="sm"
                      className={cn(
                        'text-[8px] h-6 px-2 font-bold uppercase',
                        demoEnabled
                          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300'
                          : 'bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300'
                      )}
                    >
                      <Gamepad2 className="w-2.5 h-2.5 mr-1" />
                      {demoEnabled ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                  <p className="text-[8px] text-zinc-500">Guided walkthrough</p>
                </div>

                <div className="border-t border-zinc-800" />

                {/* Health Score Card */}
                <div className="border border-zinc-800 bg-zinc-900/50 p-2.5 space-y-1.5">
                  <p className="text-[8px] font-mono text-zinc-500 uppercase">Health</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ea580c] to-orange-500 transition-all"
                        style={{ width: `${readinessScore}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-[#ea580c] min-w-max">{readinessScore}%</span>
                  </div>
                </div>
              </div>

              {/* CENTER: Accordion Sections (flex) */}
              <div className="flex-1 overflow-hidden flex flex-col p-2 gap-2 min-w-0">
                {getAccessibleSections(user).map((section) => {
                  const Component = section.component;
                  const isExpanded = expandedSection === section.id;
                  
                  return (
                    <div key={section.id} className="border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                      {/* Section Header */}
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <section.icon className="w-4 h-4 text-[#ea580c] shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-[9px] font-bold text-zinc-200">{section.label}</div>
                            <div className="text-[7px] text-zinc-500">{section.description}</div>
                          </div>
                        </div>
                        <div className="text-[9px] text-zinc-500 shrink-0">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && Component && (
                        <div className="border-t border-zinc-800 overflow-y-auto max-h-96">
                          <Component 
                            user={user}
                            onAudit={logAuditAction}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* RIGHT SIDEBAR: Telemetry (280px) */}
              <div className="w-72 border-l border-zinc-800 overflow-hidden flex flex-col p-2 bg-zinc-950/60 shrink-0">
                <TelemetryPanel logs={logs} auditLogs={auditLogs} />
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="flex-1 overflow-hidden mt-0">
              <UserManagementTab user={user} />
            </TabsContent>

            {/* Feedback Tickets Tab */}
            <TabsContent value="tickets" className="flex-1 overflow-hidden mt-0 p-3">
              <TicketBoard user={user} />
            </TabsContent>

            {/* Boot Media Tab */}
            <TabsContent value="boot-media" className="flex-1 overflow-hidden mt-0 p-3 overflow-y-auto">
              <BootMediaAdmin />
            </TabsContent>

            {/* Comms Preflight Tab */}
            <TabsContent value="comms-preflight" className="flex-1 overflow-hidden mt-0 p-3 overflow-y-auto">
              <CommsPreflightPanel user={user} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Demo Sequence Guide */}
        {demoEnabled && demoScenario && (
          <DemoScenarioController 
            scenario={demoScenario}
            onStepChange={(stepIndex, highlight) => {
              window.dispatchEvent(new CustomEvent('demo:highlight', { detail: { target: highlight } }));
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}