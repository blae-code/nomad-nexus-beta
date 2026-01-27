import { Radio, Volume2, Users, Mic, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BasicCommsGuide() {
  const steps = [
    {
      title: 'Understanding Voice Nets',
      icon: Radio,
      description: 'Voice nets are communication channels where squads coordinate in real-time.',
      content: [
        '• Primary Net: Main command frequency for leaders',
        '• Squad Nets: Dedicated channels for each squad',
        '• Tactical Nets: Specialized nets for specific operations'
      ]
    },
    {
      title: 'Joining a Voice Net',
      icon: Volume2,
      description: 'Step into comms and connect with your team.',
      content: [
        '1. Navigate to Comms Console',
        '2. Select an active operation from the left panel',
        '3. Choose a voice net from the available list',
        '4. Click "Join Net" and allow microphone access',
        '5. You\'re live—use PTT (Push-to-Talk) or open mic'
      ]
    },
    {
      title: 'Push-to-Talk (PTT)',
      icon: Mic,
      description: 'Control when your voice is transmitted.',
      content: [
        '• Default PTT key: V (configurable in settings)',
        '• Hold V to speak, release to listen',
        '• Visual indicator shows when mic is active',
        '• Press once to toggle open mic (caution: all audio sent)'
      ]
    },
    {
      title: 'Hierarchy & Discipline',
      icon: Users,
      description: 'Respect comms discipline for clarity.',
      content: [
        '• Let leaders speak first on primary net',
        '• Use squad nets for routine coordination',
        '• Keep transmissions brief and clear',
        '• Acknowledge important orders with "Roger"'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">Welcome to Voice Communications</h3>
        <p className="text-xs text-zinc-400">Learn the fundamentals of real-time squad coordination in Nexus.</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-start gap-3 p-4 border-b border-zinc-800">
                <Icon className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-100">{step.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
                </div>
              </div>
              <div className="p-4 bg-zinc-950/50">
                <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                  {step.content.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#ea580c] shrink-0">→</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <Button className="w-full bg-[#ea580c] hover:bg-orange-600 text-white font-bold text-sm py-2">
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Ready to Join a Net?
      </Button>
    </div>
  );
}