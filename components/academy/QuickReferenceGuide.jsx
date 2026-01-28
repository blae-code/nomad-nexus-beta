import { Zap, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function QuickReferenceGuide() {
  const opsChecklists = [
    {
      title: 'Pre-Operation Checklist',
      items: [
        '✓ Objectives clearly defined',
        '✓ Squads assigned with confirmed roles',
        '✓ Comms plan established & tested',
        '✓ Tactical map markers set',
        '✓ All participants briefed & ready',
        '✓ Plan locked (no mid-op changes)'
      ]
    },
    {
      title: 'During Operation',
      items: [
        '✓ Monitor player status updates',
        '✓ Confirm all nets are active',
        '✓ Track objective progress',
        '✓ Respond to incidents immediately',
        '✓ Keep comms clear & disciplined',
        '✓ Document timeline events'
      ]
    },
    {
      title: 'Post-Operation',
      items: [
        '✓ Close operation officially',
        '✓ Collect player feedback',
        '✓ Review incident reports',
        '✓ Compile After-Action Report (AAR)',
        '✓ Archive operation for history',
        '✓ Plan follow-ups or next steps'
      ]
    }
  ];

  const commsTerms = [
    { term: 'Net', def: 'A voice channel for communication' },
    { term: 'Primary Net', def: 'Command frequency for leaders' },
    { term: 'Squad Net', def: 'Dedicated channel for one squad' },
    { term: 'PTT', def: 'Push-to-Talk (hold key to speak)' },
    { term: 'Roger', def: 'Acknowledge receipt of message' },
    { term: 'Wilco', def: 'Will comply with order' },
    { term: 'Sitrep', def: 'Situation report (status update)' },
    { term: 'Callsign', def: 'Unique identifier (e.g., "Pilot Lead")' },
    { term: 'Whisper', def: 'Private message to one person' },
    { term: 'Bridge', def: 'Temporarily connect two nets' }
  ];

  const keyboardShortcuts = [
    { key: 'V', action: 'Push-to-Talk (hold to speak)' },
    { key: 'Ctrl+Shift+C', action: 'Open Comms Console' },
    { key: 'Ctrl+Shift+E', action: 'Open Events/Operations' },
    { key: 'Ctrl+\\', action: 'Mute/Unmute microphone' },
    { key: 'Esc', action: 'Cancel current action' }
  ];

  const roleGuide = [
    {
      role: 'Commander',
      duties: ['Set mission objectives', 'Brief squads', 'Monitor overall progress', 'Make strategic decisions', 'Conduct debrief']
    },
    {
      role: 'Squad Lead',
      duties: ['Manage squad members', 'Execute squad objectives', 'Report status to command', 'Handle tactical decisions', 'Support team morale']
    },
    {
      role: 'Operator',
      duties: ['Complete assigned tasks', 'Follow squad lead direction', 'Maintain comms discipline', 'Report personal status', 'Support squad goals']
    },
    {
      role: 'Support',
      duties: ['Provide specialty function', 'Monitor team health/readiness', 'Deliver intel or logistics', 'Respond to requests', 'Document notes']
    }
  ];

  return (
    <div className="p-6">
      <Tabs defaultValue="ops" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="ops" className="text-xs">Ops Checklists</TabsTrigger>
          <TabsTrigger value="comms" className="text-xs">Comms Terms</TabsTrigger>
          <TabsTrigger value="keys" className="text-xs">Shortcuts</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
        </TabsList>

        {/* Operations Checklists */}
        <TabsContent value="ops" className="space-y-3 mt-4">
          {opsChecklists.map((checklist, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
                <h4 className="font-semibold text-sm text-zinc-100">{checklist.title}</h4>
              </div>
              <ul className="space-y-1">
                {checklist.items.map((item, i) => (
                  <li key={i} className="text-xs text-zinc-400 font-mono">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        {/* Comms Terms */}
        <TabsContent value="comms" className="space-y-2 mt-4">
          {commsTerms.map((item, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-3 rounded">
              <div className="flex gap-3">
                <div className="flex items-center justify-center min-w-12 h-8 bg-orange-900/40 border border-orange-600 rounded">
                  <span className="text-xs font-bold text-orange-300">{item.term}</span>
                </div>
                <div className="flex-1 flex items-center">
                  <p className="text-xs text-zinc-400">{item.def}</p>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Keyboard Shortcuts */}
        <TabsContent value="keys" className="space-y-2 mt-4">
          {keyboardShortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 p-3 rounded">
              <div className="flex items-center justify-center min-w-16 h-8 bg-blue-900/40 border border-blue-600 rounded font-mono">
                <span className="text-xs font-bold text-blue-300">{shortcut.key}</span>
              </div>
              <p className="text-xs text-zinc-400 flex-1">{shortcut.action}</p>
            </div>
          ))}
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles" className="space-y-3 mt-4">
          {roleGuide.map((item, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <h4 className="font-semibold text-sm text-zinc-100">{item.role}</h4>
              </div>
              <ul className="space-y-1 ml-6">
                {item.duties.map((duty, i) => (
                  <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="text-green-400 shrink-0">•</span>
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}