import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Target, Zap, ChevronDown } from 'lucide-react';

export default function DevelopmentRoadmap() {
  const [expanded, setExpanded] = useState(false);
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
        return <Clock className="w-3 h-3 text-orange-400" />;
      case 'planned':
        return <AlertCircle className="w-3 h-3 text-zinc-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'text-green-300';
      case 'in-progress':
        return 'text-orange-300';
      case 'planned':
        return 'text-zinc-400';
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
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500">Nomad Nexus 1.0</h2>
          <div className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded">38%</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const statusIcon = milestone.status === 'complete' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> :
                              milestone.status === 'in-progress' ? <Zap className="w-3 h-3 text-orange-400" /> :
                              <Target className="w-3 h-3 text-zinc-500" />;

            return (
              <div key={milestone.phase} className="border border-zinc-800/60 rounded bg-zinc-900/30 overflow-hidden">
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
                          milestone.completion >= 60 ? 'bg-orange-500' :
                          'bg-zinc-600'
                        }`}
                        style={{ width: `${milestone.completion}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono font-bold w-6 text-right ${milestone.completion === 100 ? 'text-green-400' : milestone.completion >= 60 ? 'text-orange-400' : 'text-zinc-500'}`}>
                      {milestone.completion}%
                    </span>
                  </div>
                </div>

                {/* Compact Features List */}
                <div className="flex flex-wrap gap-1 px-2 py-1.5">
                  {milestone.features.map((feature) => (
                    <div
                      key={feature.name}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
                        feature.status === 'complete'
                          ? 'bg-green-500/15 border-green-500/40 text-green-300'
                          : feature.status === 'in-progress'
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                          : 'bg-zinc-800/30 border-zinc-700/40 text-zinc-400'
                      }`}
                    >
                      {getStatusIcon(feature.status)}
                      <span className="whitespace-nowrap">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>
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