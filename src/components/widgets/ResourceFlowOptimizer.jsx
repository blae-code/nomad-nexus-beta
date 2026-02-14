import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ResourceFlowOptimizer({ widgetId, onRemove, isDragging }) {
  const [flows, setFlows] = useState([]);

  useEffect(() => {
    generateFlows();
    const interval = setInterval(generateFlows, 10000);
    return () => clearInterval(interval);
  }, []);

  const generateFlows = () => {
    const resources = ['Fuel', 'Ammo', 'Medical', 'Parts', 'Food'];
    setFlows(resources.map((r, i) => ({
      name: r,
      rate: Math.floor(50 + Math.random() * 50),
      bottleneck: Math.random() > 0.7,
      efficiency: Math.floor(60 + Math.random() * 40)
    })));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,rgba(220,38,38,0.02)_0deg,transparent_45deg)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Resource Flow</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {flows.map((flow, i) => (
          <div key={i} className={`p-2 border rounded ${flow.bottleneck ? 'border-orange-700/60 bg-orange-950/20' : 'border-zinc-700/40 bg-zinc-900/40'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Package className={`w-3 h-3 ${flow.bottleneck ? 'text-orange-500' : 'text-zinc-500'}`} />
                <span className="text-xs font-bold text-zinc-300">{flow.name}</span>
                {flow.bottleneck && <AlertCircle className="w-3 h-3 text-orange-500" />}
              </div>
              <span className="text-[9px] text-zinc-600 font-mono">{flow.rate} u/h</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Efficiency</span>
              <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${flow.efficiency > 80 ? 'bg-green-500' : flow.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${flow.efficiency}%` }}
                />
              </div>
              <span className={`text-[9px] font-bold ${flow.efficiency > 80 ? 'text-green-400' : flow.efficiency > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {flow.efficiency}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Auto-Optimize Routes
        </Button>
      </div>
    </div>
  );
}