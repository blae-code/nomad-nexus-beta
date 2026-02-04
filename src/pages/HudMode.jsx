import React, { useEffect, useState } from 'react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
import TacticalMap from '@/components/tactical/TacticalMap';
import { AlertTriangle, Radio } from 'lucide-react';

export default function HudMode() {
  const activeOp = useActiveOp();
  const [commands, setCommands] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const loadHudData = async () => {
      try {
        const filter = activeOp?.activeEventId ? { event_id: activeOp.activeEventId } : {};
        const [cmds, incs] = await Promise.all([
          base44.entities.TacticalCommand.filter(filter, '-created_date', 50).catch(() => []),
          base44.entities.Incident.filter(filter, '-created_date', 50).catch(() => []),
        ]);
        setCommands(cmds || []);
        setIncidents(incs || []);
      } catch (error) {
        console.error('HUD load failed:', error);
      }
    };

    loadHudData();
  }, [activeOp?.activeEventId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-3 gap-4 p-4">
        <div className="col-span-2">
          <TacticalMap eventId={activeOp?.activeEventId || null} activeEvent={activeOp?.activeEvent || null} compact />
        </div>
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
              <Radio className="w-3 h-3" />
              Orders
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {commands.length === 0 ? (
                <div className="text-xs text-zinc-500">No active orders</div>
              ) : (
                commands.map((cmd) => (
                  <div key={cmd.id} className="text-xs text-zinc-300 border border-zinc-700/50 rounded p-2">
                    <div className="text-[10px] text-orange-400 uppercase">{cmd.command_type || 'ORDER'}</div>
                    <div>{cmd.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Alerts
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {incidents.length === 0 ? (
                <div className="text-xs text-zinc-500">No active alerts</div>
              ) : (
                incidents.map((incident) => (
                  <div key={incident.id} className="text-xs text-zinc-300 border border-zinc-700/50 rounded p-2">
                    <div className="text-[10px] text-red-400 uppercase">{incident.severity || 'ALERT'}</div>
                    <div>{incident.title}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
