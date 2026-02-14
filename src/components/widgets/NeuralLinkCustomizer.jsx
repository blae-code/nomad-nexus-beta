import React, { useState } from 'react';
import { Sliders, X, Eye, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NeuralLinkCustomizer({ widgetId, onRemove, isDragging }) {
  const [theme, setTheme] = useState('redscar');
  const themes = [
    { id: 'redscar', name: 'Redscar', colors: ['#dc2626', '#ea580c'] },
    { id: 'stealth', name: 'Stealth', colors: ['#3f3f46', '#18181b'] },
    { id: 'neon', name: 'Neon', colors: ['#06b6d4', '#8b5cf6'] },
    { id: 'gold', name: 'Gold', colors: ['#eab308', '#f59e0b'] }
  ];

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,rgba(220,38,38,0.02)_0deg,transparent_60deg)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Neural Link</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative z-10">
        <div className="space-y-1.5">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full p-2 rounded border transition-all flex items-center gap-2 ${
                theme === t.id
                  ? 'border-red-500 bg-red-950/40'
                  : 'border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600'
              }`}
            >
              <div className="flex gap-1">
                {t.colors.map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-xs font-bold text-zinc-300">{t.name}</span>
              {theme === t.id && <Zap className="w-3 h-3 text-red-500 ml-auto" />}
            </button>
          ))}
        </div>

        <div className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded space-y-2">
          <div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Opacity</div>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="95"
              className="w-full h-1 bg-zinc-900 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
            />
          </div>
          <div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Blur Intensity</div>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="60"
              className="w-full h-1 bg-zinc-900 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" className="w-full h-7 text-xs bg-red-600 hover:bg-red-500">
          <Eye className="w-3 h-3 mr-1" /> Apply Theme
        </Button>
      </div>
    </div>
  );
}