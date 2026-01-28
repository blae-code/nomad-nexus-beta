import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { AlertTriangle, Bell, Clock, Radio, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  RESCUE: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ALERT: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  STATUS: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  COMMS: { icon: Radio, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
};

export default function LiveOperationsFeed({ eventId, limit = 10 }) {
  const [selectedSeverity, setSelectedSeverity] = React.useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['live-feed', eventId, selectedSeverity],
    queryFn: async () => {
      if (!eventId) return [];
      const allLogs = await base44.entities.EventLog.filter({ event_id: eventId }, '-timestamp', 50);
      if (selectedSeverity !== 'all') {
        return allLogs.filter(log => log.severity === selectedSeverity);
      }
      return allLogs;
    },
    enabled: !!eventId,
    initialData: [],
    refetchInterval: 5000
  });

  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...logs].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const feed = sorted.slice(0, limit);

  const getSeverityColor = (severity) => {
    const map = { HIGH: 'text-red-500', MEDIUM: 'text-amber-500', LOW: 'text-zinc-400' };
    return map[severity] || 'text-zinc-500';
  };

  return (
    <OpsPanel>
      <OpsPanelHeader className="flex items-center justify-between">
        <OpsPanelTitle className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          OPERATIONS FEED
        </OpsPanelTitle>
        <div className="flex gap-1">
          {['all', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={cn(
                'text-[9px] font-mono px-2 py-1 border rounded transition-colors',
                selectedSeverity === sev
                  ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {sev === 'all' ? 'ALL' : sev}
            </button>
          ))}
        </div>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="text-zinc-500 text-xs">LOADING FEED...</div>
        ) : feed.length === 0 ? (
          <div className="text-zinc-600 text-xs">NO ACTIVITY</div>
        ) : (
          feed.map((log, idx) => {
            const typeIcon = ICON_MAP[log.type] || ICON_MAP.STATUS;
            const Icon = typeIcon.icon;

            return (
              <motion.a
                key={log.id}
                href={`${createPageUrl('Events')}?id=${log.event_id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'block p-2 rounded border transition-all hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer',
                  'border-zinc-800/50 bg-zinc-950/30'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(typeIcon.bg, 'p-1.5 rounded mt-0.5')}>
                    <Icon className={cn('w-3 h-3', typeIcon.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-[9px] font-mono font-bold uppercase', getSeverityColor(log.severity))}>
                        {log.type}
                      </span>
                      <Badge variant="outline" className="text-[7px] px-1 py-0">
                        {log.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2">{log.summary}</p>
                    <div className="text-[9px] text-zinc-600 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}