import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';

export default function OperationPlanner({ eventId }) {
  const [objective, setObjective] = useState('');
  const [roles, setRoles] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runPlanner = async () => {
    if (!objective.trim()) return;
    setLoading(true);
    try {
      const response = await base44.functions.invoke('planOperation', {
        objective: objective.trim(),
        eventId,
        requiredRoles: roles.split(',').map((r) => r.trim()).filter(Boolean),
      });
      setResult(response?.data?.plan || response?.data || null);
    } catch (error) {
      console.error('Operation planner failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Objective (e.g., Assault bunker, escort convoy...)"
          className="min-h-[80px]"
        />
        <Input
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
          placeholder="Required roles (comma-separated)"
        />
        <Button onClick={runPlanner} disabled={!objective.trim() || loading} className="w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Planning...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Generate Plan</>
          )}
        </Button>
      </div>

      {result && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500">AI Plan Output</div>
          <div className="text-xs text-zinc-300">Route Plan: {result.route_plan || '—'}</div>
          {Array.isArray(result.recommended_fleet) && result.recommended_fleet.length > 0 && (
            <div>
              <div className="text-[10px] text-orange-400 uppercase">Recommended Fleet</div>
              <div className="flex flex-wrap gap-2">
                {result.recommended_fleet.map((item, idx) => (
                  <span key={`${item}-${idx}`} className="text-[10px] text-zinc-300 border border-zinc-700 px-2 py-1 rounded">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(result.recommended_roles) && result.recommended_roles.length > 0 && (
            <div>
              <div className="text-[10px] text-cyan-400 uppercase">Recommended Roles</div>
              <div className="flex flex-wrap gap-2">
                {result.recommended_roles.map((item, idx) => (
                  <span key={`${item}-${idx}`} className="text-[10px] text-zinc-300 border border-zinc-700 px-2 py-1 rounded">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(result.skill_gaps) && result.skill_gaps.length > 0 && (
            <div>
              <div className="text-[10px] text-red-400 uppercase">Skill Gaps</div>
              <div className="flex flex-wrap gap-2">
                {result.skill_gaps.map((item, idx) => (
                  <span key={`${item}-${idx}`} className="text-[10px] text-red-300 border border-red-500/30 px-2 py-1 rounded">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(result.risk_notes) && result.risk_notes.length > 0 && (
            <div>
              <div className="text-[10px] text-yellow-400 uppercase">Risk Notes</div>
              <ul className="text-xs text-zinc-300 list-disc list-inside">
                {result.risk_notes.map((note, idx) => (
                  <li key={`${note}-${idx}`}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
