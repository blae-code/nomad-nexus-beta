import React, { useState } from 'react';
import { Wrench, X, Shield, Zap, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShipLoadoutDesigner({ widgetId, onRemove, isDragging }) {
  const [loadout, setLoadout] = useState({
    weapons: 2,
    shields: 1,
    engines: 1,
    cargo: 0
  });

  const maxSlots = 6;
  const usedSlots = Object.values(loadout).reduce((sum, v) => sum + v, 0);

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(220,38,38,0.015)_0px,transparent_5px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Loadout</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
        <div className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Slot Usage</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${usedSlots > maxSlots ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${(usedSlots / maxSlots) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-orange-400">{usedSlots}/{maxSlots}</span>
          </div>
        </div>

        {[
          { key: 'weapons', label: 'Weapons', icon: Zap },
          { key: 'shields', label: 'Shields', icon: Shield },
          { key: 'engines', label: 'Engines', icon: Zap },
          { key: 'cargo', label: 'Cargo', icon: Box }
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-3 h-3 text-zinc-500" />
                <span className="text-xs text-zinc-300">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLoadout({...loadout, [item.key]: Math.max(0, loadout[item.key] - 1)})}
                  className="h-5 w-5 text-zinc-600 hover:text-red-400"
                >
                  -
                </Button>
                <span className="text-xs font-bold text-orange-400 w-4 text-center">{loadout[item.key]}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLoadout({...loadout, [item.key]: loadout[item.key] + 1})}
                  className="h-5 w-5 text-zinc-600 hover:text-red-400"
                  disabled={usedSlots >= maxSlots}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Save Loadout
        </Button>
      </div>
    </div>
  );
}