import React, { useState } from 'react';
import { FileText, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MissionBriefingTerminal({ widgetId, onRemove, isDragging }) {
  const [expanded, setExpanded] = useState(null);
  const briefings = [
    { id: 1, title: 'Op Redline', status: 'ACTIVE', priority: 'HIGH', brief: 'Secure sector alpha-7. Expected resistance.' },
    { id: 2, title: 'Supply Run', status: 'PENDING', priority: 'MEDIUM', brief: 'Deliver medical supplies to outpost.' }
  ];

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.02)_0px,transparent_3px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Briefings</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {briefings.map(brief => (
          <div key={brief.id} className="border border-zinc-700/40 bg-zinc-900/40 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === brief.id ? null : brief.id)}
              className="w-full p-2 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full ${brief.status === 'ACTIVE' ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                <span className="text-xs font-bold text-zinc-300">{brief.title}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                  brief.priority === 'HIGH' ? 'bg-red-950/40 text-red-400' : 'bg-zinc-900/40 text-zinc-500'
                }`}>
                  {brief.priority}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${expanded === brief.id ? 'rotate-180' : ''}`} />
            </button>
            {expanded === brief.id && (
              <div className="p-2 border-t border-zinc-800/60 bg-black/40">
                <p className="text-[10px] text-zinc-400 leading-relaxed">{brief.brief}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}