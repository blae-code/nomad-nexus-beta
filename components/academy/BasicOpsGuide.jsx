import { Compass, Users, Clock, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BasicOpsGuide() {
  const steps = [
    {
      title: 'What is an Operation?',
      icon: Compass,
      description: 'Operations (Ops) are organized missions with objectives, teams, and timelines.',
      content: [
        '• Each op has a commander who sets the mission',
        '• Squads are assigned with specific roles',
        '• Objectives define what needs to be accomplished',
        '• Timelines track progress during execution',
        '• Real-time comms keep everyone coordinated'
      ]
    },
    {
      title: 'Viewing & Joining Operations',
      icon: Target,
      description: 'Find and participate in active missions.',
      content: [
        '1. Go to Operations tab from the command palette',
        '2. Browse scheduled and active operations',
        '3. Check mission details: objectives, squads, location',
        '4. Click "Join Operation" to participate',
        '5. You\'ll be added to the operation\'s voice nets'
      ]
    },
    {
      title: 'Role & Assignments',
      icon: Users,
      description: 'Understand your place in the operation.',
      content: [
        '• Commander: Plans and leads the operation',
        '• Squad Lead: Manages a squad of 3-6 personnel',
        '• Operator: Executes objectives under squad lead',
        '• Support: Provides logistics, intel, or medical',
        '• Check "Roster" to see your squad and role'
      ]
    },
    {
      title: 'Operation Phases',
      icon: Clock,
      description: 'Know what stage the operation is in.',
      content: [
        '• Planning: Prep phase—no action yet',
        '• Briefing: Final checks before launch',
        '• Active: Operation is running—execute objectives',
        '• Debrief: Mission complete—gather for review',
        '• Archived: Historical record for future reference'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">Welcome to Operations</h3>
        <p className="text-xs text-zinc-400">Learn how to plan, coordinate, and execute organized missions in Nexus.</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-start gap-3 p-4 border-b border-zinc-800">
                <Icon className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-100">{step.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
                </div>
              </div>
              <div className="p-4 bg-zinc-950/50">
                <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                  {step.content.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 shrink-0">→</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-2">
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Browse Active Operations
      </Button>
    </div>
  );
}