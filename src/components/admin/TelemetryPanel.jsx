import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TelemetryPanel({ logs, auditLogs }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'failure': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getStatusSymbol = (status) => {
    switch(status) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'failure': return '✗';
      default: return '◦';
    }
  };

  return (
    <div className="w-72 flex flex-col border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase">TELEMETRY STREAM</span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-0">
        {logs.length === 0 && (
          <div className="p-3 text-center text-zinc-600">
            <p className="text-[8px]">Awaiting cockpit operations...</p>
          </div>
        )}
        
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={cn(
              'px-3 py-1.5 border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors',
              getStatusColor(log.status)
            )}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[10px] font-bold">{getStatusSymbol(log.status)}</span>
              <div className="min-w-0">
                <div className="text-[8px] text-zinc-500">{log.timestamp}</div>
                <div className="truncate text-zinc-300">{log.action}</div>
                <div className="text-[8px] text-zinc-600">{log.duration}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Successful Operations */}
      {auditLogs.length > 0 && (
        <div className="shrink-0 border-t border-zinc-800 p-3 space-y-1 bg-zinc-950/50">
          <p className="text-[9px] font-bold text-zinc-400 uppercase">Latest Audit</p>
          {auditLogs.slice(0, 3).map((log, idx) => (
            <div key={idx} className="text-[8px] text-zinc-500 flex items-center gap-1">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                log.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              {log.step_name} · {log.duration_ms}ms
            </div>
          ))}
        </div>
      )}
    </div>
  );
}