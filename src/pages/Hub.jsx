import React, { useEffect, useMemo, useState } from 'react';
import { createPageUrl, isAdminUser } from '@/utils';
import { Shield, Radio, Map, Box, DollarSign, Settings, GraduationCap, Database, Package, BarChart3, BookOpen, ClipboardList, Award, Monitor, Gavel, Target, Compass, HelpCircle, Bug, CheckCircle2, Clock, AlertCircle, Check, Radar, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { MODULE_STATUS, getStatusBgColor, calculateCompletion } from '@/components/constants/moduleStatus';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import DevelopmentRoadmap from '@/components/common/DevelopmentRoadmap';
import NexusLoadingOverlay from '@/components/common/NexusLoadingOverlay';
import { useAuth } from '@/components/providers/AuthProvider';
import RouteGuard from '@/components/auth/RouteGuard';
import { useHubMetrics } from '@/components/hooks/useHubMetrics';
import { pagesConfig } from '@/pages.config';

const HUB_OVERLAY_KEY = 'nexus.hub.overlay.enabled';

const navItems = [
  { name: 'Operations Control', path: 'MissionControl', icon: Monitor, description: 'Plan and run Casual/Focused operations' },
  { name: 'Mission Catalog', path: 'MissionCatalog', icon: Target, description: 'Game-native mission index for operation planning' },
  { name: 'Command Center', path: 'CommandCenter', icon: Target, description: 'Orders, acknowledgements, and command flow' },
  { name: 'Fleet Tracking', path: 'FleetTracking', icon: Map, description: 'Real-time asset locations and status monitoring' },
  { name: 'Tactical Map', path: 'UniverseMap', icon: Map, description: 'Live tactical map with markers and status reports' },
  { name: 'Member Progression', path: 'MemberProgression', icon: Award, description: 'Skills, promotions, and mentorship matching' },
  { name: 'Onboarding Pipeline', path: 'OnboardingPipeline', icon: ClipboardList, description: 'Recruit checklist and mentorship milestones' },
  { name: 'Report Builder', path: 'ReportBuilder', icon: BarChart3, description: 'Custom reports with comprehensive analytics' },
  { name: 'Intel Nexus', path: 'IntelNexus', icon: Database, description: 'Intelligence gathering and threat analysis' },
  { name: 'Strategic Objectives', path: 'StrategicObjectives', icon: Target, description: 'Long-term organizational goals and progress' },
  { name: 'War Academy', path: 'WarAcademy', icon: GraduationCap, description: 'Training, simulations, and combat readiness' },
  { name: 'Fleet Command', path: 'FleetCommand', icon: Box, description: 'Asset management, engineering, and tactical map' },
  { name: 'Logistics Hub', path: 'LogisticsHub', icon: Package, description: 'Inventory and strategic resources' },
  { name: 'Nomad Registry', path: 'NomadRegistry', icon: Award, description: 'Personnel, availability, and achievements' },
  { name: 'Trade Nexus', path: 'TradeNexus', icon: DollarSign, description: 'Treasury, marketplace, and commerce' },
  { name: 'Comms Array', path: 'CommsConsole', icon: Radio, description: 'Communication channels and broadcasts' },
  { name: 'High Command', path: 'HighCommand', icon: Gavel, description: 'Governance, diplomacy, and strategic council' },
  { name: 'Frontier Ops', path: 'FrontierOps', icon: Compass, description: 'Exploration mapping, claims, and mission intel' },
  { name: 'Contract Exchange', path: 'MissionBoard', icon: ClipboardList, description: 'Async jobs, bounties, hauling, and orders' },
  { name: 'HUD Mode', path: 'HudMode', icon: Monitor, description: 'Second-screen tactical HUD' },
  { name: 'Data Vault', path: 'DataVault', icon: BookOpen, description: 'Knowledge archive and analytics' },
  { name: 'Nexus Training', path: 'NexusTraining', icon: HelpCircle, description: 'Tutorials and guides for using the Nexus platform' },
  { name: 'Access Gate', path: 'AccessGate', icon: Shield, description: 'Member verification and onboarding' },
  { name: 'System Admin', path: 'Settings', icon: Settings, description: 'Configuration and administration', adminOnly: true },
  { name: 'QA Console', path: 'QAConsole', icon: Bug, description: 'Development and QA testing tools for admins', adminOnly: true },
];

function calcTone(percentage) {
  if (percentage >= 70) return 'text-green-400';
  if (percentage >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export default function Hub() {
  const { user, loading: authLoading } = useAuth();
  const { isContextPanelOpen, isCommsDockOpen } = useShellUI();
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();
  const { metrics, loading: metricsLoading } = useHubMetrics();

  const [overlayEnabled, setOverlayEnabled] = useState(() => {
    try {
      return localStorage.getItem(HUB_OVERLAY_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('All Modules');

  useEffect(() => {
    try {
      localStorage.setItem(HUB_OVERLAY_KEY, overlayEnabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [overlayEnabled]);

  useEffect(() => {
    if (!metricsLoading) {
      setLoadingProgress(100);
      return;
    }
    const timer = setInterval(() => {
      setLoadingProgress((prev) => Math.min(prev + 7, 92));
    }, 170);
    return () => clearInterval(timer);
  }, [metricsLoading]);

  const isAdmin = isAdminUser(user);
  const registeredPages = useMemo(() => new Set(Object.keys(pagesConfig?.Pages || {})), []);
  const visibleNavItems = useMemo(
    () =>
      navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => ({ ...item, routeAvailable: registeredPages.has(item.path) })),
    [isAdmin, registeredPages]
  );

  const organizedItems = useMemo(
    () => ({
      complete: visibleNavItems.filter((item) => calculateCompletion(item.path) === 100).sort((a, b) => b.path.localeCompare(a.path)),
      inProgress: visibleNavItems.filter((item) => {
        const completion = calculateCompletion(item.path);
        return completion > 0 && completion < 100;
      }).sort((a, b) => calculateCompletion(b.path) - calculateCompletion(a.path)),
      planned: visibleNavItems.filter((item) => calculateCompletion(item.path) === 0).sort((a, b) => a.name.localeCompare(b.name)),
    }),
    [visibleNavItems]
  );

  const recentActivity = Array.isArray(metrics?.recentActivity) ? metrics.recentActivity : [];
  const breadcrumb = ['Home', 'Command Hub', activeSection];

  const getLiveMeta = (path) => {
    switch (path) {
      case 'MissionControl': return [{ label: 'Active Ops', value: metrics?.eventsActive }, { label: 'Upcoming', value: metrics?.eventsUpcoming }];
      case 'CommandCenter': return [{ label: 'Open Orders', value: metrics?.commandsOpen }, { label: 'Total Orders', value: metrics?.commandsTotal }];
      case 'FleetTracking': return [{ label: 'Deployments', value: metrics?.fleetDeployments }, { label: 'Cond Alerts', value: metrics?.fleetConditionAlerts }];
      case 'CommsConsole': return [{ label: 'Channels', value: metrics?.channels }, { label: 'Sched Msg', value: metrics?.commsScheduled }];
      case 'MissionCatalog': return [{ label: 'Catalog', value: metrics?.missionCatalogTotal }, { label: 'Active Ops', value: metrics?.eventsActive }];
      case 'ReportBuilder': return [{ label: 'Templates', value: metrics?.reportTemplates }, { label: 'Schedules', value: metrics?.reportSchedules }];
      case 'MemberProgression': return [{ label: 'Certs', value: metrics?.memberCertifications }, { label: 'Mentor Links', value: metrics?.registryMentorLinks }];
      default: return [];
    }
  };

  return (
    <RouteGuard requiredAuth="onboarded">
      <NexusLoadingOverlay isLoading={authLoading} message="Loading command center..." />
      <div className="relative w-full h-full flex flex-col px-6 py-6 overflow-y-auto">
        {overlayEnabled && (
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.10),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.08),transparent_45%)]" />
            <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:34px_34px]" />
          </div>
        )}

        <div className="relative space-y-3 mb-4">
          <div className="text-[11px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
            {breadcrumb.map((node, index) => (
              <React.Fragment key={`${node}-${index}`}>
                {index > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                <span>{node}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white">Command <span className="text-orange-500">Hub</span></h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Module status, roadmap, and tactical readiness</p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant={overlayEnabled ? 'default' : 'outline'} onClick={() => setOverlayEnabled((prev) => !prev)}>
                <Radar className="w-4 h-4 mr-1" />
                Tactical Overlay
              </Button>
            </div>
          </div>
          {metricsLoading && (
            <div className="border border-zinc-800 rounded p-3 bg-zinc-900/50">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                <span>Loading telemetry</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-green-400 transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="relative grid grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="col-span-2 overflow-y-auto space-y-6 pr-2">
            <SectionBlock
              title={`Complete (${organizedItems.complete.length})`}
              tone="complete"
              icon={CheckCircle2}
              onHeaderFocus={() => setActiveSection('Complete')}
              items={organizedItems.complete}
              getLiveMeta={getLiveMeta}
            />
            <SectionBlock
              title={`In Development (${organizedItems.inProgress.length})`}
              tone="progress"
              icon={Clock}
              onHeaderFocus={() => setActiveSection('In Development')}
              items={organizedItems.inProgress}
              getLiveMeta={getLiveMeta}
            />
            <SectionBlock
              title={`Planned (${organizedItems.planned.length})`}
              tone="planned"
              icon={AlertCircle}
              onHeaderFocus={() => setActiveSection('Planned')}
              items={organizedItems.planned}
              getLiveMeta={getLiveMeta}
              emptyIllustration
            />
          </div>

          <div className="col-span-1 border-l border-zinc-800/40 pl-6 overflow-y-auto space-y-4">
            <DevelopmentRoadmap metrics={metrics} loading={metricsLoading} />
            <div className="border border-zinc-800 rounded bg-zinc-900/40 p-3">
              <div className="text-xs font-bold text-orange-300 uppercase tracking-wider mb-2">Recent Activity Feed</div>
              {recentActivity.length === 0 ? (
                <div className="text-xs text-zinc-500">No recent activity in telemetry logs.</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {recentActivity.map((entry) => (
                    <div key={entry.id} className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
                      <div className="text-[10px] text-zinc-500 uppercase">{entry.type || 'ACTIVITY'}</div>
                      <div className="text-xs text-zinc-300 mt-1">{entry.summary}</div>
                      <div className="text-[10px] text-zinc-600 mt-1">{entry.created_date ? new Date(entry.created_date).toLocaleString() : 'Unknown time'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-4 border border-zinc-800 rounded bg-zinc-950/90 backdrop-blur-sm px-3 py-2 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Active Op: <span className="text-zinc-200">{activeOp?.activeEvent?.title || 'None'}</span></span>
            <span>Voice Net: <span className="text-zinc-200">{voiceNet?.activeNetId || 'None'}</span></span>
            <span>Dock: <span className="text-zinc-200">{isCommsDockOpen ? 'Open' : 'Closed'}</span></span>
            <span>Context: <span className="text-zinc-200">{isContextPanelOpen ? 'Open' : 'Closed'}</span></span>
          </div>
          <div className="text-zinc-500">Last sync: {metrics?.lastSync ? new Date(metrics.lastSync).toLocaleTimeString() : '--:--:--'}</div>
        </div>
      </div>
    </RouteGuard>
  );
}

function SectionBlock({ title, tone, icon: Icon, onHeaderFocus, items, getLiveMeta, emptyIllustration = false }) {
  const toneClass = tone === 'complete' ? 'text-green-400' : tone === 'progress' ? 'text-orange-400' : 'text-zinc-500';
  const hasItems = items.length > 0;
  return (
    <div className="space-y-2">
      <button onClick={onHeaderFocus} className={`flex items-center gap-2 ${toneClass}`} type="button">
        <Icon className="w-4 h-4" />
        <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
      </button>
      {!hasItems ? (
        <div className="border border-dashed border-zinc-700 rounded p-6 text-center bg-zinc-900/30">
          <div className="text-zinc-500 text-xs">{emptyIllustration ? 'No planned modules remain. Roadmap clear.' : 'No modules in this section.'}</div>
          {emptyIllustration && <div className="mt-3 text-[32px] leading-none opacity-40">[::]</div>}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 auto-rows-min">
          {items.map((item, index) => (
            <ModuleCard key={item.path} item={item} index={index} liveMeta={getLiveMeta(item.path)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ item, index, liveMeta = [] }) {
  const Icon = item.icon;
  const isRouteAvailable = item.routeAvailable !== false;
  const status = MODULE_STATUS[item.path];
  const statusPercentage = calculateCompletion(item.path);
  const tooltipSide = index % 6 >= 4 ? 'left' : 'right';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={170}>
        <TooltipTrigger asChild>
          {isRouteAvailable ? (
            <a href={createPageUrl(item.path)} className="group relative bg-zinc-900/40 border border-zinc-800/60 hover:border-orange-500/60 hover:bg-zinc-800/55 p-3 rounded transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
              <div className="relative flex flex-col items-center text-center gap-1.5">
                <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                  <Icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider leading-tight">{item.name}</h3>
                <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">{item.description}</p>
                {status && (
                  <div className="mt-1 pt-1 border-t border-zinc-700/50 w-full flex items-center justify-center gap-1">
                    <span className={`text-[10px] font-mono font-bold ${calcTone(statusPercentage)}`}>{statusPercentage}%</span>
                    {statusPercentage === 100 && <Check className="w-3 h-3 text-green-400" />}
                  </div>
                )}
                {liveMeta.length > 0 && (
                  <div className="mt-2 w-full space-y-1 text-[10px] text-zinc-400">
                    {liveMeta.slice(0, 2).map((row, idx) => (
                      <div key={`${item.path}-live-${idx}`} className="flex items-center justify-between">
                        <span className="uppercase tracking-widest text-[9px] text-zinc-500">{row.label}</span>
                        <span className="font-mono text-[10px] text-orange-300">{row.value ?? '--'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ) : (
            <div role="link" aria-disabled="true" className="group relative bg-zinc-900/30 border border-zinc-800/60 p-3 rounded opacity-80 cursor-not-allowed">
              <div className="relative flex flex-col items-center text-center gap-1.5">
                <div className="p-2 bg-zinc-800/60 border border-zinc-700 rounded"><Icon className="w-5 h-5 text-zinc-500" /></div>
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider leading-tight">{item.name}</h3>
                <p className="text-[10px] text-zinc-500 leading-tight line-clamp-2">{item.description}</p>
                <div className="mt-1 pt-1 border-t border-zinc-800/70 w-full flex items-center justify-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-500">Route pending</span>
                </div>
              </div>
            </div>
          )}
        </TooltipTrigger>
        {status && (
          <TooltipContent side={tooltipSide} align="center" className="w-72 bg-zinc-950 border-orange-500/40 p-0 overflow-hidden">
            <div className="bg-zinc-900/80 border-b border-orange-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">{status.name}</h4>
                <span className="text-xs font-mono text-orange-400 font-bold">{statusPercentage}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300" style={{ width: `${statusPercentage}%` }} />
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
              {status.features.map((feature, idx) => (
                <div key={idx} className={`flex items-start gap-2 text-xs ${getStatusBgColor(feature.status)} p-2 rounded`}>
                  <div className="font-semibold text-white">{feature.name}</div>
                </div>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
