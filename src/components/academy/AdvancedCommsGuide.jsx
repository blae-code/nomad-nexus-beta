import React from 'react';
import { Radio, Share2, AlertTriangle, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdvancedCommsGuide() {
  const topics = [
    {
      title: 'Voice Bridges',
      icon: Share2,
      description: 'Connect two voice nets for cross-squad communication.',
      content: [
        '• Op Command ↔ Squad Net: Allows commanders to reach all squads',
        '• Squad A ↔ Squad B: Enables inter-squad coordination',
        '• Distress Escalation: Auto-bridges incident nets to command',
        '• Bridge Control: Only founders/leaders can establish bridges',
        '• Tip: Use bridges sparingly to avoid comms clutter'
      ]
    },
    {
      title: 'Net Discipline & Doctrine',
      icon: AlertTriangle,
      description: 'Advanced comms protocols for organized operations.',
      content: [
        '• Casual Doctrine: Relaxed, social nets (Off-ops)',
        '• Focused Doctrine: Strict discipline for combat ops',
        '• Net Patches: Dynamic net assignments during ops',
        '• Floor Control: Leaders grant mic access (focused ops)',
        '• Hail Queue: Request to speak when floor is controlled'
      ]
    },
    {
      title: 'Leadership Comms',
      icon: Zap,
      description: 'Command-level communication tools.',
      content: [
        '• Broadcast Commands: Send orders to all nets simultaneously',
        '• Command Hierarchy: Primary → Secondary → Tactical nets',
        '• Status Updates: Push tactical status to entire operation',
        '• Incident Escalation: Flag emergencies for instant response',
        '• Whispers: Private 1-on-1 secure comms outside nets'
      ]
    },
    {
      title: 'Operational Security',
      icon: Shield,
      description: 'Protect comms integrity during critical ops.',
      content: [
        '• Net Encryption: All voice nets are encrypted by default',
        '• Recording Management: Control voice net recording permissions',
        '• Member Restrictions: Gate access to sensitive operation nets',
        '• Audit Trail: Track who joined/left critical nets',
        '• Incident Net Lockdown: Restrict messages during emergencies'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">Advanced Comms Mastery</h3>
        <p className="text-xs text-zinc-400">Leverage hierarchical voice net architecture for complex operations.</p>
      </div>

      <div className="space-y-4">
        {topics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <div key={idx} className="border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-start gap-3 p-4 border-b border-zinc-800">
                <Icon className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-100">{topic.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{topic.description}</p>
                </div>
              </div>
              <div className="p-4 bg-zinc-950/50">
                <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                  {topic.content.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#ea580c] shrink-0">◆</span>
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
        <Radio className="w-4 h-4 mr-2" />
        Explore Voice Nets
      </Button>
    </div>
  );
}