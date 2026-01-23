import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function OpsTimeline({ session, user, onLogEntry }) {
  const logs = session?.operation_log || [];

  const getLogIcon = (type) => {
    const icons = {
      status_update: '◆',
      command: '→',
      incident: '⚠',
      squad_ping: '◉',
      personnel_change: '◎'
    };
    return icons[type] || '•';
  };

  return (
    <div className="space-y-1 p-2">
      {logs.length === 0 ? (
        <p className="text-[8px] text-zinc-600 italic py-2">No timeline entries yet.</p>
      ) : (
        logs.slice(-20).reverse().map((log, idx) => (
          <div key={idx} className="text-[8px] text-zinc-400 py-1 border-b border-zinc-800/50">
            <div className="flex gap-1">
              <span className="text-[#ea580c] font-bold w-3 shrink-0">{getLogIcon(log.type)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-300">{log.content}</span>
                <div className="text-[7px] text-zinc-600 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}