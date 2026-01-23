import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, BarChart } from 'lucide-react';
import { toast } from 'sonner';

export default function EventReportExporter({ eventId }) {
  const [generating, setGenerating] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId)
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['event-logs', eventId],
    queryFn: () => base44.entities.EventLog.filter({ event_id: eventId })
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['event-duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId })
  });

  const generateReportMutation = useMutation({
    mutationFn: async (type) => {
      setGenerating(true);
      const response = await base44.functions.invoke('generateEventReport', {
        eventId,
        reportType: type
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGenerating(false);
      
      // Download report
      const blob = new Blob([data.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.title || 'event'}_${data.reportType}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Report generated and downloaded');
    },
    onError: () => {
      setGenerating(false);
      toast.error('Failed to generate report');
    }
  });

  const metrics = {
    totalLogs: logs.length,
    statusChanges: logs.filter(l => l.type === 'STATUS').length,
    commsActivity: logs.filter(l => l.type === 'COMMS').length,
    personnelAssigned: assignments.length,
    objectivesCompleted: (event?.objectives || []).filter(o => o.is_completed).length,
    objectivesTotal: (event?.objectives || []).length
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950">
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
            Event Reports
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Metrics Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900/50 border border-zinc-800 p-2">
            <div className="text-[8px] text-zinc-600 uppercase mb-1">Logs</div>
            <div className="text-lg font-black text-emerald-500 font-mono">{metrics.totalLogs}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-2">
            <div className="text-[8px] text-zinc-600 uppercase mb-1">Personnel</div>
            <div className="text-lg font-black text-cyan-500 font-mono">{metrics.personnelAssigned}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-2">
            <div className="text-[8px] text-zinc-600 uppercase mb-1">Objectives</div>
            <div className="text-lg font-black text-amber-500 font-mono">
              {metrics.objectivesCompleted}/{metrics.objectivesTotal}
            </div>
          </div>
        </div>

        {/* Report Types */}
        <div className="space-y-2">
          <div className="text-[8px] text-zinc-600 uppercase font-bold mb-2">Generate Report</div>
          
          <button
            onClick={() => generateReportMutation.mutate('summary')}
            disabled={generating}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 text-zinc-400" />
              <div className="text-left">
                <div className="text-xs text-white font-medium">Event Summary</div>
                <div className="text-[8px] text-zinc-600">Key metrics and timeline overview</div>
              </div>
            </div>
            {generating ? (
              <Loader2 className="w-4 h-4 text-[#ea580c] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          <button
            onClick={() => generateReportMutation.mutate('detailed')}
            disabled={generating}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart className="w-3 h-3 text-zinc-400" />
              <div className="text-left">
                <div className="text-xs text-white font-medium">Detailed Analysis</div>
                <div className="text-[8px] text-zinc-600">Full logs, personnel, and outcomes</div>
              </div>
            </div>
            {generating ? (
              <Loader2 className="w-4 h-4 text-[#ea580c] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          <button
            onClick={() => generateReportMutation.mutate('aar')}
            disabled={generating}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 text-zinc-400" />
              <div className="text-left">
                <div className="text-xs text-white font-medium">After Action Report</div>
                <div className="text-[8px] text-zinc-600">Post-event analysis and lessons</div>
              </div>
            </div>
            {generating ? (
              <Loader2 className="w-4 h-4 text-[#ea580c] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-zinc-600" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}