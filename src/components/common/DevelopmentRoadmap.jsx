import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Target, Zap, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import RoadmapNotificationHandler from '@/components/roadmap/RoadmapNotificationHandler';

export default function DevelopmentRoadmap() {
  const [expanded, setExpanded] = useState(true);
  
  const featureDescriptions = {
    'Infrastructure & Database': 'Core backend systems, database schema, and persistence layer for all Nexus data',
    'Authentication & Access Control': 'Secure login, access tokens, permission management, and role-based entry gates',
    'Voice Net Architecture': 'LiveKit integration, voice session management, real-time audio streams, and network routing',
    'Text Comms & Messaging': 'Channel system, message persistence, read states, and real-time comms updates',
    'Performance Optimization': 'Latency reduction, caching strategies, and network efficiency improvements',
    'Complete Onboarding Flow': 'Interactive onboarding sequence, tutorial walkthrough, and access code redemption',
    'Member Profiles & Identity': 'Callsign customization, bio fields, avatar support, and personal identity settings',
    'Role-based Access Control': 'Granular permission system, rank hierarchy, and feature access gating',
    'Rank & Membership System': 'Rank progression, membership tiers, and privilege escalation mechanics',
    'User Directory & Discovery': 'Member search, availability status, and social discovery features',
    'Event Management & Planning': 'Create/schedule operations, briefing templates, and event lifecycle management',
    'Tactical Operations Console': 'Real-time op monitoring, participant tracking, and mission control interface',
    'Squad Formation & Assignment': 'Squad creation, roster management, and dynamic team assignment for ops',
    'Objective Tracking': 'Mission objectives, sub-task management, and completion status tracking',
    'Operation Reports & AAR': 'After-action reports, op summaries, and historical operation data',
    'Voice Analytics & Metrics': 'Voice quality metrics, transmission statistics, and comms health indicators',
    'Comms Intelligence Dashboard': 'Communication patterns, sentiment analysis, and activity intelligence',
    'Performance Analysis Tools': 'Latency analysis, throughput metrics, and system performance visualization',
    'Historical Data & Reporting': 'Long-term data storage, trend analysis, and detailed historical reports',
    'Production Hardening': 'Security audits, load testing, and production-readiness optimization',
    'Full Documentation': 'API docs, user guides, admin manuals, and comprehensive feature documentation',
    'Public Release & Onboarding': 'Production deployment, public accessibility, and launch preparation',
    'Community Support Launch': 'Support infrastructure, community resources, and user assistance programs',
  };

  const phaseDescriptions = {
    'Phase 1': 'Building the foundation: database, auth, voice infrastructure, and core messaging systems',
    'Phase 2': 'User experience refinement: onboarding, profiles, access control, and membership systems',
    'Phase 3': 'Operational capabilities: event management, tactical console, squads, and mission tracking',
    'Phase 4': 'Intelligence layer: analytics dashboards, performance metrics, and historical insights',
    'Release': 'Final production release: hardening, documentation, and full launch sequence',
  };

  const milestones = [
    {
      phase: 'Phase 1',
      title: 'Foundation & Core Systems',
      version: '0.5.0',
      status: 'in-progress',
      completion: 85,
      features: [
        { name: 'Infrastructure & Database', status: 'complete' },
        { name: 'Authentication & Access Control', status: 'complete' },
        { name: 'Voice Net Architecture', status: 'complete' },
        { name: 'Text Comms & Messaging', status: 'complete' },
        { name: 'Performance Optimization', status: 'in-progress' },
      ],
    },
    {
      phase: 'Phase 2',
      title: 'User Experience & Onboarding',
      version: '0.7.0',
      status: 'in-progress',
      completion: 60,
      features: [
        { name: 'Complete Onboarding Flow', status: 'in-progress' },
        { name: 'Member Profiles & Identity', status: 'in-progress' },
        { name: 'Role-based Access Control', status: 'in-progress' },
        { name: 'Rank & Membership System', status: 'planned' },
        { name: 'User Directory & Discovery', status: 'planned' },
      ],
    },
    {
      phase: 'Phase 3',
      title: 'Operations & Events',
      version: '0.8.0',
      status: 'planned',
      completion: 35,
      features: [
        { name: 'Event Management & Planning', status: 'planned' },
        { name: 'Tactical Operations Console', status: 'planned' },
        { name: 'Squad Formation & Assignment', status: 'planned' },
        { name: 'Objective Tracking', status: 'planned' },
        { name: 'Operation Reports & AAR', status: 'planned' },
      ],
    },
    {
      phase: 'Phase 4',
      title: 'Analytics & Intelligence',
      version: '0.9.0',
      status: 'planned',
      completion: 10,
      features: [
        { name: 'Voice Analytics & Metrics', status: 'planned' },
        { name: 'Comms Intelligence Dashboard', status: 'planned' },
        { name: 'Performance Analysis Tools', status: 'planned' },
        { name: 'Historical Data & Reporting', status: 'planned' },
      ],
    },
    {
      phase: 'Release',
      title: 'Nomad Nexus 1.0',
      version: '1.0.0',
      status: 'planned',
      completion: 0,
      features: [
        { name: 'Production Hardening', status: 'planned' },
        { name: 'Full Documentation', status: 'planned' },
        { name: 'Public Release & Onboarding', status: 'planned' },
        { name: 'Community Support Launch', status: 'planned' },
      ],
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case 'in-progress':
        return <Clock className="w-3 h-3 text-yellow-400" />;
      case 'planned':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'text-green-300';
      case 'in-progress':
        return 'text-yellow-300';
      case 'planned':
        return 'text-red-300';
      default:
        return 'text-zinc-500';
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-orange-500/10 to-transparent border border-zinc-800/60 rounded hover:border-orange-500/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500">Nomad Nexus 1.0 Roadmap</h2>
          <div className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded">38%</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const statusIcon = milestone.status === 'complete' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> :
                               milestone.status === 'in-progress' ? <Zap className="w-3 h-3 text-yellow-400" /> :
                               <Target className="w-3 h-3 text-red-400" />;

            return (
              <TooltipProvider key={milestone.phase}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className="border border-zinc-800/60 rounded bg-zinc-900/30 overflow-hidden cursor-help">
                      {/* Compact Header */}
                      <div className="px-3 py-2 border-b border-zinc-800/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {statusIcon}
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{milestone.phase}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0 bg-zinc-800/50 text-zinc-400 rounded">v{milestone.version}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                milestone.completion === 100 ? 'bg-green-500' :
                                milestone.completion >= 60 ? 'bg-yellow-500' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${milestone.completion}%` }}
                            />
                          </div>
                          <span className={`text-[9px] font-mono font-bold w-6 text-right ${milestone.completion === 100 ? 'text-green-400' : milestone.completion >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {milestone.completion}%
                          </span>
                        </div>
                      </div>

                      {/* Compact Features List */}
                      <div className="flex flex-wrap gap-1 px-2 py-1.5">
                        {milestone.features.map((feature) => (
                          <TooltipProvider key={feature.name}>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors border cursor-help ${
                                    feature.status === 'complete'
                                      ? 'bg-green-500/15 border-green-500/40 text-green-300'
                                      : feature.status === 'in-progress'
                                      ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300'
                                      : 'bg-red-500/15 border-red-500/40 text-red-300'
                                  }`}
                                >
                                  {getStatusIcon(feature.status)}
                                  <span className="whitespace-nowrap">{feature.name}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-zinc-950 border-orange-500/40 max-w-xs">
                                <p className="text-xs text-zinc-200">{featureDescriptions[feature.name] || feature.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-950 border-yellow-500/40 max-w-sm">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-orange-400">{milestone.title}</p>
                      <p className="text-xs text-zinc-200">{phaseDescriptions[milestone.phase]}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded px-2.5 py-1.5 text-[9px]">
            <div className="font-semibold text-blue-300">Focus: Core comms → Events → Analytics → 1.0</div>
          </div>
        </div>
      )}
    </div>
  );
}