import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function BriefSquadsStep({ briefData, onChange }) {
  const [assignments, setAssignments] = useState(briefData.squads_assignments || []);
  const [selectedSquad, setSelectedSquad] = useState('');

  const { data: squads = [] } = useQuery({
    queryKey: ['brief-squads'],
    queryFn: () => base44.entities.Squad.list('-updated_date', 20)
  });

  const handleAddSquad = () => {
    if (selectedSquad) {
      const squad = squads.find(s => s.id === selectedSquad);
      if (squad) {
        const updated = [...assignments, { squad_id: squad.id, squad_name: squad.name, assigned_users: [] }];
        setAssignments(updated);
        onChange({ squads_assignments: updated });
        setSelectedSquad('');
      }
    }
  };

  const handleRemoveSquad = (squadId) => {
    const updated = assignments.filter(a => a.squad_id !== squadId);
    setAssignments(updated);
    onChange({ squads_assignments: updated });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex gap-1">
        <select
          value={selectedSquad}
          onChange={(e) => setSelectedSquad(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-[8px] font-mono focus:outline-none focus:border-[#ea580c] rounded-none"
        >
          <option value="">Select squad...</option>
          {squads.map(squad => (
            <option key={squad.id} value={squad.id}>{squad.name}</option>
          ))}
        </select>
        <Button onClick={handleAddSquad} size="sm" className="bg-[#ea580c] h-8 px-2 text-[8px]">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {assignments.map(assign => (
          <div key={assign.squad_id} className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800">
            <span className="text-[8px] text-zinc-300 font-mono">{assign.squad_name}</span>
            <button
              onClick={() => handleRemoveSquad(assign.squad_id)}
              className="text-red-500 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[8px] text-zinc-500">{assignments.length} squads assigned.</p>
    </div>
  );
}