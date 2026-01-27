import { useState } from 'react';
import { ChevronRight, Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InteractiveOpsWalkthrough() {
  const [activeStep, setActiveStep] = useState(0);

  const walkthrough = [
    {
      title: 'Creating Your First Operation',
      steps: [
        { action: 'Navigate to Events/Operations', tip: 'Look for the "New Operation" button in the top bar' },
        { action: 'Enter operation name & location', tip: 'e.g., "Rescue at Port Olisar"' },
        { action: 'Set mission objectives', tip: 'Be specific: "Locate missing pilot", "Extract to safety"' },
        { action: 'Assign squads and roles', tip: 'Balance roles—Pilot, Gunner, Medic, Support' },
        { action: 'Configure comms plan', tip: 'Primary Net for Command, dedicated nets per squad' },
        { action: 'Lock plan & brief team', tip: 'Once locked, briefing cannot be modified mid-op' }
      ]
    },
    {
      title: 'Managing Operation Timeline',
      steps: [
        { action: 'Review operation phases', tip: 'Planning → Briefing → Active → Debrief → Archive' },
        { action: 'Mark key milestones', tip: 'e.g., "Team assembled", "Quantum jump complete", "Extraction initiated"' },
        { action: 'Monitor elapsed time', tip: 'Comms console shows real-time operation duration' },
        { action: 'Update team status', tip: 'Player status updates visible to all squad leaders' },
        { action: 'Escalate incidents', tip: 'Report emergencies to command for real-time response' },
        { action: 'Close operation & AAR', tip: 'After-Action Report captures lessons learned' }
      ]
    },
    {
      title: 'Command & Control',
      steps: [
        { action: 'Establish hierarchy', tip: 'Commander → Squad Leads → Operators' },
        { action: 'Delegate authority', tip: 'Empower squad leads to make tactical decisions' },
        { action: 'Monitor squad readiness', tip: 'Readiness meter shows prep status per squad' },
        { action: 'Issue tactical commands', tip: 'Use command net for critical directives only' },
        { action: 'Adjust on the fly', tip: 'Operations adapt—communicate changes immediately' },
        { action: 'Debrief & document', tip: 'Record decisions & outcomes for future reference' }
      ]
    }
  ];

  const scenario = walkthrough[activeStep];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-purple-900/50 bg-purple-950/30 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Interactive Walkthrough</h3>
            <p className="text-xs text-zinc-400 mt-1">Step-by-step guide to mastering operations from creation to execution.</p>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="space-y-2">
        {walkthrough.map((scenario, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStep(idx)}
            className={`w-full text-left p-3 rounded border transition-all ${
              activeStep === idx
                ? 'bg-purple-900/40 border-purple-600 text-purple-100'
                : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {activeStep === idx && <Check className="w-4 h-4" />}
              <span className="text-sm font-semibold">{scenario.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-3">
        {scenario.steps.map((step, idx) => (
          <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-3 rounded space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-900/50 border border-purple-600 shrink-0">
                <span className="text-xs font-bold text-purple-300">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100">{step.action}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 ml-9">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-400">{step.tip}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          variant="outline"
          className="flex-1"
        >
          Previous
        </Button>
        <Button
          onClick={() => setActiveStep(Math.min(walkthrough.length - 1, activeStep + 1))}
          disabled={activeStep === walkthrough.length - 1}
          className="flex-1 gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}