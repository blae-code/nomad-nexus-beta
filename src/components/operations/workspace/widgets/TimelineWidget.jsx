import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOG_TYPE_COLORS = {
  status_update: 'border-blue-700/30 text-blue-300',
  command: 'border-orange-700/30 text-orange-300',
  incident: 'border-red-700/30 text-red-300',
  squad_ping: 'border-cyan-700/30 text-cyan-300',
  personnel_change: 'border-purple-700/30 text-purple-300'
};

const LOG_TYPE_LABELS = {
  status_update: 'STATUS',
  command: 'CMD',
  incident: 'INC',
  squad_ping: 'PING',
  personnel_change: 'PERS'
};

export default function TimelineWidget({ operation }) {
  const [showMore, setShowMore] = useState(false);

  const logs = operation?.operation_log || [];
  const displayLogs = showMore ? logs : logs.slice(-10).reverse();

  if (logs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <h3 className="text-[9px] font-bold uppercase text-zinc-300 mb-2">Timeline</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[8px] text-zinc-600 italic">No entries yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300">Timeline</h3>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {displayLogs.map((log, idx) => (
          <div
            key={log.timestamp + idx}
            className={cn(
              'px-2 py-1 border-l-2 bg-zinc-900/30 text-[8px]',
              LOG_TYPE_COLORS[log.type] || 'border-zinc-700/30 text-zinc-400'
            )}
          >
            <div className="flex items-start gap-1.5">
              <span className="text-[7px] font-bold uppercase shrink-0 mt-0.5 px-1 py-0.5 bg-current/20">
                {LOG_TYPE_LABELS[log.type] || log.type}
              </span>
              <div className="flex-1">
                <p className="leading-tight">{log.content}</p>
                <p className="text-[7px] opacity-60 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!showMore && logs.length > 10 && (
        <button
          onClick={() => setShowMore(true)}
          className="flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/30 border border-zinc-700/50 hover:border-zinc-600 text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown className="w-2.5 h-2.5" />
          LOAD OLDER ({logs.length - 10})
        </button>
      )}
    </div>
  );
}