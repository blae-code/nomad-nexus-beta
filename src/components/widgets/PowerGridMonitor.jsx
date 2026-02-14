import React, { useState, useEffect } from 'react';
import { Zap, X, Battery, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PowerGridMonitor({ widgetId, onRemove, isDragging }) {
  const [grid, setGrid] = useState({
    total: 100,
    used: 0,
    systems: []
  });

  useEffect(() => {
    const systems = [
      { name: 'Life Support', draw: 15 },
      { name: 'Shields', draw: 25 },
      { name: 'Weapons', draw: 30 },
      { name: 'Engines', draw: 20 },
      { name: 'Sensors', draw: 10 }
    ];
    const used = systems.reduce((sum, s) => sum + s.draw, 0);
    setGrid({ total: 100, used, systems });
  }, []);

  const utilizationPct = (grid.used / grid.total) * 100;

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,rgba(220,38,38,0.02)_0px,transparent_15px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Power Grid</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
        <div className="p-3 bg-zinc-900/40 border border-zinc-700/40 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Grid Utilization</span>
            {utilizationPct > 90 && <AlertTriangle className="w-3 h-3 text-orange-500 animate-pulse" />}
          </div>
          <div className="flex items-center gap-2">
            <Battery className={`w-4 h-4 ${utilizationPct > 90 ? 'text-red-500' : 'text-orange-500'}`} />
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${utilizationPct > 90 ? 'bg-red-500' : utilizationPct > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${utilizationPct > 90 ? 'text-red-400' : 'text-orange-400'}`}>
              {utilizationPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {grid.systems.map((sys, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <span className="text-xs text-zinc-400">{sys.name}</span>
            <span className="text-xs font-bold text-orange-400">{sys.draw}kW</span>
          </div>
        ))}
      </div>
    </div>
  );
}