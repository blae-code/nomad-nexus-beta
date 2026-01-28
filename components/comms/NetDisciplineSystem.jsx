import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DISCIPLINES = [
  { value: 'casual', label: 'CASUAL', desc: 'Open comms, no restrictions' },
  { value: 'focused', label: 'FOCUSED', desc: 'Rank discipline enforced' }
];

export default function NetDisciplineSystem({ netId, canEdit }) {
  const [net, setNet] = React.useState(null);

  const { data: currentNet } = useQuery({
    queryKey: ['net-discipline', netId],
    queryFn: () => netId ? base44.entities.VoiceNet.get(netId) : null,
    enabled: !!netId,
    initialData: null
  });

  React.useEffect(() => {
    if (currentNet) setNet(currentNet);
  }, [currentNet]);

  const handleDisciplineChange = async (newDiscipline) => {
    if (!canEdit || !net) return;
    try {
      await base44.entities.VoiceNet.update(net.id, { discipline: newDiscipline });
      setNet({ ...net, discipline: newDiscipline });
      toast.success(`DISCIPLINE SET TO ${newDiscipline.toUpperCase()}`);
    } catch (err) {
      toast.error('UPDATE FAILED');
    }
  };

  const handleStageMode = async (enabled) => {
    if (!canEdit || !net) return;
    try {
      await base44.entities.VoiceNet.update(net.id, { stage_mode: enabled });
      setNet({ ...net, stage_mode: enabled });
      toast.success(`STAGE MODE ${enabled ? 'ACTIVATED' : 'DISABLED'}`);
    } catch (err) {
      toast.error('UPDATE FAILED');
    }
  };

  if (!net) return null;

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Shield className="w-3 h-3" />
          NET DISCIPLINE
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        {/* Discipline Mode */}
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
            DISCIPLINE MODE
          </div>
          {canEdit ? (
            <Select value={net.discipline || 'casual'} onValueChange={handleDisciplineChange}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map(d => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label} - {d.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">
              {net.discipline?.toUpperCase() || 'CASUAL'}
            </Badge>
          )}
        </div>

        {/* Rank Requirements */}
        {net.discipline === 'focused' && (
          <div className="p-2 bg-blue-900/10 border border-blue-900/30 rounded space-y-1">
            <div className="text-[9px] text-blue-400 font-bold uppercase">RANK REQUIREMENTS</div>
            <div className="text-[9px] text-blue-300/70 space-y-0.5">
              <div>• TX: {net.min_rank_to_tx || 'Vagrant'}</div>
              <div>• RX: {net.min_rank_to_rx || 'Vagrant'}</div>
            </div>
          </div>
        )}

        {/* Stage Mode */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-zinc-300">STAGE MODE</div>
              <div className="text-[9px] text-zinc-600">Only commanders grant TX</div>
            </div>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => handleStageMode(!net.stage_mode)}
                className={cn(
                  'text-xs h-6',
                  net.stage_mode
                    ? 'bg-red-900 hover:bg-red-800'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                )}
              >
                {net.stage_mode ? 'ACTIVE' : 'INACTIVE'}
              </Button>
            )}
          </div>
          {net.stage_mode && (
            <div className="p-2 bg-amber-900/10 border border-amber-900/30 rounded text-[9px]">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-amber-300/70">
                  Users must HAIL to request transmission. Commanders approve via net controls.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Priority Level */}
        <div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
            PRIORITY
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => canEdit && base44.entities.VoiceNet.update(net.id, { priority: p })}
                className={cn(
                  'px-2 py-1 text-[9px] font-mono rounded border transition-colors',
                  net.priority === p
                    ? 'bg-[#ea580c]/10 border-[#ea580c]/50'
                    : 'border-zinc-800 hover:border-zinc-700'
                )}
                disabled={!canEdit}
              >
                {p === 1 ? 'CMD' : p === 2 ? 'STD' : 'LOW'}
              </button>
            ))}
          </div>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}