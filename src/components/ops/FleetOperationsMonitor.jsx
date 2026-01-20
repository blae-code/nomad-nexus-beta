import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { Rocket, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FleetOperationsMonitor() {
  const { data: assets } = useQuery({
    queryKey: ['fleet-monitor'],
    queryFn: () => base44.entities.FleetAsset.list(),
    initialData: [],
    refetchInterval: 5000
  });

  const { data: events } = useQuery({
    queryKey: ['active-events-monitor'],
    queryFn: () => base44.entities.Event.filter({ status: 'active' }, '-start_time', 10),
    initialData: [],
    refetchInterval: 3000
  });

  const deployedAssets = assets.filter(a => a.status === 'deployed');
  const maintenanceAssets = assets.filter(a => a.status === 'maintenance');
  const readyAssets = assets.filter(a => a.status === 'ready');

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Rocket className="w-3 h-3" />
          FLEET OPERATIONS
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        {/* Fleet Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-[9px]">
          <div className="p-2 bg-emerald-900/10 border border-emerald-900/30 rounded">
            <div className="text-emerald-400 font-bold">DEPLOYED</div>
            <div className="text-xl font-mono text-emerald-300">{deployedAssets.length}</div>
          </div>
          <div className="p-2 bg-amber-900/10 border border-amber-900/30 rounded">
            <div className="text-amber-400 font-bold">READY</div>
            <div className="text-xl font-mono text-amber-300">{readyAssets.length}</div>
          </div>
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded">
            <div className="text-zinc-400 font-bold">MAINTENANCE</div>
            <div className="text-xl font-mono text-zinc-300">{maintenanceAssets.length}</div>
          </div>
        </div>

        {/* Active Operations */}
        {events.length > 0 && (
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">ACTIVE OPS</div>
            {events.slice(0, 3).map(op => (
              <div key={op.id} className="p-1.5 bg-zinc-950/30 border border-zinc-800/50 rounded text-[9px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-mono truncate">{op.title}</span>
                  <Badge variant="outline" className="text-[8px] h-4">
                    {op.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-[8px] text-zinc-600 mt-0.5">
                  {op.assigned_user_ids?.length || 0} personnel
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fleet Utilization */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">UTILIZATION</div>
          <div className="w-full bg-zinc-900 rounded h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 h-full transition-all"
              style={{ width: `${(deployedAssets.length / assets.length) * 100 || 0}%` }}
            />
          </div>
          <div className="text-[8px] text-zinc-600 mt-1">
            {Math.round((deployedAssets.length / assets.length) * 100 || 0)}% of fleet in operation
          </div>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}