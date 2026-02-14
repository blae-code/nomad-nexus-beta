import React, { useState, useEffect } from 'react';
import { Map, X, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FourDBattlespaceVisualizer({ widgetId, onRemove, isDragging }) {
  const [playing, setPlaying] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setTimeline(t => (t + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, [playing]);

  // Simulate tactical markers
  useEffect(() => {
    const generateMarkers = () => {
      const m = [];
      for (let i = 0; i < 8; i++) {
        m.push({
          id: i,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          type: ['friendly', 'hostile', 'neutral'][Math.floor(Math.random() * 3)],
          velocity: Math.random() * 2 - 1,
        });
      }
      setMarkers(m);
    };
    generateMarkers();
  }, []);

  return (
    <div className="h-full flex flex-col bg-black/98 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />
      
      {/* Header */}
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">4D Battlespace</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Grid visualization */}
      <div className="flex-1 relative">
        {/* Grid background */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(220,38,38,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />

        {/* Tactical markers */}
        {markers.map(marker => {
          const animX = marker.x + marker.velocity * timeline;
          return (
            <div
              key={marker.id}
              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 transition-all duration-100"
              style={{
                left: `${animX}%`,
                top: `${marker.y}%`
              }}
            >
              <div className={`w-full h-full rounded-full border-2 ${
                marker.type === 'friendly' ? 'border-green-500 bg-green-500/30' :
                marker.type === 'hostile' ? 'border-red-500 bg-red-500/30' :
                'border-yellow-500 bg-yellow-500/30'
              } animate-pulse`} />
            </div>
          );
        })}

        {/* Trajectory lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {markers.map(m => (
            <line
              key={`line-${m.id}`}
              x1={`${m.x}%`}
              y1={`${m.y}%`}
              x2={`${m.x + m.velocity * 10}%`}
              y2={`${m.y}%`}
              stroke={m.type === 'friendly' ? 'rgb(34,197,94)' : m.type === 'hostile' ? 'rgb(239,68,68)' : 'rgb(234,179,8)'}
              strokeWidth="1"
              opacity="0.3"
              strokeDasharray="2,2"
            />
          ))}
        </svg>
      </div>

      {/* Timeline controls */}
      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm space-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPlaying(!playing)}
            className="h-7 w-7 border-red-700/40 hover:border-red-500/60"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all"
              style={{ width: `${timeline}%` }}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setTimeline(0)}
            className="h-7 w-7 border-red-700/40 hover:border-red-500/60"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        <div className="text-[9px] text-zinc-600 font-mono text-center uppercase tracking-wider">
          T+{Math.floor(timeline / 10)} MIN
        </div>
      </div>
    </div>
  );
}