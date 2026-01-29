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
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Development Roadmap</h2>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Priority-focused</p>
      </div>

      <div className="space-y-2">
        {features.map((section) => (
          <div key={section.priority} className="border border-zinc-800/60 rounded bg-zinc-900/30 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 px-3 py-2 border-b border-zinc-800/40 flex items-center gap-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-500/30 text-orange-400 rounded">P{section.priority}</span>
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">{section.category}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2">
              {section.items.map((item) => {
                const statusConfig = {
                  complete: { color: 'text-green-400', bg: 'bg-green-500/10', label: '✓' },
                  'in-progress': { color: 'text-orange-400', bg: 'bg-orange-500/10', label: '→' },
                  planned: { color: 'text-zinc-500', bg: 'bg-zinc-800/30', label: '◇' },
                };

                const config = statusConfig[item.status];
                const Icon = item.icon;

                return (
                  <div key={item.name} className={`${config.bg} border border-zinc-700/40 rounded p-2 flex items-start gap-2`}>
                    <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white leading-tight">{item.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-[10px] text-blue-300">
        <div className="font-semibold mb-0.5">Focus: Professional voice comms with tactical discipline & analytics</div>
      </div>
    </div>
  );
}