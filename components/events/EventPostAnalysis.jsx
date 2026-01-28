import { useState } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Save } from "lucide-react";

export default function EventPostAnalysis({ event, canEdit }) {
  const [analysisData, setAnalysisData] = useState({
    completion_status: event?.completion_status || '',
    lessons_learned: event?.lessons_learned || '',
    casualties: event?.casualties || 0,
    objectives_completed: event?.objectives_completed || 0,
    total_objectives: Array.isArray(event?.objectives) ? event.objectives.length : 0,
    success_rate: event?.success_rate || 0
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.update(event.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-detail', event.id] })
  });

  const handleSave = () => {
    updateMutation.mutate(analysisData);
  };

  const completionPercentage = analysisData.total_objectives > 0 
    ? Math.round((analysisData.objectives_completed / analysisData.total_objectives) * 100)
    : 0;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Post-Event Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-zinc-950/50 p-2 border border-zinc-800/50 rounded">
            <div className="text-[10px] text-zinc-500 uppercase">Completion</div>
            <div className="text-lg font-bold text-zinc-200">{completionPercentage}%</div>
            <div className="text-xs text-zinc-500">{analysisData.objectives_completed}/{analysisData.total_objectives}</div>
          </div>
          <div className="bg-zinc-950/50 p-2 border border-zinc-800/50 rounded">
            <div className="text-[10px] text-zinc-500 uppercase">Casualties</div>
            <div className="text-lg font-bold text-red-500">{analysisData.casualties}</div>
          </div>
          <div className="bg-zinc-950/50 p-2 border border-zinc-800/50 rounded">
            <div className="text-[10px] text-zinc-500 uppercase">Status</div>
            <Badge variant="outline" className={
              event?.status === 'completed' ? "text-emerald-500 border-emerald-900 bg-emerald-950/10" :
              event?.status === 'active' ? "text-blue-500 border-blue-900 bg-blue-950/10" :
              "text-zinc-500 border-zinc-800"
            }>
              {event?.status || 'pending'}
            </Badge>
          </div>
          <div className="bg-zinc-950/50 p-2 border border-zinc-800/50 rounded">
            <div className="text-[10px] text-zinc-500 uppercase">Duration</div>
            <div className="text-xs text-zinc-300">
              {event?.start_time && event?.end_time ? 
                `${Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000)} min` : 
                'TBD'
              }
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        {canEdit && (
          <div className="space-y-3 border-t border-zinc-800 pt-3">
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Lessons Learned</label>
              <Textarea
                value={analysisData.lessons_learned}
                onChange={(e) => setAnalysisData({...analysisData, lessons_learned: e.target.value})}
                placeholder="Document key takeaways and improvements..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 h-20 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Objectives Completed</label>
                <input
                  type="number"
                  min="0"
                  value={analysisData.objectives_completed}
                  onChange={(e) => setAnalysisData({...analysisData, objectives_completed: parseInt(e.target.value)})}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 h-8 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Casualties</label>
                <input
                  type="number"
                  min="0"
                  value={analysisData.casualties}
                  onChange={(e) => setAnalysisData({...analysisData, casualties: parseInt(e.target.value)})}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 h-8 text-sm w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full bg-red-900 hover:bg-red-800 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Analysis'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}