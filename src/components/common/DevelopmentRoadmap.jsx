import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Clock, Target, Zap, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MODULE_STATUS } from '@/components/constants/moduleStatus';

export default function DevelopmentRoadmap() {
  const [expanded, setExpanded] = useState(true);
  
  // Calculate completion percentages dynamically based on features
  const calculateCompletion = useMemo(() => {
    return Object.entries(MODULE_STATUS).reduce((acc, [key, module]) => {
      const totalFeatures = module.features.length;
      const completedFeatures = module.features.filter(f => f.status === 'complete').length;
      const inProgressFeatures = module.features.filter(f => f.status === 'in-progress').length;
      
      // Formula: completed features + 0.5 * in-progress features
      const completion = totalFeatures > 0 
        ? Math.round(((completedFeatures + inProgressFeatures * 0.5) / totalFeatures) * 100)
        : module.completed || 0;
      
      acc[key] = { ...module, calculated: completion };
      return acc;
    }, {});
  }, []);

  const moduleGroups = useMemo(() => ({
    complete: Object.entries(calculateCompletion)
      .filter(([_, data]) => data.calculated === 100)
      .map(([key, data]) => ({ key, ...data, completed: data.calculated })),
    active: Object.entries(calculateCompletion)
      .filter(([_, data]) => data.calculated >= 40 && data.calculated < 100)
      .sort((a, b) => b[1].calculated - a[1].calculated)
      .map(([key, data]) => ({ key, ...data, completed: data.calculated })),
    planned: Object.entries(calculateCompletion)
      .filter(([_, data]) => data.calculated < 40)
      .sort((a, b) => b[1].calculated - a[1].calculated)
      .map(([key, data]) => ({ key, ...data, completed: data.calculated })),
  }), [calculateCompletion]);

  const overallCompletion = useMemo(() => 
    Math.round(
      Object.values(calculateCompletion).reduce((sum, mod) => sum + mod.calculated, 0) /
        Object.keys(calculateCompletion).length
    ),
    [calculateCompletion]
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

            <div className="bg-green-500/10 border border-green-500/30 rounded px-2.5 py-1.5 text-[9px]">
            <div className="font-semibold text-green-300 mb-1">Phase 10: Comms Array Stabilization ✓</div>
            <div className="text-green-400 text-[8px]">Comms Array now ~92% complete with desktop notifications, DND, drafts, emoji picker, export history, and manual link previews</div>
            </div>
        </div>
      )}
      </div>
      </>
      );
      }
