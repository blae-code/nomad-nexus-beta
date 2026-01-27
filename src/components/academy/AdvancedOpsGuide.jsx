import { Map, BarChart3, AlertCircle, CheckSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdvancedOpsGuide() {
  const topics = [
    {
      title: 'Tactical Mapping & Markers',
      icon: Map,
      description: 'Use the map to coordinate movement and objectives.',
      content: [
        '• Rally Points: Mark where squads regroup',
        '• Objectives: Place tactical targets on the map',
        '• Extraction Points: Safe zones for retreat',
        '• Hazard Zones: Identify dangerous areas',
        '• Checkpoint: Intermediate mission milestones',
        '• Share markers with squads via tactical command broadcast'
      ]
    },
    {
      title: 'Command & Control',
      icon: BarChart3,
      description: 'Lead operations at scale with command tools.',
      content: [
        '• Operation Status Board: Real-time squad positions',
        '• Timeline Events: Track mission milestones automatically',
        '• Tactical Commands: Broadcast orders to squads',
        '• Squad Pings: Request status updates from leads',
        '• Decision Points: Call votes or confirmations',
        '• After-Action Report (AAR): Document lessons learned'
      ]
    },
    {
      title: 'Incident Management',
      icon: AlertCircle,
      description: 'Handle emergencies during operations.',
      content: [
        '• Report Incident: Log issues (medical, technical, tactical)',
        '• Assign Responders: Route to nearest available personnel',
        '• Escalation Chain: Incident → Squad Lead → Commander',
        '• Incident Nets: Auto-bridge for coordinated response',
        '• Resolution Logging: Document how issue was handled',
        '• Integration: Incidents appear on tactical map in real-time'
      ]
    },
    {
      title: 'Operation Planning & Closure',
      icon: CheckSquare,
      description: 'Prepare ops thoroughly and close them properly.',
      content: [
        '• Mission Brief: Set objectives, squads, assets before launch',
        '• Readiness Checks: Verify comms, personnel, equipment',
        '• Plan Lock: Prevent changes after briefing starts',
        '• Go/No-Go Decision: Commander authorizes operation start',
        '• Closeout Checklist: AAR, treasury settlement, debrief',
        '• Archive: Preserve operation data for historical review'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-zinc-100 mb-2">Advanced Operations Command</h3>
        <p className="text-xs text-zinc-400">Master tactical planning, leadership, and operational execution.</p>
      </div>

      <div className="space-y-4">
        {topics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <div key={idx} className="border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-start gap-3 p-4 border-b border-zinc-800">
                <Icon className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-100">{topic.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{topic.description}</p>
                </div>
              </div>
              <div className="p-4 bg-zinc-950/50">
                <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                  {topic.content.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 shrink-0">◆</span>
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
        <Shield className="w-4 h-4 mr-2" />
        Create an Operation
      </Button>
    </div>
  );
}