import React, { useState, useEffect } from 'react';
import { Radar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveThreatRadar({ widgetId, onRemove, isDragging }) {
  const [contacts, setContacts] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    generateContacts();
    const interval = setInterval(() => setSweepAngle(a => (a + 2) % 360), 50);
    return () => clearInterval(interval);
  }, []);

  const generateContacts = () => {
    const c = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * 360;
      const distance = 30 + Math.random() * 60;
      c.push({
        id: i,
        angle,
        distance,
        type: ['friendly', 'hostile', 'unknown'][Math.floor(Math.random() * 3)]
      });
    }
    setContacts(c);
  };

  return (
    <div className="h-full flex flex-col bg-black/98 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.06),transparent_70%)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Threat Radar</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Radar circles */}
          <div className="absolute inset-0 border border-red-700/20 rounded-full" />
          <div className="absolute inset-8 border border-red-700/15 rounded-full" />
          <div className="absolute inset-16 border border-red-700/10 rounded-full" />
          
          {/* Center point */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>

          {/* Sweep line */}
          <div
            className="absolute inset-0 flex items-center justify-center origin-center transition-transform duration-50"
            style={{ transform: `rotate(${sweepAngle}deg)` }}
          >
            <div className="w-0.5 h-full bg-gradient-to-t from-red-500/0 via-red-500/60 to-red-500" />
          </div>

          {/* Contacts */}
          {contacts.map(contact => {
            const rad = (contact.angle * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * (contact.distance / 2);
            const y = 50 + Math.sin(rad) * (contact.distance / 2);
            
            return (
              <div
                key={contact.id}
                className="absolute w-2 h-2 -ml-1 -mt-1"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={`w-full h-full rounded-full ${
                  contact.type === 'friendly' ? 'bg-green-500 border border-green-400' :
                  contact.type === 'hostile' ? 'bg-red-500 border border-red-400 animate-pulse' :
                  'bg-yellow-500 border border-yellow-400'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex justify-between text-[9px] text-zinc-500 relative z-10">
        <span>{contacts.length} Contacts</span>
        <span>Range: 100km</span>
      </div>
    </div>
  );
}