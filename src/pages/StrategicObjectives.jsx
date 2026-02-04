import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Target, TrendingUp } from 'lucide-react';

const DEFAULT_FORM = {
  title: '',
  description: '',
  progress: 0,
  status: 'active',
  target_date: '',
};

export default function StrategicObjectives() {
  const [objectives, setObjectives] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const loadObjectives = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.StrategicObjective.list('-created_date', 200);
      setObjectives(list || []);
    } catch (error) {
      console.error('Failed to load objectives:', error);
      setSchemaMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjectives();
  }, []);

  const createObjective = async () => {
    if (!form.title.trim()) return;
    try {
      await base44.entities.StrategicObjective.create({
        title: form.title.trim(),
        description: form.description,
        progress: Number(form.progress) || 0,
        status: form.status,
        target_date: form.target_date || null,
      });
      setForm(DEFAULT_FORM);
      loadObjectives();
    } catch (error) {
      console.error('Failed to create objective:', error);
    }
  };

  const updateProgress = async (objectiveId, value) => {
    try {
      await base44.entities.StrategicObjective.update(objectiveId, { progress: value });
      loadObjectives();
    } catch (error) {
      console.error('Failed to update objective:', error);
    }
  };

  if (schemaMissing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 text-zinc-400">
          StrategicObjective entity missing. Add the schema in Base44 to enable objectives tracking.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Strategic Objectives</h1>
        <p className="text-zinc-400 text-sm">Define long-term goals and track progress</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Target className="w-3 h-3" />
              New Objective
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Objective title"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="min-h-[80px]"
            />
            <Input
              value={form.progress}
              onChange={(e) => setForm((prev) => ({ ...prev, progress: e.target.value }))}
              placeholder="Progress %"
            />
            <Input
              type="date"
              value={form.target_date}
              onChange={(e) => setForm((prev) => ({ ...prev, target_date: e.target.value }))}
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <Button onClick={createObjective} disabled={!form.title.trim()}>
              Create Objective
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500">Loading objectives...</div>
          ) : objectives.length === 0 ? (
            <div className="text-zinc-500">No objectives defined.</div>
          ) : (
            objectives.map((objective) => (
              <div key={objective.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{objective.title}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{objective.status}</div>
                  </div>
                  <div className="text-xs text-orange-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {objective.progress || 0}%
                  </div>
                </div>
                {objective.description && <div className="text-xs text-zinc-300">{objective.description}</div>}
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.max(0, Math.min(100, objective.progress || 0))}%` }} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateProgress(objective.id, Math.min(100, (objective.progress || 0) + 10))}>+10%</Button>
                  <Button size="sm" variant="outline" onClick={() => updateProgress(objective.id, Math.max(0, (objective.progress || 0) - 10))}>-10%</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
