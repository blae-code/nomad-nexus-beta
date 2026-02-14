import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function CrewStatusBoard({ widgetId, onRemove, isDragging }) {
  const [crew, setCrew] = useState([]);

  useEffect(() => {
    loadCrew();
    const interval = setInterval(loadCrew, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadCrew = async () => {
    try {
      const presence = await base44.entities.UserPresence.filter({ status: 'online' }, '-last_activity', 10);
      setCrew(presence || []);
    } catch (err) {
      console.error('Crew load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(220,38,38,0.01)_0px,transparent_4px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Crew Board</span>
          <div className="px-1.5 py-0.5 rounded bg-green-950/40 text-green-400 text-[9px] font-bold">
            {crew.length}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {crew.map((member, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center justify-between hover:border-red-700/40 transition-colors">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                member.status === 'transmitting' ? 'bg-red-500' :
                member.status === 'in-call' ? 'bg-green-500' :
                'bg-zinc-600'
              } animate-pulse`} />
              <span className="text-xs text-zinc-300 font-mono">
                {member.member_profile_id?.substring(0, 12)}...
              </span>
            </div>
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
              {member.status}
            </span>
          </div>
        ))}
        {crew.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No crew online
          </div>
        )}
      </div>
    </div>
  );
}