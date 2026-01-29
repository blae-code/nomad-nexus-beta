import React from 'react';
import { CheckCircle2, Zap, Radio, AlertCircle, Clock } from 'lucide-react';

export default function DevelopmentRoadmap() {
  const features = [
    {
      priority: 1,
      category: 'App Stability',
      items: [
        { name: 'Core Infrastructure', status: 'complete', icon: CheckCircle2 },
        { name: 'Database Layer', status: 'complete', icon: CheckCircle2 },
        { name: 'Error Handling & Recovery', status: 'complete', icon: CheckCircle2 },
        { name: 'Performance Optimization', status: 'in-progress', icon: Clock },
      ],
    },
    {
      priority: 2,
      category: 'User Onboarding & Registration',
      items: [
        { name: 'Access Code System', status: 'complete', icon: CheckCircle2 },
        { name: 'Member Profiles', status: 'complete', icon: CheckCircle2 },
        { name: 'Onboarding Flow', status: 'in-progress', icon: Clock },
        { name: 'Role & Rank Assignment', status: 'in-progress', icon: Clock },
      ],
    },
    {
      priority: 3,
      category: 'Comprehensive Voice Comms',
      items: [
        { name: 'Voice Net Architecture', status: 'complete', icon: CheckCircle2 },
        { name: 'Real-time Audio Streaming', status: 'in-progress', icon: Clock },
        { name: 'PTT & Comms Discipline', status: 'in-progress', icon: Clock },
        { name: 'Advanced Voice Analytics', status: 'planned', icon: AlertCircle },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black uppercase tracking-widest text-orange-500 mb-2">
          Development Roadmap
        </h2>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Priority-focused feature development</p>
      </div>

      <div className="space-y-4">
        {features.map((section) => (
          <div key={section.priority} className="border border-zinc-800/60 rounded bg-zinc-900/30 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 px-4 py-3 border-b border-zinc-800/40">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 bg-orange-500/30 text-orange-400 rounded">
                  P{section.priority}
                </span>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">{section.category}</h3>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {section.items.map((item) => {
                const statusConfig = {
                  complete: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Complete' },
                  'in-progress': { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'In Progress' },
                  planned: { color: 'text-zinc-500', bg: 'bg-zinc-800/30', label: 'Planned' },
                };

                const config = statusConfig[item.status];
                const Icon = item.icon;

                return (
                  <div key={item.name} className={`${config.bg} border border-zinc-700/40 rounded p-3 flex items-start gap-3`}>
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{item.name}</div>
                      <div className={`text-[10px] ${config.color} mt-1 uppercase tracking-wider`}>
                        {config.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-xs text-blue-300">
        <div className="flex gap-2">
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">Focus Areas</div>
            <div className="text-zinc-400">We're building a professional voice comms platform that transcends Discord/Guilded limitations with tactical discipline, advanced analytics, and operational depth.</div>
          </div>
        </div>
      </div>
    </div>
  );
}