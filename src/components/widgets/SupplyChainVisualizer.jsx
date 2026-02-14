import React, { useState } from 'react';
import { Package, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SupplyChainVisualizer({ widgetId, onRemove, isDragging }) {
  const chain = [
    { node: 'Origin', status: 'complete', items: 150 },
    { node: 'Transit', status: 'active', items: 120 },
    { node: 'Hub', status: 'pending', items: 0 },
    { node: 'Destination', status: 'pending', items: 0 }
  ];

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.015)_0px,transparent_12px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Supply Chain</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full space-y-3">
          {chain.map((node, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  node.status === 'complete' ? 'border-green-500 bg-green-500/30' :
                  node.status === 'active' ? 'border-orange-500 bg-orange-500/30 animate-pulse' :
                  'border-zinc-700 bg-zinc-700/30'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">{node.node}</span>
                    <span className="text-[9px] text-zinc-600">{node.items} units</span>
                  </div>
                </div>
              </div>
              {i < chain.length - 1 && (
                <div className="flex items-center ml-1.5">
                  <ArrowRight className="w-3 h-3 text-red-700/40" />
                  <div className="flex-1 h-px bg-red-700/20 mx-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex justify-between text-[9px] text-zinc-500 relative z-10">
        <span>ETA: 2h 15m</span>
        <span>On Schedule</span>
      </div>
    </div>
  );
}