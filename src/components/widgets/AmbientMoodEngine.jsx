import React, { useState } from 'react';
import { Palette, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AmbientMoodEngine({ widgetId, onRemove, isDragging }) {
  const [mood, setMood] = useState('tactical');
  const moods = [
    { id: 'tactical', name: 'Tactical', color: 'from-red-950/40 to-orange-950/40' },
    { id: 'calm', name: 'Calm', color: 'from-blue-950/40 to-cyan-950/40' },
    { id: 'alert', name: 'Alert', color: 'from-red-950/60 to-red-950/40' },
    { id: 'stealth', name: 'Stealth', color: 'from-zinc-950/60 to-black/40' }
  ];

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${moods.find(m => m.id === mood)?.color} transition-all duration-1000 pointer-events-none`} />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Mood Engine</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 p-3 space-y-2 relative z-10">
        <div className="grid grid-cols-2 gap-2">
          {moods.map(m => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`p-3 rounded border-2 transition-all ${
                mood === m.id
                  ? 'border-red-500 bg-red-950/40 scale-105'
                  : 'border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600'
              }`}
            >
              <div className={`w-full h-12 rounded bg-gradient-to-br ${m.color} mb-2`} />
              <div className="text-xs font-bold text-zinc-300 text-center">{m.name}</div>
            </button>
          ))}
        </div>

        <div className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Ambient Volume</span>
            <Volume2 className="w-3 h-3 text-zinc-600" />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="50"
            className="w-full h-1 bg-zinc-900 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}