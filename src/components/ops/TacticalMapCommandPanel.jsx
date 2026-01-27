import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, Radio, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TacticalMapCommandPanel({ incidents = [], commands = [], markers = [] }) {
  // Separate urgent vs routine
  const urgentIncidents = incidents.filter(i => ['CRITICAL', 'HIGH'].includes(i.severity) && i.status === 'active');
  const activeMarkers = markers.filter(m => m.type === 'rally' || m.type === 'objective');
  const recentCommands = commands.slice(0, 5);

  return (
    <div className="space-y-2">
      {/* URGENT Incidents */}
      {urgentIncidents.length > 0 && (
        <Card className="bg-red-950/30 border-red-700">
          <CardHeader className="p-2 border-b border-red-700 bg-red-950/50">
            <CardTitle className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> URGENT INCIDENTS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {urgentIncidents.map((inc) => (
              <div key={inc.id} className="text-[8px] bg-red-950/40 border border-red-700 p-1.5">
                <div className="font-bold text-red-300">{inc.title}</div>
                <div className="text-red-400 text-[7px]">{inc.severity}</div>
                {inc.description && <div className="text-zinc-300 text-[7px] mt-0.5">{inc.description}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Commands */}
      {recentCommands.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="p-2 border-b border-zinc-800 bg-zinc-900/50">
            <CardTitle className="text-[9px] font-bold text-zinc-300 uppercase flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#ea580c]" /> RECENT ORDERS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {recentCommands.map((cmd) => {
              const age = Date.now() - new Date(cmd.created_date).getTime();
              const isFresh = age < 60000;

              return (
                <div key={cmd.id} className={cn('text-[8px] p-1.5 border', isFresh ? 'bg-[#ea580c]/20 border-[#ea580c]' : 'bg-zinc-900/40 border-zinc-700')}>
                  <div className="font-bold text-[#ea580c]">{cmd.message.slice(0, 40)}...</div>
                  <div className="text-zinc-500 text-[7px] mt-0.5">
                    {format(new Date(cmd.created_date), 'HH:mm:ss')}
                    {isFresh && <span className="ml-1 text-[#ea580c] font-bold">FRESH</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Markers */}
      {activeMarkers.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="p-2 border-b border-zinc-800 bg-zinc-900/50">
            <CardTitle className="text-[9px] font-bold text-zinc-300 uppercase flex items-center gap-1">
              <Flag className="w-3 h-3 text-emerald-500" /> ACTIVE OBJECTIVES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {activeMarkers.map((marker) => (
              <div key={marker.id} className="text-[8px] bg-zinc-900/40 border border-zinc-700 p-1.5">
                <div className="font-bold text-white">{marker.label}</div>
                <Badge className="text-[6px] mt-1" style={{ backgroundColor: marker.color || '#ea580c' }}>
                  {marker.type}
                </Badge>
                {marker.description && <div className="text-zinc-400 text-[7px] mt-0.5">{marker.description}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}