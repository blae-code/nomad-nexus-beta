import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function BriefSquadsStep({ briefData, onChange }) {
  const [selectedSquad, setSelectedSquad] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const assignments = briefData.squads_assignments || [];

  const handleAdd = () => {
    if (!selectedSquad || !selectedRole) return;
    onChange({
      squads_assignments: [
        ...assignments,
        { id: Date.now(), squad_id: selectedSquad, role: selectedRole }
      ]
    });
    setSelectedSquad('');
    setSelectedRole('');
  };

  const handleRemove = (id) => {
    onChange({
      squads_assignments: assignments.filter(a => a.id !== id)
    });
  };

  const getSquadName = (id) => squads.find(s => s.id === id)?.name || 'Unknown Squad';

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
            Squad
          </label>
          <select
            value={selectedSquad}
            onChange={(e) => setSelectedSquad(e.target.value)}
            className="w-full px-2 py-2 bg-zinc-900/50 border border-zinc-800 text-[9px] rounded-none focus:outline-none focus:border-[#ea580c] text-zinc-200"
          >
            <option value="">Select Squad</option>
            {squads.map(sq => (
              <option key={sq.id} value={sq.id}>{sq.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
            Role Assignment
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-2 py-2 bg-zinc-900/50 border border-zinc-800 text-[9px] rounded-none focus:outline-none focus:border-[#ea580c] text-zinc-200"
          >
            <option value="">Select Role</option>
            <option value="Lead">Lead</option>
            <option value="Support">Support</option>
            <option value="Reserve">Reserve</option>
          </select>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!selectedSquad || !selectedRole}
          className="w-full bg-[#ea580c] hover:bg-[#ea580c]/80 h-8 text-[9px]"
        >
          <Plus className="w-3 h-3 mr-1" />
          ADD ASSIGNMENT
        </Button>
      </div>

      {/* Current Assignments */}
      <div className="space-y-1">
        {assignments.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic py-4 text-center">
            No squads assigned yet
          </p>
        ) : (
          assignments.map(assign => (
            <div
              key={assign.id}
              className="flex items-center justify-between gap-2 p-2 bg-zinc-900/30 border border-zinc-800"
            >
              <span className="text-[9px] text-zinc-300">
                <span className="font-bold">{getSquadName(assign.squad_id)}</span>
                <span className="text-zinc-600 mx-1">•</span>
                <span className="text-zinc-500">{assign.role}</span>
              </span>
              <button
                onClick={() => handleRemove(assign.id)}
                className="p-1 hover:bg-red-900/30"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[8px] text-zinc-500">
        Step 3 of 6: Assign squads and their roles (Lead, Support, Reserve).
      </p>
    </div>
  );
}