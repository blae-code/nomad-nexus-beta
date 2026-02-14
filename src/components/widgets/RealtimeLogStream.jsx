import React, { useState, useEffect } from 'react';
import { Terminal, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RealtimeLogStream({ widgetId, onRemove, isDragging }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const levels = ['INFO', 'WARN', 'ERROR'];
      const messages = [
        'System heartbeat received',
        'Voice net connection stable',
        'Asset telemetry updated',
        'Warning: Low fuel detected',
        'Error: Communication timeout'
      ];
      
      setLogs(prev => [{
        id: Date.now(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        time: new Date()
      }, ...prev].slice(0, 50));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black/98 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.01)_0px,transparent_2px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Log Stream</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[9px] relative z-10">
        {logs.map(log => (
          <div key={log.id} className={`flex items-start gap-2 animate-in slide-in-from-top duration-200 ${
            log.level === 'ERROR' ? 'text-red-400' :
            log.level === 'WARN' ? 'text-orange-400' : 'text-zinc-600'
          }`}>
            <span className="text-zinc-700">[{log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span className={`px-1 rounded ${
              log.level === 'ERROR' ? 'bg-red-950/40 text-red-500' :
              log.level === 'WARN' ? 'bg-orange-950/40 text-orange-500' : 'bg-zinc-900/40 text-zinc-600'
            }`}>
              {log.level}
            </span>
            <span className="flex-1">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}