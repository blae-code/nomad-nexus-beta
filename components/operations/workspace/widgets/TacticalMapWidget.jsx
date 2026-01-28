import { useState } from 'react';
import { Map, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const LAYER_LABELS = {
  personnel: 'Personnel',
  squads: 'Squads',
  incidents: 'Incidents',
  objectives: 'Objectives'
};

export default function TacticalMapWidget({ operation, layers = ['personnel', 'squads', 'incidents'] }) {
  const [activeLayer, setActiveLayer] = useState(layers[0]);

  return (
    <div className="h-full flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] font-bold uppercase text-zinc-300 flex items-center gap-1.5">
          <Map className="w-3 h-3" />
          Tactical Map
        </h3>
      </div>

      {/* Layer Controls */}
      <div className="flex gap-0.5 flex-wrap">
        {layers.map(layer => (
          <button
            key={layer}
            onClick={() => setActiveLayer(layer)}
            className={cn(
              'px-2 py-1 text-[8px] font-mono uppercase border rounded-none transition-all',
              activeLayer === layer
                ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                : 'bg-zinc-800/30 border-zinc-700 text-zinc-500 hover:border-zinc-600'
            )}
          >
            {LAYER_LABELS[layer]}
          </button>
        ))}
      </div>

      {/* Map Placeholder */}
      <div className="flex-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Layers className="w-6 h-6 text-zinc-600 mx-auto opacity-50" />
          <p className="text-[8px] text-zinc-600">Tactical Map</p>
          <p className="text-[7px] text-zinc-700">{LAYER_LABELS[activeLayer]} Layer</p>
        </div>
      </div>
    </div>
  );
}