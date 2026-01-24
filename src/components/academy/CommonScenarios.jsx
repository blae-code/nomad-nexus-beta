import React, { useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function CommonScenarios() {
  const scenarios = [
    {
      scenario: 'Someone is not responding on comms',
      solution: [
        '1. Check their status in the roster—are they still in the operation?',
        '2. Try their squad net first; they may have switched nets',
        '3. If critical, escalate to Command for status check',
        '4. Document in incident log if they\'ve gone AWOL',
        '5. Reassign their objectives to another squad member'
      ]
    },
    {
      scenario: 'An objective is no longer feasible mid-operation',
      solution: [
        '1. Immediately notify Command through primary net',
        '2. Explain reason for inability to complete (e.g., enemy activity, technical failure)',
        '3. Command decides: pivot to alternate objective or abort mission',
        '4. Update all squad nets with new direction',
        '5. Log the change in operation timeline for AAR'
      ]
    },
    {
      scenario: 'We need to add a new squad net quickly',
      solution: [
        '1. Command requests new net from Comms Admin',
        '2. New net is provisioned automatically in most cases',
        '3. Command announces new net on primary net',
        '4. Relevant personnel join the new net',
        '5. Comms discipline applies to all nets immediately'
      ]
    },
    {
      scenario: 'A player disconnects unexpectedly',
      solution: [
        '1. Note their last known status in the timeline',
        '2. Notify squad lead immediately',
        '3. Wait 30-60 seconds for auto-reconnect',
        '4. If no return, escalate to incident system',
        '5. Reassign their role or delay that objective'
      ]
    },
    {
      scenario: 'The operation is taking longer than planned',
      solution: [
        '1. Command reviews remaining objectives vs. time budget',
        '2. Prioritize critical objectives only',
        '3. Delegate non-essential tasks or skip them',
        '4. Communicate revised timeline to all nets',
        '5. Prepare for extended operation or pivot to extraction'
      ]
    },
    {
      scenario: 'Two squad leads have conflicting priorities',
      solution: [
        '1. Each lead briefs their situation briefly (30 seconds max)',
        '2. Command makes final decision',
        '3. Decision is announced on primary net immediately',
        '4. Both leads acknowledge ("Roger") and execute',
        '5. No further debate on comms—maintain discipline'
      ]
    },
    {
      scenario: 'Need to brief new team members mid-operation',
      solution: [
        '1. Use a dedicated briefing net or squad net (not primary)',
        '2. Squad lead provides role, objectives, and comms plan (2 min max)',
        '3. New members acknowledge their role and ask critical questions only',
        '4. They join main operation nets and report ready',
        '5. Main operation continues with minimal disruption'
      ]
    },
    {
      scenario: 'A squadmate is struggling with the mission',
      solution: [
        '1. Identify the specific issue (technical, tactical, personal)',
        '2. Squad lead may offer support or reassign task to someone else',
        '3. Use private comms (whisper) to avoid public embarrassment',
        '4. If critical performance issue, escalate to Command',
        '5. Document for post-op review and development'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="border border-yellow-900/50 bg-yellow-950/30 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Common Scenarios & Solutions</h3>
            <p className="text-xs text-zinc-400 mt-1">Real-world situations you'll encounter and how to handle them.</p>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {scenarios.map((item, idx) => (
          <AccordionItem key={idx} value={`scenario-${idx}`} className="border border-zinc-800 mb-2">
            <AccordionTrigger className="hover:no-underline hover:bg-zinc-900/30 px-4">
              <div className="flex items-start gap-3 text-left">
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-zinc-100">{item.scenario}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-2 pb-4 border-t border-zinc-800">
              <ul className="space-y-2">
                {item.solution.map((step, i) => (
                  <li key={i} className="text-xs text-zinc-400 font-mono flex items-start gap-2">
                    <span className="text-yellow-600 shrink-0">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}