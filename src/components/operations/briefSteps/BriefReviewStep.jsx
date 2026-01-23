import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BriefReviewStep({ briefData, onChange }) {
  const isFocused = briefData.comms_plan?.doctrine === 'focused';

  // Calculate readiness score
  const score = useMemo(() => {
    let total = 0;

    // Objectives (20 points)
    if (briefData.objectives?.length > 0) total += 20;

    // Squads (20 points)
    if (briefData.squads_assignments?.length > 0) total += 20;

    // Comms (20 points)
    if (briefData.comms_plan?.primary_net) total += 20;

    // Markers (20 points)
    if (briefData.tactical_markers?.length > 0) total += 20;

    // Safety acknowledged (10 points)
    if (briefData.safety_roe_acknowledged) total += 10;

    // Focused-specific bonuses
    if (isFocused) {
      const hasRally = briefData.tactical_markers?.some(m => m.type === 'rally');
      const hasExtraction = briefData.tactical_markers?.some(m => m.type === 'extraction');
      if (hasRally && hasExtraction) total += 10;
    }

    return Math.min(total, 100);
  }, [briefData, isFocused]);

  // Update readiness score
  React.useEffect(() => {
    onChange({ readiness_score: score });
  }, [score]);

  const checks = [
    { label: 'Objectives defined', pass: briefData.objectives?.length > 0 },
    { label: 'Squads assigned', pass: briefData.squads_assignments?.length > 0 },
    { label: 'Comms net selected', pass: !!briefData.comms_plan?.primary_net },
    { label: 'Tactical markers', pass: briefData.tactical_markers?.length > 0 },
    { label: 'Safety acknowledged', pass: briefData.safety_roe_acknowledged },
    isFocused && {
      label: 'Rally + Extraction points',
      pass: briefData.tactical_markers?.some(m => m.type === 'rally') &&
            briefData.tactical_markers?.some(m => m.type === 'extraction')
    }
  ].filter(Boolean);

  const allRequired = checks.every(c => c.pass);
  const focusedReady = isFocused ? score >= 70 : score >= 50;

  return (
    <div className="space-y-4 p-4">
      {/* Readiness Meter */}
      <div className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase text-zinc-400">READINESS SCORE</span>
          <span className="text-2xl font-bold text-[#ea580c]">{score}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-none overflow-hidden">
          <div
            className="h-full bg-[#ea580c] transition-all duration-300"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-[8px] text-zinc-500">
          {isFocused ? 'Focused: 70+ required' : 'Casual: 50+ required'} •{' '}
          {focusedReady ? '✓ Ready to launch' : '✗ Not ready yet'}
        </p>
      </div>

      {/* Checklist */}
      <div>
        <p className="text-[9px] font-bold uppercase text-zinc-400 mb-2">PRE-LAUNCH CHECKLIST</p>
        <div className="space-y-1">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 p-2 border rounded-none',
                check.pass
                  ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300'
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
              )}
            >
              {check.pass ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 shrink-0" />
              )}
              <span className="text-[9px] font-mono flex-1">{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Acknowledgement */}
      <label className="flex items-start gap-2 p-2 border border-orange-800 bg-orange-950/20 cursor-pointer">
        <input
          type="checkbox"
          checked={briefData.safety_roe_acknowledged || false}
          onChange={(e) => onChange({ safety_roe_acknowledged: e.target.checked })}
          className="w-4 h-4 mt-0.5 accent-orange-500"
        />
        <span className="text-[8px] text-orange-300">
          <p className="font-bold">I acknowledge ROE, safety protocols, and operational constraints.</p>
        </span>
      </label>

      <div className="border border-zinc-700 bg-zinc-900/30 p-3 space-y-2">
        <p className="text-[9px] font-bold text-zinc-300">BRIEF SUMMARY</p>
        <div className="space-y-1 text-[8px] text-zinc-500 font-mono">
          <p>Type: <span className="text-zinc-300 font-bold">{briefData.comms_plan?.doctrine}</span></p>
          <p>Objectives: <span className="text-zinc-300">{briefData.objectives?.length || 0}</span></p>
          <p>Squads: <span className="text-zinc-300">{briefData.squads_assignments?.length || 0}</span></p>
          <p>Markers: <span className="text-zinc-300">{briefData.tactical_markers?.length || 0}</span></p>
        </div>
      </div>

      <p className="text-[8px] text-zinc-500">
        Step 6 of 6: Review readiness and acknowledge safety protocols before launch.
      </p>
    </div>
  );
}