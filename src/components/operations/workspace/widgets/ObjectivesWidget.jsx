import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ObjectivesWidget({ operation, user, isCommandRole, onDragStart }) {
  const [newObjective, setNewObjective] = useState('');

  const updateObjectiveMutation = useMutation({
    mutationFn: (updatedObjectives) => {
      return base44.entities.OpsSession.update(operation.id, {
        brief_artifact: {
          ...operation.brief_artifact,
          objectives: updatedObjectives
        }
      });
    }
  });

  const objectives = operation?.brief_artifact?.objectives || [];
  const completedCount = objectives.filter(o => o.is_completed).length;
  const progressPercent = objectives.length > 0 ? Math.round((completedCount / objectives.length) * 100) : 0;

  const handleToggleObjective = (id) => {
    const updated = objectives.map(o =>
      o.id === id ? { ...o, is_completed: !o.is_completed } : o
    );
    updateObjectiveMutation.mutate(updated);
  };

  const handleAddObjective = () => {
    if (!newObjective.trim() || !isCommandRole) return;
    const updated = [
      ...objectives,
      {
        id: `obj_${Date.now()}`,
        text: newObjective,
        is_completed: false
      }
    ];
    updateObjectiveMutation.mutate(updated);
    setNewObjective('');
  };

  const handleRemoveObjective = (id) => {
    if (!isCommandRole) return;
    const updated = objectives.filter(o => o.id !== id);
    updateObjectiveMutation.mutate(updated);
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Header with progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[9px] font-bold uppercase text-zinc-300">Objectives</h3>
          <span className="text-[8px] text-zinc-500">{completedCount}/{objectives.length}</span>
        </div>
        <div className="h-1.5 bg-zinc-800/50 border border-zinc-700/50">
          <div
            className="h-full bg-emerald-600/70 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Objectives List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {objectives.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No objectives assigned</p>
        ) : (
          objectives.map(obj => (
            <div
              key={obj.id}
              draggable={isCommandRole}
              onDragStart={(e) => onDragStart?.(e, { type: 'objective', data: obj })}
              className={cn(
                'flex items-start gap-2 p-1.5 rounded-none border text-[8px] cursor-grab active:cursor-grabbing',
                obj.is_completed
                  ? 'bg-zinc-900/30 border-zinc-700/30 text-zinc-500 line-through'
                  : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/50'
              )}
            >
              <button
                onClick={() => handleToggleObjective(obj.id)}
                disabled={updateObjectiveMutation.isPending}
                className="shrink-0 mt-0.5 text-current hover:text-emerald-400 transition-colors"
              >
                {obj.is_completed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </button>
              <span className="flex-1">{obj.text}</span>
              {isCommandRole && (
                <button
                  onClick={() => handleRemoveObjective(obj.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new objective */}
      {isCommandRole && (
        <div className="border-t border-zinc-800 pt-1.5 space-y-1">
          <input
            type="text"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
            placeholder="Add objective..."
            className="w-full px-2 py-1 bg-zinc-800/50 border border-zinc-700 text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
          />
          <button
            onClick={handleAddObjective}
            disabled={!newObjective.trim() || updateObjectiveMutation.isPending}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-2.5 h-2.5" />
            ADD
          </button>
        </div>
      )}
    </div>
  );
}