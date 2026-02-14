import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, X, Shield, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function SquadronCommandMatrix({ widgetId, onRemove, isDragging }) {
  const [squads, setSquads] = useState([]);

  useEffect(() => {
    loadSquads();
  }, []);

  const loadSquads = async () => {
    try {
      const data = await base44.entities.Squad.list('-updated_date', 8);
      setSquads(data || []);
    } catch (err) {
      console.error('Squads load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.02)_25%,transparent_25%)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Squadron Matrix</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {squads.map((squad, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 hover:border-red-700/60 rounded cursor-pointer transition-all group">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full ${
                  squad.hierarchy_level === 'fleet' ? 'bg-red-500' :
                  squad.hierarchy_level === 'wing' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
                <span className="text-xs font-bold text-zinc-300 group-hover:text-red-300">{squad.name}</span>
              </div>
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
                {squad.hierarchy_level}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <UsersIcon className="w-2.5 h-2.5" />
                {Math.floor(Math.random() * 15) + 5}
              </span>
              {squad.icon && (
                <span className="flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" />
                  Active
                </span>
              )}
            </div>
          </div>
        ))}
        {squads.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No squads available
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          Org Chart View
        </Button>
      </div>
    </div>
  );
}