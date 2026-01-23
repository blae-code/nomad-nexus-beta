import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function BriefObjectivesStep({ briefData, onChange }) {
  const [objectives, setObjectives] = useState(briefData.objectives || []);
  const [newObj, setNewObj] = useState('');

  const handleAdd = () => {
    if (newObj.trim()) {
      const updated = [...objectives, { id: Date.now(), text: newObj, is_completed: false }];
      setObjectives(updated);
      onChange({ objectives: updated });
      setNewObj('');
    }
  };

  const handleRemove = (id) => {
    const updated = objectives.filter(o => o.id !== id);
    setObjectives(updated);
    onChange({ objectives: updated });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex gap-1">
        <input
          type="text"
          value={newObj}
          onChange={(e) => setNewObj(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add objective..."
          className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-[8px] font-mono focus:outline-none focus:border-[#ea580c] rounded-none"
        />
        <Button onClick={handleAdd} size="sm" className="bg-[#ea580c] h-8 px-2 text-[8px]">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {objectives.map(obj => (
          <div key={obj.id} className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800 text-[8px]">
            <span className="text-zinc-300">{obj.text}</span>
            <button
              onClick={() => handleRemove(obj.id)}
              className="text-red-500 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[8px] text-zinc-500">{objectives.length} objectives defined.</p>
    </div>
  );
}