import React, { useState, useEffect } from 'react';
import { Heart, X, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function BiometricCrewMonitor({ widgetId, onRemove, isDragging }) {
  const [crew, setCrew] = useState([]);

  useEffect(() => {
    loadCrew();
    const interval = setInterval(loadCrew, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCrew = async () => {
    try {
      const presence = await base44.entities.UserPresence.filter({ status: 'online' }, '-last_activity', 12);
      setCrew(presence.map(p => ({
        ...p,
        vitals: Math.floor(85 + Math.random() * 15),
        stress: Math.floor(Math.random() * 60),
        readiness: Math.floor(70 + Math.random() * 30)
      })));
    } catch (err) {
      console.error('Crew load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.02)_0px,rgba(220,38,38,0.02)_2px,transparent_2px,transparent_4px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Biometrics</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {crew.map((member, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-300">{member.member_profile_id?.substring(0, 8)}...</span>
              <div className={`w-2 h-2 rounded-full ${member.readiness > 80 ? 'bg-green-500' : member.readiness > 60 ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <div className="text-zinc-600 uppercase">Vitals</div>
                <div className="text-green-400 font-bold">{member.vitals}%</div>
              </div>
              <div>
                <div className="text-zinc-600 uppercase">Stress</div>
                <div className={`font-bold ${member.stress > 40 ? 'text-orange-400' : 'text-zinc-400'}`}>{member.stress}%</div>
              </div>
              <div>
                <div className="text-zinc-600 uppercase">Ready</div>
                <div className={`font-bold ${member.readiness > 80 ? 'text-green-400' : 'text-yellow-400'}`}>{member.readiness}%</div>
              </div>
            </div>
          </div>
        ))}
        {crew.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No crew data
          </div>
        )}
      </div>
    </div>
  );
}