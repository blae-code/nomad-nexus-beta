import React, { useState, useEffect } from 'react';
import { Cloud, X, Thermometer, Wind, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EnvironmentalScanner({ widgetId, onRemove, isDragging }) {
  const [env, setEnv] = useState({
    temp: 0,
    pressure: 0,
    humidity: 0,
    radiation: 0,
    wind: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setEnv({
        temp: Math.floor(-50 + Math.random() * 100),
        pressure: Math.floor(800 + Math.random() * 300),
        humidity: Math.floor(Math.random() * 100),
        radiation: Math.floor(Math.random() * 50),
        wind: Math.floor(Math.random() * 80)
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(220,38,38,0.01)_0px,transparent_3px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Environment</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 p-3 space-y-2 relative z-10">
        {[
          { label: 'Temperature', value: `${env.temp}°C`, icon: Thermometer, color: env.temp > 30 ? 'text-red-500' : env.temp < 0 ? 'text-cyan-500' : 'text-zinc-500' },
          { label: 'Pressure', value: `${env.pressure} hPa`, icon: Cloud, color: 'text-zinc-500' },
          { label: 'Humidity', value: `${env.humidity}%`, icon: Droplets, color: 'text-cyan-500' },
          { label: 'Wind Speed', value: `${env.wind} km/h`, icon: Wind, color: env.wind > 60 ? 'text-orange-500' : 'text-zinc-500' }
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-3 h-3 ${metric.color}`} />
                <span className="text-xs text-zinc-400">{metric.label}</span>
              </div>
              <span className={`text-xs font-bold ${metric.color}`}>{metric.value}</span>
            </div>
          );
        })}

        {env.radiation > 30 && (
          <div className="p-2 bg-red-950/30 border border-red-700/60 rounded flex items-center gap-2 animate-pulse">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-red-400 font-bold uppercase">High Radiation: {env.radiation} rads</span>
          </div>
        )}
      </div>
    </div>
  );
}