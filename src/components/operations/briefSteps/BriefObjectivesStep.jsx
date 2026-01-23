import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';

export default function BriefObjectivesStep({ briefData, onChange }) {
  const [newObj, setNewObj] = useState('');

  const objectives = briefData.objectives || [];

  const handleAdd = () => {
    if (!newObj.trim()) return;
    onChange({
      objectives: [...objectives, { id: Date.now(), text: newObj, is_completed: false }]
    });
    setNewObj('');
  };

  const handleRemove = (id) => {
    onChange({
      objectives: objectives.filter(o => o.id !== id)
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
          Add Objective
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newObj}
            onChange={(e) => setNewObj(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g., Secure perimeter, extract team"
            className="flex-1 px-2 py-2 bg-zinc-900/50 border border-zinc-800 text-[9px] rounded-none focus:outline-none focus:border-[#ea580c] text-zinc-200"
          />
          <Button
            onClick={handleAdd}
            size="sm"
            className="bg-[#ea580c] hover:bg-[#ea580c]/80 h-8 px-2"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {objectives.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic py-4 text-center">
            No objectives added yet
          </p>
        ) : (
          objectives.map(obj => (
            <div
              key={obj.id}
              className="flex items-center justify-between gap-2 p-2 bg-zinc-900/30 border border-zinc-800"
            >
              <span className="text-[9px] text-zinc-300 flex-1">{obj.text}</span>
              <button
                onClick={() => handleRemove(obj.id)}
                className="p-1 hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[8px] text-zinc-500">
        Step 2 of 6: Define primary objectives. These will guide tactical decisions.
      </p>
    </div>
  );
}