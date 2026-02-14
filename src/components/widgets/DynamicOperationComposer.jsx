import React, { useState } from 'react';
import { Calendar, X, Plus, Users as UsersIcon, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DynamicOperationComposer({ widgetId, onRemove, isDragging }) {
  const [draft, setDraft] = useState({ title: '', resources: [], crew: 0, ships: 0 });
  const [probability, setProbability] = useState(0);

  const calculate = () => {
    const base = draft.title.length > 0 ? 50 : 0;
    const resourceBonus = draft.resources.length * 10;
    const crewBonus = Math.min(draft.crew * 5, 25);
    setProbability(Math.min(base + resourceBonus + crewBonus, 100));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.02)_0px,rgba(220,38,38,0.02)_10px,transparent_10px,transparent_20px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Op Composer</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 relative z-10">
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block">Mission Title</label>
          <Input
            value={draft.title}
            onChange={(e) => { setDraft({...draft, title: e.target.value}); calculate(); }}
            placeholder="Operation name..."
            className="h-7 text-xs bg-zinc-900/60 border-zinc-700/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
              <UsersIcon className="w-2.5 h-2.5" /> Crew
            </label>
            <Input
              type="number"
              value={draft.crew}
              onChange={(e) => { setDraft({...draft, crew: parseInt(e.target.value) || 0}); calculate(); }}
              className="h-7 text-xs bg-zinc-900/60 border-zinc-700/60"
            />
          </div>
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Ship className="w-2.5 h-2.5" /> Ships
            </label>
            <Input
              type="number"
              value={draft.ships}
              onChange={(e) => { setDraft({...draft, ships: parseInt(e.target.value) || 0}); calculate(); }}
              className="h-7 text-xs bg-zinc-900/60 border-zinc-700/60"
            />
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded p-2">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">Success Probability</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${probability > 70 ? 'bg-green-500' : probability > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${probability}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${probability > 70 ? 'text-green-400' : probability > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {probability}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" className="w-full h-7 text-xs bg-red-600 hover:bg-red-500">
          <Plus className="w-3 h-3 mr-1" /> Create Operation
        </Button>
      </div>
    </div>
  );
}