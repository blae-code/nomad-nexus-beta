import React, { useState } from 'react';
import { Maximize2, X, MapPin, Target, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AROverlayController({ widgetId, onRemove, isDragging }) {
  const [layers, setLayers] = useState([
    { id: 'waypoints', name: 'Waypoints', active: true, icon: MapPin },
    { id: 'targets', name: 'Targets', active: true, icon: Target },
    { id: 'friendlies', name: 'Friendlies', active: false, icon: Eye }
  ]);

  const toggleLayer = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.01)_0px,transparent_4px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">AR Overlay</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {layers.map(layer => {
          const Icon = layer.icon;
          return (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`w-full p-2 rounded border transition-all flex items-center justify-between ${
                layer.active
                  ? 'border-red-500 bg-red-950/40'
                  : 'border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${layer.active ? 'text-red-500' : 'text-zinc-600'}`} />
                <span className="text-xs font-bold text-zinc-300">{layer.name}</span>
              </div>
              <div className={`w-8 h-4 rounded-full transition-all relative ${
                layer.active ? 'bg-red-600' : 'bg-zinc-800'
              }`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                  layer.active ? 'left-4' : 'left-0.5'
                }`} />
              </div>
            </button>
          );
        })}

        <div className="mt-4 p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">Overlay Opacity</div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="75"
            className="w-full h-1 bg-zinc-900 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
          />
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Sync to Game
        </Button>
      </div>
    </div>
  );
}