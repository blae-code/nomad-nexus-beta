import React, { useState, useEffect } from 'react';
import { DollarSign, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EconomyPulseMonitor({ widgetId, onRemove, isDragging }) {
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    generateMarkets();
    const interval = setInterval(generateMarkets, 12000);
    return () => clearInterval(interval);
  }, []);

  const generateMarkets = () => {
    const commodities = ['Titanium', 'Hydrogen', 'Laranite', 'Medical', 'Weapons'];
    setMarkets(commodities.map(c => ({
      name: c,
      price: Math.floor(1000 + Math.random() * 5000),
      change: (Math.random() * 20 - 10).toFixed(1),
      volume: Math.floor(100 + Math.random() * 900)
    })));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.01)_0px,transparent_3px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Economy Pulse</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {markets.map((market, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-bold text-zinc-300">{market.name}</div>
              <div className="text-[9px] text-zinc-600 font-mono">{market.price} aUEC</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600">{market.volume}k vol</span>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                parseFloat(market.change) > 0 ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'
              }`}>
                {parseFloat(market.change) > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                <span className="text-[9px] font-bold">{market.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex gap-2 relative z-10">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Trade Routes
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Alerts
        </Button>
      </div>
    </div>
  );
}