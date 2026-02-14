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
      <div className="h-screen max-h-screen bg-black/98 relative flex flex-col overflow-hidden">
        {/* Tactical grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(185,28,28,0.03)_1px,transparent_1px),linear-gradient(rgba(185,28,28,0.03)_1px,transparent_1px)] bg-[length:32px_32px]" />
        
        {/* Tactical overlay */}
        {overlayEnabled && (
          <div className="pointer-events-none absolute inset-0 opacity-15">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.08),transparent_50%)]" />
            <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:40px_40px]" />
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col px-6 py-6 overflow-hidden">
          {/* Header Section - Compact for viewport containment */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-10 bg-red-500 rounded-sm" />
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">
                    Command <span className="text-red-600">Hub</span>
                  </h1>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono mt-0.5">
                    Module Status • Tactical Readiness
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={overlayEnabled ? 'default' : 'outline'} 
                onClick={() => setOverlayEnabled((prev) => !prev)}
                className="h-8 border-red-700/40 hover:border-red-500/60 text-[10px]"
              >
                <Radar className="w-3 h-3 mr-1.5" />
                Overlay
              </Button>
            </div>
            
            <div className="h-px bg-red-700/40" />
            
            {metricsLoading && (
              <div className="mt-3 p-3 bg-black/60 border border-red-700/40 rounded">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-zinc-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Loading
                  </span>
                  <span className="font-mono text-red-400 font-bold">{loadingProgress}%</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-red-700/30">
                  <div 
                    className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Modules Section */}
            <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-red-700/40 scrollbar-track-transparent">
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

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-red-700/40 scrollbar-track-transparent">
              <DevelopmentRoadmap metrics={metrics} loading={metricsLoading} />
              
              <div className="nexus-immersive-panel p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <div className="text-xs font-bold text-orange-300 uppercase tracking-[0.2em]">Recent Activity</div>
                </div>
                
                {recentActivity.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-6">
                    No recent activity in telemetry logs.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentActivity.map((entry) => (
                      <div key={entry.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-3 hover:border-red-500/30 transition-colors">
                        <div className="text-[9px] text-red-400 uppercase tracking-widest font-bold mb-1">
                          {entry.type || 'ACTIVITY'}
                        </div>
                        <div className="text-xs text-zinc-300 leading-relaxed mb-1">{entry.summary}</div>
                        <div className="text-[9px] text-zinc-600 font-mono">
                          {entry.created_date ? new Date(entry.created_date).toLocaleString() : 'Unknown time'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Footer - Compact */}
          <div className="flex-shrink-0 mt-3 px-3 py-2 bg-black/60 border-t border-red-700/40">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] uppercase tracking-wider font-mono">
              <div className="flex flex-wrap items-center gap-3 text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <span>Op:</span>
                  <span className="text-zinc-300 font-bold">{activeOp?.activeEvent?.title || 'None'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span>Net:</span>
                  <span className="text-zinc-300 font-bold">{voiceNet?.activeNetId ? 'Active' : 'None'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span>Dock:</span>
                  <span className="text-zinc-300 font-bold">{isCommsDockOpen ? 'Open' : 'Closed'}</span>
                </span>
              </div>
              <div className="text-zinc-700">
                {metrics?.lastSync ? new Date(metrics.lastSync).toLocaleTimeString() : '--:--:--'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

function SectionBlock({ title, tone, icon: Icon, onHeaderFocus, items, getLiveMeta, emptyIllustration = false }) {
  const toneClass = tone === 'complete' ? 'text-green-400 border-green-500/30' : tone === 'progress' ? 'text-orange-400 border-orange-500/30' : 'text-zinc-500 border-zinc-700/30';
  const hasItems = items.length > 0;
  return (
    <div className="space-y-4">
      <button 
        onClick={onHeaderFocus} 
        className={`flex items-center gap-3 px-4 py-2 rounded border ${toneClass} bg-zinc-900/30 hover:bg-zinc-900/50 transition-all w-full`}
        type="button"
      >
        <Icon className="w-5 h-5" />
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">{title}</h2>
      </button>
      {!hasItems ? (
        <div className="nexus-immersive-panel p-8 text-center">
          <div className="text-zinc-500 text-sm uppercase tracking-wider">
            {emptyIllustration ? 'No planned modules remain. Roadmap clear.' : 'No modules in this section.'}
          </div>
          {emptyIllustration && <div className="mt-4 text-[48px] leading-none opacity-30 text-red-600">[::]</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
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
            <a 
              href={createPageUrl(item.path)} 
              className="group relative bg-black/60 border-2 border-red-700/40 hover:border-red-500/70 p-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 via-red-600/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="relative flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-red-500/10 border-2 border-red-500/40 rounded-lg group-hover:border-red-400/60 transition-colors">
                  <Icon className="w-6 h-6 text-red-500 group-hover:text-red-400 transition-colors" />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.15em] leading-tight">
                  {item.name}
                </h3>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  {item.description}
                </p>
                {status && (
                  <div className="mt-2 pt-2 border-t border-red-700/30 w-full flex items-center justify-center gap-2">
                    <span className={`text-[11px] font-mono font-bold ${calcTone(statusPercentage)}`}>
                      {statusPercentage}%
                    </span>
                    {statusPercentage === 100 && <Check className="w-3.5 h-3.5 text-green-400" />}
                  </div>
                )}
                {liveMeta.length > 0 && (
                  <div className="mt-2 w-full space-y-1.5 text-[10px]">
                    {liveMeta.slice(0, 2).map((row, idx) => (
                      <div key={`${item.path}-live-${idx}`} className="flex items-center justify-between bg-zinc-900/40 px-2 py-1 rounded">
                        <span className="uppercase tracking-[0.15em] text-[9px] text-zinc-500 font-bold">{row.label}</span>
                        <span className="font-mono text-[10px] text-red-400 font-bold">{row.value ?? '--'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ) : (
            <div role="link" aria-disabled="true" className="group relative bg-zinc-900/40 border-2 border-zinc-800/60 p-4 rounded-lg opacity-60 cursor-not-allowed">
              <div className="relative flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-zinc-800/60 border-2 border-zinc-700 rounded-lg">
                  <Icon className="w-6 h-6 text-zinc-500" />
                </div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.15em] leading-tight">{item.name}</h3>
                <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2">{item.description}</p>
                <div className="mt-2 pt-2 border-t border-zinc-800/70 w-full flex items-center justify-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">Route Pending</span>
                </div>
              </div>
            </div>
          )}
        </TooltipTrigger>
        {status && (
          <TooltipContent side={tooltipSide} align="center" className="w-72 bg-black border-2 border-red-500/60 p-0 overflow-hidden shadow-xl shadow-red-500/20">
            <div className="bg-zinc-900/90 border-b-2 border-red-500/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-white uppercase tracking-[0.15em]">{status.name}</h4>
                <span className="text-sm font-mono text-red-400 font-bold">{statusPercentage}%</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-red-500/30">
                <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300 relative overflow-hidden" style={{ width: `${statusPercentage}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
              {status.features.map((feature, idx) => (
                <div key={idx} className={`flex items-start gap-2 text-xs ${getStatusBgColor(feature.status)} p-2.5 rounded border border-zinc-700/30`}>
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