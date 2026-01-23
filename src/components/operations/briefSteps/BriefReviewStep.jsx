import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function BriefReviewStep({ briefData, onChange }) {
  const readinessScore = useMemo(() => {
    let score = 0;
    
    // Objectives (20 pts)
    if (briefData.objectives?.length > 0) score += 20;
    
    // Squads assigned (20 pts)
    if (briefData.squads_assignments?.length > 0) score += 20;
    
    // Comms plan (20 pts)
    if (briefData.comms_plan?.primary_net) score += 20;
    
    // Tactical markers (20 pts)
    if (briefData.tactical_markers?.length >= 2) score += 20;
    
    // Safety acknowledged (20 pts)
    if (briefData.safety_roe_acknowledged) score += 20;
    
    return Math.min(score, 100);
  }, [briefData]);

  React.useEffect(() => {
    onChange({ readiness_score: readinessScore });
  }, [readinessScore, onChange]);

  const isFocused = briefData.comms_plan?.doctrine === 'focused';
  const meetsRequirement = isFocused ? readinessScore >= 70 : readinessScore >= 50;

  return (
    <div className="space-y-3 p-3">
      <div className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase text-zinc-400">READINESS SCORE</span>
          <span className={`text-lg font-bold ${meetsRequirement ? 'text-emerald-500' : 'text-amber-500'}`}>
            {readinessScore}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-none overflow-hidden">
          <div
            className={`h-full transition-all ${meetsRequirement ? 'bg-emerald-600' : 'bg-amber-600'}`}
            style={{ width: `${readinessScore}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1 text-[8px]">
        {[
          { label: 'Objectives defined', met: briefData.objectives?.length > 0 },
          { label: 'Squads assigned', met: briefData.squads_assignments?.length > 0 },
          { label: 'Primary net selected', met: !!briefData.comms_plan?.primary_net },
          { label: 'Tactical markers placed', met: briefData.tactical_markers?.length >= 2 },
          { label: 'Safety/ROE acknowledged', met: briefData.safety_roe_acknowledged }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.met ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-zinc-600 shrink-0" />
            )}
            <span className={item.met ? 'text-zinc-300' : 'text-zinc-500'}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Safety Acknowledgement */}
      <label className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800 cursor-pointer hover:bg-zinc-900/50">
        <input
          type="checkbox"
          checked={briefData.safety_roe_acknowledged || false}
          onChange={(e) => onChange({ safety_roe_acknowledged: e.target.checked })}
          className="w-3 h-3 accent-[#ea580c]"
        />
        <span className="text-[8px] text-zinc-400">I acknowledge safety protocols and ROE</span>
      </label>

      {meetsRequirement ? (
        <p className="text-[8px] text-emerald-500 text-center">✓ Operation ready to launch</p>
      ) : (
        <p className="text-[8px] text-amber-500 text-center">
          {isFocused ? '⚠ Focused ops require 70+ readiness' : '⚠ Casual ops require 50+ readiness'}
        </p>
      )}
    </div>
  );
}