import React from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PHASES = [
  { value: 'PLANNING', label: 'PLANNING', description: 'Setup & preparation' },
  { value: 'BRIEFING', label: 'BRIEFING', description: 'Pre-op briefing' },
  { value: 'ACTIVE', label: 'ACTIVE', description: 'Operation underway' },
  { value: 'DEBRIEF', label: 'DEBRIEF', description: 'Post-op debrief' },
  { value: 'ARCHIVED', label: 'ARCHIVED', description: 'Complete' }
];

export default function EventPhaseGates({ event, canEdit }) {
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const handlePhaseTransition = async (newPhase) => {
    if (!canEdit) {
      toast.error('INSUFFICIENT PERMISSIONS');
      return;
    }

    setIsTransitioning(true);
    try {
      await base44.entities.Event.update(event.id, {
        phase: newPhase,
        phase_transitioned_at: new Date().toISOString()
      });

      // Log phase transition
      await base44.entities.EventLog.create({
        event_id: event.id,
        type: 'STATUS',
        severity: 'MEDIUM',
        summary: `PHASE TRANSITIONED TO ${newPhase}`,
        details: { from_phase: event.phase, to_phase: newPhase }
      });

      toast.success(`PHASE SET TO ${newPhase}`);
    } catch (err) {
      toast.error('PHASE TRANSITION FAILED');
    } finally {
      setIsTransitioning(false);
    }
  };

  const currentPhaseIndex = PHASES.findIndex(p => p.value === event.phase);

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle>OPERATIONAL PHASE</OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-4">
        {/* Current Phase Display */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">CURRENT PHASE</div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-[#ea580c]/10 border-[#ea580c]/50 text-[#ea580c]">
              {event.phase}
            </Badge>
          </div>
          {event.phase_transitioned_at && (
            <div className="text-[9px] text-zinc-600 font-mono">
              Transitioned {new Date(event.phase_transitioned_at).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Phase Progression Timeline */}
        <div className="space-y-2">
          {PHASES.map((phase, idx) => {
            const isActive = phase.value === event.phase;
            const isPassed = currentPhaseIndex > idx;
            const isNext = currentPhaseIndex === idx - 1;

            return (
              <button
                key={phase.value}
                onClick={() => handlePhaseTransition(phase.value)}
                disabled={!canEdit || isTransitioning}
                className={cn(
                  'w-full p-2 rounded border text-left transition-all',
                  isActive && 'border-[#ea580c] bg-[#ea580c]/10',
                  isPassed && 'border-emerald-900/50 bg-emerald-900/10',
                  !isActive && !isPassed && 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700',
                  (!canEdit || isTransitioning) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className={cn('w-3 h-3 shrink-0', isActive && 'text-[#ea580c]')} />
                  )}
                  <div className="flex-1">
                    <div className="text-xs font-bold text-zinc-300">{phase.label}</div>
                    <div className="text-[9px] text-zinc-600">{phase.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Phase-Restricted Actions Info */}
        <div className="p-2 bg-amber-900/10 border border-amber-900/30 rounded text-[9px]">
          <div className="text-amber-400 font-bold">PHASE-RESTRICTED ACTIONS:</div>
          <ul className="text-amber-300/70 mt-1 space-y-0.5 ml-2">
            <li>• Objectives: editable in PLANNING & BRIEFING only</li>
            <li>• Roster changes: PLANNING & BRIEFING preferred</li>
            <li>• Status updates: all phases</li>
          </ul>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}