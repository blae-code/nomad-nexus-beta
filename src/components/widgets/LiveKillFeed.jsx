import React, { useState, useEffect } from 'react';
import { Skull, X, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveKillFeed({ widgetId, onRemove, isDragging }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    simulateFeed();
    const interval = setInterval(() => {
      setFeed(prev => {
        const callsigns = ['ALPHA-1', 'BRAVO-3', 'CHARLIE-5', 'DELTA-2'];
        const newEntry = {
          id: Date.now(),
          attacker: callsigns[Math.floor(Math.random() * callsigns.length)],
          victim: callsigns[Math.floor(Math.random() * callsigns.length)],
          weapon: ['Ballistic', 'Energy', 'Missile'][Math.floor(Math.random() * 3)],
          time: new Date()
        };
        return [newEntry, ...prev].slice(0, 20);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const simulateFeed = () => {
    const initial = [];
    for (let i = 0; i < 5; i++) {
      initial.push({
        id: Date.now() - i * 1000,
        attacker: 'ALPHA-1',
        victim: 'HOSTILE-' + (i + 1),
        weapon: 'Ballistic',
        time: new Date(Date.now() - i * 60000)
      });
    }
    setFeed(initial);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.015)_0px,transparent_2px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Skull className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Kill Feed</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {feed.map(entry => (
          <div key={entry.id} className="p-1.5 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center gap-2 text-[10px] animate-in slide-in-from-top duration-200">
            <span className="text-green-400 font-bold font-mono">{entry.attacker}</span>
            <Crosshair className="w-2.5 h-2.5 text-red-500" />
            <span className="text-red-400 font-bold font-mono">{entry.victim}</span>
            <span className="text-zinc-600 text-[9px] ml-auto">{entry.weapon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}