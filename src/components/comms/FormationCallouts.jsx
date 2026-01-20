import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Zap, Grid3x3, Columns3, Map, Circle } from 'lucide-react';
import { toast } from 'sonner';

const FORMATIONS = [
  {
    id: 'delta',
    name: 'Delta Formation',
    description: 'Lead flanked by two wings. Best for combat.',
    icon: Zap,
    briefing: 'DELTA: Lead at apex, wings sweep 45° outboard. 500m spacing.'
  },
  {
    id: 'line',
    name: 'Line Formation',
    description: 'Horizontal line. Maximum firepower, minimum maneuverability.',
    icon: Columns3,
    briefing: 'LINE: All units horizontal. 300m lateral spacing. Watch flanks.'
  },
  {
    id: 'stack',
    name: 'Stack Formation',
    description: 'Vertical stacking. Good for canyon/terrain following.',
    icon: Grid3x3,
    briefing: 'STACK: Vertical tiers. 200m altitude separation. Maintain z-axis.'
  },
  {
    id: 'scatter',
    name: 'Scatter Formation',
    description: 'Loose dispersal. Maximum survival, minimum cohesion.',
    icon: Map,
    briefing: 'SCATTER: Dispersed 1km+. Eyes on assigned sector. Report contacts.'
  },
  {
    id: 'orbit',
    name: 'Orbit Formation',
    description: 'Circular orbit around point. Good for defense.',
    icon: Circle,
    briefing: 'ORBIT: Circle around rally point. Clockwise rotation, 600m radius.'
  }
];

export default function FormationCallouts({ eventId, currentNetId }) {
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState(null);

  const broadcastFormation = async (formation) => {
    try {
      setBroadcastStatus('sending');
      
      // Log to event timeline
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'COMMS',
        severity: 'MEDIUM',
        summary: `FORMATION CALLOUT: ${formation.name}`,
        details: {
          formation_id: formation.id,
          briefing: formation.briefing,
          timestamp: new Date().toISOString()
        }
      });

      toast.success(`${formation.name} broadcasted to net`);
      setBroadcastStatus('sent');
      
      setTimeout(() => {
        setBroadcastStatus(null);
        setSelectedFormation(null);
      }, 2000);
    } catch (error) {
      toast.error('Failed to broadcast formation');
      setBroadcastStatus(null);
    }
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle>Formation Callouts</OpsPanelTitle>
      </OpsPanelHeader>
      <OpsPanelContent className="space-y-2">
        <div className="grid grid-cols-1 gap-2">
          {FORMATIONS.map(formation => {
            const Icon = formation.icon;
            
            return (
              <AlertDialog key={formation.id}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start h-auto py-2 px-3 text-left border-zinc-700 hover:bg-zinc-800 ${
                      broadcastStatus === 'sent' && selectedFormation?.id === formation.id
                        ? 'bg-emerald-500/10 border-emerald-700'
                        : ''
                    }`}
                    onClick={() => setSelectedFormation(formation)}
                  >
                    <Icon className="w-4 h-4 mr-2 shrink-0 text-[#ea580c]" />
                    <div className="flex-1 text-left">
                      <div className="text-xs font-bold text-zinc-200">{formation.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{formation.description}</div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                  <AlertDialogTitle className="text-white">Confirm Formation Callout</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 space-y-4">
                    <div>
                      <div className="text-sm font-mono font-bold text-[#ea580c] uppercase mb-2">
                        {formation.briefing}
                      </div>
                      <p className="text-xs text-zinc-300">{formation.description}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded text-[10px] text-zinc-400">
                      This will broadcast the formation callout to all subscribed nets and log it to the event timeline.
                    </div>
                  </AlertDialogDescription>
                  <div className="flex gap-2">
                    <AlertDialogCancel className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-[#ea580c] hover:bg-[#c2410c] text-white"
                      onClick={() => broadcastFormation(formation)}
                    >
                      {broadcastStatus === 'sending' ? 'Broadcasting...' : 'Broadcast Formation'}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            );
          })}
        </div>
        
        {broadcastStatus === 'sent' && (
          <div className="text-center py-2 bg-emerald-500/10 border border-emerald-700 rounded text-xs text-emerald-300 font-mono">
            ✓ FORMATION CALLOUT TRANSMITTED
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}