import React, { useState } from 'react';
import { Rocket, X, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QuantumJumpPlanner({ widgetId, onRemove, isDragging }) {
  const [route, setRoute] = useState({ origin: '', destination: '', waypoints: [] });
  const [fuelCost, setFuelCost] = useState(0);

  const calculate = () => {
    const base = route.origin && route.destination ? 250 : 0;
    const waypointCost = route.waypoints.length * 75;
    setFuelCost(base + waypointCost);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.01)_0px,transparent_15px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Jump Planner</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Origin
          </label>
          <Input
            value={route.origin}
            onChange={(e) => { setRoute({...route, origin: e.target.value}); calculate(); }}
            placeholder="Starting location..."
            className="h-7 text-xs bg-zinc-900/60 border-zinc-700/60"
          />
        </div>

        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <Navigation className="w-2.5 h-2.5" /> Destination
          </label>
          <Input
            value={route.destination}
            onChange={(e) => { setRoute({...route, destination: e.target.value}); calculate(); }}
            placeholder="Target location..."
            className="h-7 text-xs bg-zinc-900/60 border-zinc-700/60"
          />
        </div>

        {fuelCost > 0 && (
          <div className="p-2 bg-orange-950/20 border border-orange-700/40 rounded">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Est. Fuel Cost</span>
              <span className="text-orange-400 font-bold">{fuelCost} units</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" className="w-full h-7 text-xs bg-red-600 hover:bg-red-500">
          <Rocket className="w-3 h-3 mr-1" /> Plot Course
        </Button>
      </div>
    </div>
  );
}