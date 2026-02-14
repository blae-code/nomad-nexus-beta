import React, { useState } from 'react';
import { Crosshair, X, Play, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CombatEngagementSequencer({ widgetId, onRemove, isDragging }) {
  const [sequence, setSequence] = useState([
    { id: 1, action: 'Approach Vector', time: 0, status: 'ready' },
    { id: 2, action: 'Target Lock', time: 5, status: 'pending' },
    { id: 3, action: 'Fire Volley', time: 8, status: 'pending' }
  ]);
  const [running, setRunning] = useState(false);

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(220,38,38,0.015)_0px,transparent_2px,transparent_4px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Combat Sequencer</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {sequence.map((step, i) => (
          <div key={step.id} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
              step.status === 'ready' ? 'bg-green-950/40 text-green-400 border border-green-700/60' :
              step.status === 'active' ? 'bg-orange-950/40 text-orange-400 border border-orange-700/60 animate-pulse' :
              'bg-zinc-900 text-zinc-600 border border-zinc-800'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-300 font-semibold">{step.action}</div>
              <div className="text-[9px] text-zinc-600 flex items-center gap-1">
                <Clock className="w-2 h-2" /> T+{step.time}s
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex gap-2 relative z-10">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRunning(!running)}
          className="flex-1 h-7 text-xs border-red-700/40 hover:border-red-500/60"
        >
          <Play className="w-3 h-3 mr-1" /> {running ? 'Stop' : 'Execute'}
        </Button>
        <Button size="sm" variant="outline" className="h-7 w-7 border-red-700/40 hover:border-red-500/60">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}