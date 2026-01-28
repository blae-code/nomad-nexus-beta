import { useState } from 'react';
import { ChevronRight, Check, Lightbulb, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InteractiveCommsWalkthrough() {
  const [activeStep, setActiveStep] = useState(0);

  const walkthrough = [
    {
      title: 'Getting Connected to a Voice Net',
      steps: [
        { action: 'Open Comms Console', tip: 'Access from main nav or command palette' },
        { action: 'Select an operation', tip: 'Pick an active operation from the left panel' },
        { action: 'View available nets', tip: 'See all voice nets provisioned for that operation' },
        { action: 'Join a net', tip: 'Click "Join Net"—browser will request microphone permission' },
        { action: 'Check audio levels', tip: 'Ensure input/output levels are visible and healthy' },
        { action: 'Say your name & role', tip: 'Example: "Pilot joining Command Net"' }
      ]
    },
    {
      title: 'Comms Discipline & Protocol',
      steps: [
        { action: 'Understand net hierarchy', tip: 'Command Net = Leaders. Squad Nets = Team coordination. Tactical Nets = Specialized groups' },
        { action: 'Respect floor control', tip: 'One person talks at a time—wait for acknowledgment' },
        { action: 'Use standard callsigns', tip: 'Example: "Command, this is Osprey Lead with a sitrep"' },
        { action: 'Keep transmissions brief', tip: 'Say only what\'s necessary—avoid long-winded speeches' },
        { action: 'Acknowledge orders', tip: 'Respond with "Roger" or "Wilco" to confirm understanding' },
        { action: 'Report status changes', tip: 'Notify team immediately of position, status, or incident' }
      ]
    },
    {
      title: 'Advanced Comms Techniques',
      steps: [
        { action: 'Use whisper for private comms', tip: 'Send discreet messages to specific team members' },
        { action: 'Bridge nets when needed', tip: 'Connect two nets temporarily for critical coordination' },
        { action: 'Monitor background activity', tip: 'Listen to secondary nets without transmitting' },
        { action: 'Escalate urgent reports', tip: 'Use incident system for emergencies requiring immediate attention' },
        { action: 'Log important comms', tip: 'Chat history archived for post-op debrief' },
        { action: 'Adapt to jamming', tip: 'Fall back to secondary nets if primary is compromised' }
      ]
    }
  ];

  const scenario = walkthrough[activeStep];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-orange-900/50 bg-orange-950/30 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Volume2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Comms Walkthrough</h3>
            <p className="text-xs text-zinc-400 mt-1">Learn voice net fundamentals, discipline, and advanced techniques for seamless coordination.</p>
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
                ? 'bg-orange-900/40 border-orange-600 text-orange-100'
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
              <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-900/50 border border-orange-600 shrink-0">
                <span className="text-xs font-bold text-orange-300">{idx + 1}</span>
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