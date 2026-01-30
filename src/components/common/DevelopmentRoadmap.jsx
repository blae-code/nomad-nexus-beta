import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Target, Zap, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DevelopmentRoadmap() {
  const [expanded, setExpanded] = useState(true);
  
  // Group modules by completion status
  const MODULE_STATUS = {
    MissionControl: { name: 'Mission Control', completed: 60 },
    CommsConsole: { name: 'Comms Array', completed: 70 },
    Settings: { name: 'System Admin', completed: 75 },
    AccessGate: { name: 'Access Gate', completed: 100 },
    Hub: { name: 'Command Hub', completed: 65 },
    NomadRegistry: { name: 'Nomad Registry', completed: 30 },
    FleetCommand: { name: 'Fleet Command', completed: 25 },
    DataVault: { name: 'Data Vault', completed: 25 },
    QAConsole: { name: 'QA Console', completed: 100 },
    FrontierOps: { name: 'Frontier Ops', completed: 25 },
    TradeNexus: { name: 'Trade Nexus', completed: 20 },
    WarAcademy: { name: 'War Academy', completed: 18 },
    IntelNexus: { name: 'Intel Nexus', completed: 12 },
    HighCommand: { name: 'High Command', completed: 10 },
    NexusTraining: { name: 'Nexus Training', completed: 10 },
  };

  const moduleGroups = {
    complete: Object.entries(MODULE_STATUS)
      .filter(([_, data]) => data.completed === 100)
      .map(([key, data]) => ({ key, ...data })),
    active: Object.entries(MODULE_STATUS)
      .filter(([_, data]) => data.completed >= 40 && data.completed < 100)
      .sort((a, b) => b[1].completed - a[1].completed)
      .map(([key, data]) => ({ key, ...data })),
    planned: Object.entries(MODULE_STATUS)
      .filter(([_, data]) => data.completed < 40)
      .sort((a, b) => b[1].completed - a[1].completed)
      .map(([key, data]) => ({ key, ...data })),
  };

  const overallCompletion = Math.round(
    Object.values(MODULE_STATUS).reduce((sum, mod) => sum + mod.completed, 0) /
      Object.keys(MODULE_STATUS).length
  );

  return (
    <>
      <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-orange-500/10 to-transparent border border-zinc-800/60 rounded hover:border-orange-500/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-500">Module Development Status</h2>
          <div className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800/50 text-zinc-400 rounded">{overallCompletion}%</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Complete Modules */}
          {moduleGroups.complete.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-green-400">Production Ready</h3>
                <div className="flex-1 h-px bg-green-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {moduleGroups.complete.map((module) => (
                  <div
                    key={module.key}
                    className="px-2.5 py-1.5 bg-green-500/10 border border-green-500/30 rounded flex items-center justify-between"
                  >
                    <span className="text-[10px] font-semibold text-green-300">{module.name}</span>
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Development */}
          {moduleGroups.active.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Active Development</h3>
                <div className="flex-1 h-px bg-yellow-500/20" />
              </div>
              <div className="space-y-1.5">
                {moduleGroups.active.map((module) => {
            return (
              <div key={module.key} className="border border-zinc-800/60 rounded bg-zinc-900/30 overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] font-semibold text-white">{module.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${module.completed}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-yellow-400 w-7 text-right">
                      {module.completed}%
                    </span>
                  </div>
                </div>
              </div>
            );
            })}
            </div>
            </div>
            )}

            {/* Planned Modules */}
            {moduleGroups.planned.length > 0 && (
            <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-2">
            <Target className="w-3.5 h-3.5 text-red-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400">Planning Phase</h3>
            <div className="flex-1 h-px bg-red-500/20" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
            {moduleGroups.planned.map((module) => (
            <div
              key={module.key}
              className="px-2 py-1.5 bg-zinc-800/30 border border-zinc-700/50 rounded text-center"
            >
              <div className="text-[9px] font-semibold text-zinc-400">{module.name}</div>
              <div className="text-[8px] font-mono text-red-400 mt-0.5">{module.completed}%</div>
            </div>
            ))}
            </div>
            </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded px-2.5 py-1.5 text-[9px]">
            <div className="font-semibold text-blue-300 mb-1">Phase 5: UX/Immersion Enhancement</div>
            <div className="text-blue-400 text-[8px]">Adding utility features, audio feedback, progression systems, and tactical polish across all modules</div>
            </div>
        </div>
      )}
      </div>
      </>
      );
      }