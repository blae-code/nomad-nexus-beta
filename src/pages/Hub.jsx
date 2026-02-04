import React, { useEffect, useState } from 'react';
import { createPageUrl, isAdminUser } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield, Users, Calendar, Radio, Map, Box, DollarSign, Settings, FileSearch, GraduationCap, FileText, Database, Package, BarChart3, BookOpen, Store, ClipboardList, Award, UserPlus, Sparkles, Gamepad2, Monitor, Wrench, Heart, Handshake, Radio as SignalIcon, Gavel, Target, Compass, HelpCircle, Bug, CheckCircle2, Clock, AlertCircle, Zap, Users2, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MODULE_STATUS, getStatusColor, getStatusBgColor, calculateCompletion } from '@/components/constants/moduleStatus';
import { useShellUI } from '@/components/providers/ShellUIContext';

import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import DevelopmentRoadmap from '@/components/common/DevelopmentRoadmap';
import NexusLoadingOverlay from '@/components/common/NexusLoadingOverlay';
import { useAuth } from '@/components/providers/AuthProvider';
import RouteGuard from '@/components/auth/RouteGuard';

export default function Hub() {
  const { user, loading: authLoading } = useAuth();
  const { isContextPanelOpen, isCommsDockOpen } = useShellUI();
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();

  const getStatusColor = (percentage) => {
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const navItems = [
    { name: 'Mission Control', path: 'MissionControl', icon: Monitor, description: 'Operations planning, execution, and reporting' },
    { name: 'Fleet Tracking', path: 'FleetTracking', icon: Map, description: 'Real-time asset locations and status monitoring' },
    { name: 'Member Progression', path: 'MemberProgression', icon: Award, description: 'Skills, promotions, and mentorship matching' },
    { name: 'Report Builder', path: 'ReportBuilder', icon: BarChart3, description: 'Custom reports with comprehensive analytics' },
    { name: 'Intel Nexus', path: 'IntelNexus', icon: Database, description: 'Intelligence gathering and threat analysis' },
    { name: 'War Academy', path: 'WarAcademy', icon: GraduationCap, description: 'Training, simulations, and combat readiness' },
    { name: 'Fleet Command', path: 'FleetCommand', icon: Box, description: 'Asset management, engineering, and tactical map' },
    { name: 'Nomad Registry', path: 'NomadRegistry', icon: Users, description: 'Personnel, availability, and achievements' },
    { name: 'Trade Nexus', path: 'TradeNexus', icon: DollarSign, description: 'Treasury, marketplace, and commerce' },
    { name: 'Comms Array', path: 'CommsConsole', icon: Radio, description: 'Communication channels and broadcasts' },
    { name: 'High Command', path: 'HighCommand', icon: Gavel, description: 'Governance, diplomacy, and strategic council' },
    { name: 'Frontier Ops', path: 'FrontierOps', icon: Compass, description: 'Exploration, bounties, and frontier missions' },
    { name: 'Data Vault', path: 'DataVault', icon: BookOpen, description: 'Knowledge archive and analytics' },
    { name: 'Nexus Training', path: 'NexusTraining', icon: HelpCircle, description: 'Tutorials and guides for using the Nexus platform' },
    { name: 'Access Gate', path: 'AccessGate', icon: Shield, description: 'Member verification and onboarding' },
    { name: 'System Admin', path: 'Settings', icon: Settings, description: 'Configuration and administration', adminOnly: true },
    { name: 'QA Console', path: 'QAConsole', icon: Bug, description: 'Development and QA testing tools for admins', adminOnly: true },
  ];

  const isAdmin = isAdminUser(user);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  // Organize modules by completion status (dynamically calculated from features)
  const organizedItems = {
    complete: visibleNavItems.filter(item => calculateCompletion(item.path) === 100).sort((a, b) => b.path.localeCompare(a.path)),
    inProgress: visibleNavItems.filter(item => {
      const completion = calculateCompletion(item.path);
      return completion > 0 && completion < 100;
    }).sort((a, b) => calculateCompletion(b.path) - calculateCompletion(a.path)),
    planned: visibleNavItems.filter(item => calculateCompletion(item.path) === 0).sort((a, b) => a.name.localeCompare(b.name)),
  };

  return (
    <RouteGuard requiredAuth="onboarded">
      <NexusLoadingOverlay isLoading={authLoading} message="Loading command center..." />
      <div className="w-full h-full flex flex-col px-6 py-6 overflow-y-auto">
      {/* Command Center Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white">
              Development <span className="text-orange-500">Hub</span>
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Module Status & Navigation</p>
          </div>
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {activeOp?.activeEvent && (
              <div className="text-right">
                <div className="text-xs text-zinc-400">ACTIVE OP</div>
                <div className="text-xs font-semibold text-orange-400 uppercase">{activeOp.activeEvent.title}</div>
              </div>
            )}
            {voiceNet?.activeNetId && (
              <div className="text-right">
                <div className="text-xs text-zinc-400">VOICE NET</div>
                <div className="text-xs font-semibold text-orange-400 uppercase">{voiceNet.activeNetId}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column - Modules */}
        <div className="col-span-2 overflow-y-auto space-y-6 pr-2">
          {/* Complete Modules */}
          {organizedItems.complete.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h2 className="text-xs font-black text-green-400 uppercase tracking-widest">Complete ({organizedItems.complete.length})</h2>
              </div>
              <div className="grid grid-cols-4 gap-3 auto-rows-min">
                {organizedItems.complete.map((item, index) => (
                  <ModuleCard key={item.path} item={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* In-Progress Modules */}
          {organizedItems.inProgress.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <h2 className="text-xs font-black text-orange-400 uppercase tracking-widest">In Development ({organizedItems.inProgress.length})</h2>
              </div>
              <div className="grid grid-cols-4 gap-3 auto-rows-min">
                {organizedItems.inProgress.map((item, index) => (
                  <ModuleCard key={item.path} item={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Planned Modules */}
          {organizedItems.planned.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-500" />
                <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Planned ({organizedItems.planned.length})</h2>
              </div>
              <div className="grid grid-cols-4 gap-3 auto-rows-min">
                {organizedItems.planned.map((item, index) => (
                  <ModuleCard key={item.path} item={item} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Roadmap */}
        <div className="col-span-1 border-l border-zinc-800/40 pl-6 overflow-y-auto">
          <DevelopmentRoadmap />
        </div>
      </div>
    </div>
    </RouteGuard>
    );
    }

    function ModuleCard({ item, index }) {
            const Icon = item.icon;
          const status = MODULE_STATUS[item.path];
          const statusPercentage = calculateCompletion(item.path);
  const itemsPerRow = 6;
  const colPosition = index % itemsPerRow;
  const tooltipSide = colPosition >= 4 ? 'left' : 'right';

  const getStatusColor = (percentage) => {
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <a
            href={createPageUrl(item.path)}
            className="group relative bg-zinc-900/40 border border-zinc-800/60 hover:border-orange-500/60 hover:bg-zinc-800/50 p-3 transition-all duration-200 rounded overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center gap-1.5">
              <div className="p-2 bg-orange-500/10 border border-orange-500/30 group-hover:border-orange-500/50 transition-colors rounded">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider leading-tight">
                {item.name}
              </h3>
              <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">
                {item.description}
              </p>
              {status && (
                <div className="mt-1 pt-1 border-t border-zinc-700/50 w-full flex items-center justify-center gap-1">
                  <span className={`text-[10px] font-mono font-bold ${getStatusColor(statusPercentage)}`}>{statusPercentage}%</span>
                  {statusPercentage === 100 && <Check className="w-3 h-3 text-green-400" />}
                </div>
              )}
            </div>
          </a>
        </TooltipTrigger>

        {status && (
          <TooltipContent side={tooltipSide} align="center" className="w-72 bg-zinc-950 border-orange-500/40 p-0 overflow-hidden">
            <div className="bg-zinc-900/80 border-b border-orange-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">{status.name}</h4>
                <span className="text-xs font-mono text-orange-400 font-bold">{statusPercentage}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                  style={{ width: `${statusPercentage}%` }}
                />
              </div>
            </div>

            <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
              {status.features.map((feature, idx) => {
                const bgColor = getStatusBgColor(feature.status);
                const FeatureIcon = 
                  feature.status === 'complete' ? CheckCircle2 :
                  feature.status === 'in-progress' ? Clock :
                  AlertCircle;
                
                const iconColor = 
                  feature.status === 'complete' ? 'text-green-400' :
                  feature.status === 'in-progress' ? 'text-orange-400' :
                  'text-zinc-500';

                return (
                  <div key={idx} className={`flex items-start gap-2 text-xs ${bgColor} p-2 rounded`}>
                    <FeatureIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconColor}`} />
                    <div>
                      <div className="font-semibold text-white">{feature.name}</div>
                      <div className="text-zinc-400 text-[10px] capitalize mt-0.5">
                        {feature.status === 'complete' && 'Ready to use'}
                        {feature.status === 'in-progress' && 'Currently in development'}
                        {feature.status === 'planned' && 'Planned for future release'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-zinc-900/50 border-t border-orange-500/20 p-3 text-xs text-zinc-400 italic">
              💡 Hover over features to see detailed development status
            </div>
          </TooltipContent>
          )}
          </Tooltip>
          </TooltipProvider>
          );
          }
