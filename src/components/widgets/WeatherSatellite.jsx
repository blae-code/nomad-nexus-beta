import React, { useState, useEffect } from 'react';
import { CloudRain, X, Wind, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WeatherSatellite({ widgetId, onRemove, isDragging }) {
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    generateForecast();
  }, []);

  const generateForecast = () => {
    const locations = ['Stanton I', 'MicroTech', 'Crusader', 'Hurston'];
    setForecast(locations.map(loc => ({
      location: loc,
      condition: ['Clear', 'Cloudy', 'Storm', 'Hazardous'][Math.floor(Math.random() * 4)],
      temp: Math.floor(-20 + Math.random() * 60),
      wind: Math.floor(Math.random() * 100)
    })));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.01)_0px,transparent_10px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Weather Sat</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {forecast.map((f, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-300">{f.location}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                f.condition === 'Hazardous' ? 'bg-red-950/40 text-red-400' : 'bg-zinc-900/40 text-zinc-500'
              }`}>
                {f.condition}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Snowflake className="w-2.5 h-2.5" />
                {f.temp}°C
              </span>
              <span className="flex items-center gap-1">
                <Wind className="w-2.5 h-2.5" />
                {f.wind} km/h
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}