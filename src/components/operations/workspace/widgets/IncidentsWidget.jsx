import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS = {
  CRITICAL: 'border-red-700/50 bg-red-950/30 text-red-300',
  HIGH: 'border-orange-700/50 bg-orange-950/30 text-orange-300',
  MEDIUM: 'border-yellow-700/50 bg-yellow-950/30 text-yellow-300',
  LOW: 'border-blue-700/50 bg-blue-950/30 text-blue-300'
};

export default function IncidentsWidget({ operation }) {
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', operation.id],
    queryFn: () => {
      if (!operation.id) return [];
      return base44.entities.Incident.filter(
        { event_id: operation.id, status: { $ne: 'resolved' } },
        '-severity',
        20
      );
    },
    staleTime: 5000,
    enabled: !!operation.id
  });

  const activeCount = incidents.filter(i => ['active', 'responding'].includes(i.status)).length;

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] font-bold uppercase text-zinc-300">Incidents</h3>
        {activeCount > 0 && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-950/40 border border-red-700/40 text-red-300">
            {activeCount} ACTIVE
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {incidents.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No active incidents</p>
        ) : (
          incidents.map(incident => (
            <div
              key={incident.id}
              className={cn(
                'px-2 py-1.5 border rounded-none text-[8px] space-y-0.5',
                SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.LOW
              )}
            >
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold uppercase truncate">{incident.title}</p>
                  <p className="text-[7px] opacity-75 truncate">
                    {incident.affected_area}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}