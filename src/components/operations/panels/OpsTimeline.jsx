import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, Radio, Users, Zap } from 'lucide-react';

const typeIcons = {
  status_update: <Radio className="w-3 h-3" />,
  command: <Zap className="w-3 h-3" />,
  incident: <AlertTriangle className="w-3 h-3" />,
  squad_ping: <Users className="w-3 h-3" />,
  personnel_change: <Users className="w-3 h-3" />
};

const typeColors = {
  status_update: 'text-blue-400',
  command: 'text-yellow-400',
  incident: 'text-red-400',
  squad_ping: 'text-cyan-400',
  personnel_change: 'text-purple-400'
};

export default function OpsTimeline({ session, user, onLogEntry }) {
  const logs = session?.operation_log || [];

  if (logs.length === 0) {
    return (
      <div className="p-3 text-[8px] text-zinc-600 italic text-center">
        No timeline entries yet
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50)
        .map((log, idx) => (
          <div
            key={idx}
            className="group relative border-l-2 border-zinc-800 pl-3 py-1 hover:border-[#ea580c]/50 transition-colors"
          >
            <div className="flex items-start gap-1.5">
              <div className={cn('mt-0.5 shrink-0', typeColors[log.type] || 'text-zinc-600')}>
                {typeIcons[log.type] || <Radio className="w-3 h-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[7px] text-zinc-500">
                  {format(new Date(log.timestamp), 'HH:mm:ss')}
                </p>
                <p className="text-[8px] text-zinc-300 truncate">{log.content}</p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}