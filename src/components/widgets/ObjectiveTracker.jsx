import React, { useState, useEffect } from 'react';
import { Target, X, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ObjectiveTracker({ widgetId, onRemove, isDragging }) {
  const [objectives, setObjectives] = useState([]);

  useEffect(() => {
    loadObjectives();
  }, []);

  const loadObjectives = async () => {
    try {
      const events = await base44.entities.Event.filter({ status: 'active' }, '-updated_date', 1);
      if (events[0]?.objectives) {
        setObjectives(events[0].objectives);
      }
    } catch (err) {
      console.error('Objectives load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.015)_0px,transparent_3px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Objectives</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {objectives.map((obj, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-start gap-2">
              {obj.is_completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-xs font-semibold ${obj.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                  {obj.text}
                </p>
                {obj.sub_tasks && obj.sub_tasks.length > 0 && (
                  <div className="mt-1.5 ml-2 space-y-1">
                    {obj.sub_tasks.map((sub, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[10px]">
                        {sub.is_completed ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-zinc-700" />
                        )}
                        <span className={sub.is_completed ? 'text-zinc-700 line-through' : 'text-zinc-500'}>
                          {sub.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {objectives.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No active objectives
          </div>
        )}
      </div>
    </div>
  );
}