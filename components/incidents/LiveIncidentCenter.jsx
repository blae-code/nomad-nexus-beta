import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SEVERITY_MAP = {
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-900/50' },
  HIGH: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-900/50' },
  MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-900/50' },
  LOW: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-900/50' }
};

export default function LiveIncidentCenter() {
  const { data: incidents } = useQuery({
    queryKey: ['live-incidents'],
    queryFn: () => base44.entities.Incident.filter(
      { status: ['active', 'responding', 'contained'] },
      '-created_date',
      20
    ),
    initialData: [],
    refetchInterval: 3000
  });

  const handleResolve = async (incidentId) => {
    try {
      await base44.entities.Incident.update(incidentId, {
        status: 'resolved',
        resolved_at: new Date().toISOString()
      });
      toast.success('INCIDENT MARKED RESOLVED');
    } catch (err) {
      toast.error('RESOLUTION FAILED');
    }
  };

  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            INCIDENT CENTER
          </span>
          {criticalCount > 0 && (
            <Badge className="bg-red-900 text-red-200 text-[9px]">
              {criticalCount} CRITICAL
            </Badge>
          )}
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent>
        {incidents.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-4">NO ACTIVE INCIDENTS</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {incidents.map(incident => {
              const severityStyle = SEVERITY_MAP[incident.severity] || SEVERITY_MAP.LOW;

              return (
                <div
                  key={incident.id}
                  className={cn(
                    'p-2 rounded border',
                    severityStyle.bg,
                    severityStyle.border
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <div className={cn('text-xs font-bold', severityStyle.color)}>
                        {incident.title}
                      </div>
                      <div className="text-[9px] text-zinc-400 mt-0.5 line-clamp-2">
                        {incident.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-fit shrink-0">
                      {incident.incident_type}
                    </Badge>
                  </div>

                  {incident.affected_area && (
                    <div className="text-[8px] text-zinc-600 mb-1">
                      📍 {incident.affected_area}
                    </div>
                  )}

                  {incident.assigned_user_ids && incident.assigned_user_ids.length > 0 && (
                    <div className="text-[8px] text-zinc-600 mb-1">
                      👥 {incident.assigned_user_ids.length} assigned
                    </div>
                  )}

                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => handleResolve(incident.id)}
                      className="flex-1 px-2 py-1 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-900/50 rounded text-[8px] font-bold text-emerald-400 transition-colors"
                    >
                      RESOLVE
                    </button>
                    <button className="px-2 py-1 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded text-[8px]">
                      <X className="w-2.5 h-2.5 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}