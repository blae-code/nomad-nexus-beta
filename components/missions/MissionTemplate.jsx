import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MissionTemplate({ templateId, canEdit }) {
  const { data: template, isLoading } = useQuery({
    queryKey: ['mission-template', templateId],
    queryFn: () => templateId ? base44.entities.EventTemplate.get(templateId) : null,
    enabled: !!templateId
  });

  const handleCreateFromTemplate = async () => {
    if (!template) return;
    try {
      const newEvent = await base44.entities.Event.create({
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description || '',
        event_type: template.event_type,
        priority: template.priority,
        location: template.default_location || '',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: template.duration_minutes 
          ? new Date(Date.now() + 3600000 + template.duration_minutes * 60000).toISOString()
          : null,
        status: 'scheduled',
        objectives: template.objectives?.map((text, i) => ({
          id: `obj_${i}`,
          text,
          is_completed: false
        })) || [],
        assigned_asset_ids: template.assigned_asset_ids || [],
        tags: template.tags || [],
        auec_split_rules: template.auec_split_rules || ''
      });

      toast.success('OPERATION CREATED FROM TEMPLATE');
      window.location.href = `/events?id=${newEvent.id}`;
    } catch (err) {
      toast.error('TEMPLATE CREATION FAILED');
    }
  };

  if (isLoading || !template) return null;

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center justify-between">
          <span>{template.name}</span>
          {canEdit && (
            <div className="flex gap-1">
              <button className="p-1 hover:bg-zinc-900 rounded transition-colors">
                <Edit2 className="w-3 h-3 text-zinc-500" />
              </button>
              <button className="p-1 hover:bg-red-900/20 rounded transition-colors">
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          )}
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        <p className="text-xs text-zinc-400">{template.description}</p>

        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div>
            <div className="text-zinc-600 font-bold uppercase">Type</div>
            <Badge variant="outline" className="text-[8px] mt-1">
              {template.event_type}
            </Badge>
          </div>
          <div>
            <div className="text-zinc-600 font-bold uppercase">Priority</div>
            <Badge variant="outline" className="text-[8px] mt-1">
              {template.priority}
            </Badge>
          </div>
        </div>

        {template.objectives && template.objectives.length > 0 && (
          <div>
            <div className="text-[9px] text-zinc-600 font-bold uppercase mb-1">Objectives</div>
            <ul className="text-[9px] text-zinc-400 space-y-0.5 ml-2">
              {template.objectives.map((obj, i) => (
                <li key={i}>• {obj}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          onClick={handleCreateFromTemplate}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs h-7"
        >
          <Copy className="w-3 h-3 mr-1" />
          CREATE OPERATION
        </Button>
      </OpsPanelContent>
    </OpsPanel>
  );
}