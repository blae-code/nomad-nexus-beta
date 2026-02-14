import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Crosshair, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SectorThreatAnalyzer({ widgetId, onRemove, isDragging }) {
  const [threats, setThreats] = useState([]);
  const [heatMap, setHeatMap] = useState([]);

  useEffect(() => {
    generateThreats();
    const interval = setInterval(generateThreats, 12000);
    return () => clearInterval(interval);
  }, []);

  const generateThreats = () => {
    const t = [];
    for (let i = 0; i < 5; i++) {
      t.push({
        id: i,
        sector: `SEC-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9)}`,
        risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
        x: Math.random() * 100,
        y: Math.random() * 100
      });
    }
    setThreats(t);
    
    const heat = [];
    for (let i = 0; i < 25; i++) {
      heat.push({ id: i, intensity: Math.random() });
    }
    setHeatMap(heat);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,rgba(220,38,38,0.03)_0px,transparent_20px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Threat Analysis</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-px p-2">
          {heatMap.map((cell, i) => (
            <div
              key={i}
              className="rounded-sm transition-all"
              style={{
                backgroundColor: `rgba(220, 38, 38, ${cell.intensity * 0.4})`
              }}
            />
          ))}
        </div>

        {threats.map(threat => (
          <div
            key={threat.id}
            className="absolute w-8 h-8 -ml-4 -mt-4"
            style={{ left: `${threat.x}%`, top: `${threat.y}%` }}
          >
            <div className={`w-full h-full rounded-full border-2 flex items-center justify-center ${
              threat.risk === 'CRITICAL' ? 'border-red-500 bg-red-500/30 animate-pulse' :
              threat.risk === 'HIGH' ? 'border-orange-500 bg-orange-500/30' :
              threat.risk === 'MEDIUM' ? 'border-yellow-500 bg-yellow-500/30' :
              'border-zinc-500 bg-zinc-500/30'
            }`}>
              <AlertTriangle className={`w-3 h-3 ${
                threat.risk === 'CRITICAL' ? 'text-red-500' :
                threat.risk === 'HIGH' ? 'text-orange-500' :
                threat.risk === 'MEDIUM' ? 'text-yellow-500' : 'text-zinc-500'
              }`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm space-y-1 relative z-10">
        {threats.slice(0, 3).map(t => (
          <div key={t.id} className="flex items-center justify-between text-[9px]">
            <span className="text-zinc-400 font-mono">{t.sector}</span>
            <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${
              t.risk === 'CRITICAL' ? 'bg-red-950/40 text-red-400' :
              t.risk === 'HIGH' ? 'bg-orange-950/40 text-orange-400' :
              t.risk === 'MEDIUM' ? 'bg-yellow-950/40 text-yellow-400' :
              'bg-zinc-900/40 text-zinc-500'
            }`}>
              {t.risk}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}