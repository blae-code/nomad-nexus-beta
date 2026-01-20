import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Radio, Activity, Settings, FileText, Plus, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const typeIcons = {
  STATUS: Activity,
  COMMS: Radio,
  RESCUE: AlertTriangle,
  SYSTEM: Settings,
  NOTE: FileText
};

const severityColor = {
  HIGH: 'text-red-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400'
};

export default function EventTimeline({ eventId, onAddNote }) {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['event-logs', eventId],
    queryFn: () => base44.entities.EventLog.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId,
    refetchInterval: 5000
  });

  const filteredLogs = logs.filter(log => {
    const typeMatch = typeFilter === 'ALL' || log.type === typeFilter;
    const severityMatch = severityFilter === 'ALL' || log.severity === severityFilter;
    return typeMatch && severityMatch;
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center text-xs">
        <span className="text-zinc-500 font-mono">FILTER:</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white px-2 py-1 font-mono text-[10px]"
        >
          <option value="ALL">ALL TYPES</option>
          <option value="STATUS">STATUS</option>
          <option value="COMMS">COMMS</option>
          <option value="RESCUE">RESCUE</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="NOTE">NOTE</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white px-2 py-1 font-mono text-[10px]"
        >
          <option value="ALL">ALL SEVERITY</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddNote && onAddNote()}
          className="text-[10px] h-7 gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Note
        </Button>
      </div>

      {/* Timeline */}
      <div className="border border-zinc-700 bg-zinc-900/30 p-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading timeline...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-4 font-mono">
            NO LOGS RECORDED
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => {
              const Icon = typeIcons[log.type] || FileText;
              const timestamp = new Date(log.timestamp || log.created_date).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div key={log.id} className="border border-zinc-700 bg-zinc-900/50 p-2 text-xs hover:border-[#ea580c] transition-colors">
                  <div className="flex items-start gap-2 mb-1">
                    <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${severityColor[log.severity] || 'text-zinc-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[9px] text-zinc-400">{timestamp}</div>
                      <div className="text-white font-bold truncate">{log.summary}</div>
                      {log.details && typeof log.details === 'object' && (
                        <div className="text-zinc-500 mt-1 font-mono text-[8px]">
                          {Object.entries(log.details)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(' | ')}
                        </div>
                      )}
                    </div>
                    <div className={`px-1.5 py-0.5 bg-zinc-800 text-[8px] font-mono uppercase flex-shrink-0 ${severityColor[log.severity] || 'text-zinc-400'}`}>
                      {log.severity}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}