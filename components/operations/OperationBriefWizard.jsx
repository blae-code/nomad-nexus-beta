import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BriefBasicsStep from '@/components/operations/briefSteps/BriefBasicsStep';
import BriefObjectivesStep from '@/components/operations/briefSteps/BriefObjectivesStep';
import BriefSquadsStep from '@/components/operations/briefSteps/BriefSquadsStep';
import BriefCommsStep from '@/components/operations/briefSteps/BriefCommsStep';
import BriefMarkersStep from '@/components/operations/briefSteps/BriefMarkersStep';
import BriefReviewStep from '@/components/operations/briefSteps/BriefReviewStep';

const WIZARD_STEPS = [
  { id: 'basics', label: 'Basics', component: BriefBasicsStep },
  { id: 'objectives', label: 'Objectives', component: BriefObjectivesStep },
  { id: 'squads', label: 'Squads/Assignments', component: BriefSquadsStep },
  { id: 'comms', label: 'Comms Plan', component: BriefCommsStep },
  { id: 'markers', label: 'Tactical Markers', component: BriefMarkersStep },
  { id: 'review', label: 'Review & Score', component: BriefReviewStep }
];

export default function OperationBriefWizard({ eventId, onComplete }) {
  const [activeStep, setActiveStep] = useState('basics');
  const [briefData, setBriefData] = useState({
    objectives: [],
    squads_assignments: [],
    comms_plan: { primary_net: '', secondary_nets: [], doctrine: 'casual' },
    tactical_markers: [],
    safety_roe_acknowledged: false,
    readiness_score: 0
  });
  const [user, setUser] = useState(null);

  // Auth check
  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['brief-event', eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }),
    enabled: !!eventId
  });

  // Create OpsSession mutation
  const createSessionMutation = useMutation({
    mutationFn: async (briefArtifact) => {
      return base44.entities.OpsSession.create({
        event_id: eventId,
        status: 'PLANNED',
        brief_artifact: briefArtifact,
        operation_log: []
      });
    }
  });

  const handleStepChange = (stepId, data) => {
    setBriefData(prev => ({ ...prev, ...data }));
  };

  const handleComplete = async () => {
    if (briefData.readiness_score < (briefData.comms_plan.doctrine === 'focused' ? 70 : 50)) {
      return; // Validation in UI
    }
    try {
      await createSessionMutation.mutateAsync(briefData);
      onComplete?.(eventId);
    } catch (err) {
      console.error('Failed to create op session:', err);
    }
  };

  const isScoutOrHigher = user?.role === 'admin' || user?.rank >= 3; // Scout+ rank check
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === activeStep);
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-zinc-500">
        <p className="text-sm font-mono">LOADING BRIEF...</p>
      </div>
    );
  }

  if (!isScoutOrHigher) {
    return (
      <div className="p-4 border border-red-800 bg-red-950/20 rounded">
        <div className="flex gap-2 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Scout+ rank required to create operations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Readiness Score Indicator */}
      <div className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase text-zinc-400">READINESS SCORE</span>
          <span className="text-lg font-bold text-[#ea580c]">{briefData.readiness_score}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-none overflow-hidden">
          <div
            className="h-full bg-[#ea580c] transition-all"
            style={{ width: `${briefData.readiness_score}%` }}
          />
        </div>
        <p className="text-[8px] text-zinc-500">
          {briefData.comms_plan.doctrine === 'focused'
            ? 'Focused ops require 70+ readiness'
            : 'Casual ops require 50+ readiness'}
        </p>
      </div>

      {/* Step Tabs */}
      <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
        <TabsList className="grid grid-cols-6 w-full gap-1 bg-transparent border-b border-zinc-800">
          {WIZARD_STEPS.map((step, idx) => {
            const isComplete = idx < currentStepIndex;
            const isCurrent = step.id === activeStep;
            return (
              <TabsTrigger
                key={step.id}
                value={step.id}
                className={cn(
                  'text-[8px] h-8 px-2 data-[state=active]:border-b-2 data-[state=active]:border-[#ea580c] border-b-2 border-transparent',
                  'flex items-center gap-1',
                  isComplete && 'text-emerald-500'
                )}
              >
                {isComplete && <CheckCircle2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{step.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Step Content */}
        {WIZARD_STEPS.map(step => {
          const StepComponent = step.component;
          return (
            <TabsContent key={step.id} value={step.id} className="mt-4">
              <StepComponent
                briefData={briefData}
                eventData={event?.[0]}
                onChange={(data) => handleStepChange(step.id, data)}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => {
            const prevIdx = Math.max(0, currentStepIndex - 1);
            setActiveStep(WIZARD_STEPS[prevIdx].id);
          }}
          disabled={currentStepIndex === 0}
          className="text-xs h-8"
        >
          ← PREV
        </Button>

        {isLastStep && (
          <Button
            onClick={handleComplete}
            disabled={
              createSessionMutation.isPending ||
              (briefData.comms_plan.doctrine === 'focused' && briefData.readiness_score < 70) ||
              (briefData.comms_plan.doctrine === 'casual' && briefData.readiness_score < 50)
            }
            className="bg-emerald-700 hover:bg-emerald-600 text-xs h-8"
          >
            {createSessionMutation.isPending ? 'CREATING...' : 'LAUNCH OPERATION'}
          </Button>
        )}

        {!isLastStep && (
          <Button
            onClick={() => {
              const nextIdx = Math.min(WIZARD_STEPS.length - 1, currentStepIndex + 1);
              setActiveStep(WIZARD_STEPS[nextIdx].id);
            }}
            className="bg-[#ea580c] hover:bg-[#ea580c]/80 text-xs h-8"
          >
            NEXT →
          </Button>
        )}
      </div>
    </div>
  );
}