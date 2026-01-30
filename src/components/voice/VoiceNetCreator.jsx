import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Users, Shield, Target } from 'lucide-react';

export default function VoiceNetCreator({ eventId = null, onCreated, onCancel }) {
  const [form, setForm] = useState({
    code: '',
    label: '',
    type: 'squad',
    discipline: 'casual',
    stage_mode: false,
    priority: 2,
    min_rank_to_tx: 'VAGRANT',
    min_rank_to_rx: 'VAGRANT',
  });

  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.label.trim()) return;

    setCreating(true);
    try {
      const newNet = await base44.entities.VoiceNet.create({
        ...form,
        event_id: eventId,
        status: 'active',
        code: form.code.toUpperCase().replace(/\s+/g, '_'),
      });

      if (onCreated) onCreated(newNet);
    } catch (error) {
      console.error('Failed to create voice net:', error);
    } finally {
      setCreating(false);
    }
  };

  const typeOptions = [
    { value: 'command', label: 'Command', icon: Shield, desc: 'Leadership and coordination' },
    { value: 'squad', label: 'Squad', icon: Users, desc: 'Team operations' },
    { value: 'support', label: 'Support', icon: Target, desc: 'Medical, logistics, recon' },
    { value: 'general', label: 'General', icon: Radio, desc: 'Open communications' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block uppercase font-bold">Code</label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="ALPHA, BRAVO, RESCUE..."
            className="font-mono uppercase"
          />
          <div className="text-[10px] text-zinc-500 mt-1">Designator code (e.g., ALPHA, COMMAND)</div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block uppercase font-bold">Label</label>
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ground Team A..."
          />
          <div className="text-[10px] text-zinc-500 mt-1">Human-readable name</div>
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-2 block uppercase font-bold">Net Type</label>
        <div className="grid grid-cols-4 gap-2">
          {typeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = form.type === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`p-3 border rounded text-left transition-all ${
                  isSelected
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-orange-500/50'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-orange-400' : 'text-zinc-400'}`} />
                <div className="text-xs font-bold text-white">{opt.label}</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block uppercase font-bold">Discipline</label>
          <div className="flex gap-2">
            <button
              onClick={() => setForm({ ...form, discipline: 'casual' })}
              className={`flex-1 px-3 py-2 border rounded text-xs font-bold transition-all ${
                form.discipline === 'casual'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-blue-500/50'
              }`}
            >
              Casual
            </button>
            <button
              onClick={() => setForm({ ...form, discipline: 'focused' })}
              className={`flex-1 px-3 py-2 border rounded text-xs font-bold transition-all ${
                form.discipline === 'focused'
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-orange-500/50'
              }`}
            >
              Focused
            </button>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {form.discipline === 'casual' ? 'Open access, minimal gating' : 'Rank enforcement, disciplined comms'}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block uppercase font-bold">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm p-2 rounded"
          >
            <option value={1}>1 - Highest (Command)</option>
            <option value={2}>2 - Normal</option>
            <option value={3}>3 - Low (Chatter)</option>
          </select>
          <div className="text-[10px] text-zinc-500 mt-1">Audio priority level</div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded">
        <input
          type="checkbox"
          id="stage-mode"
          checked={form.stage_mode}
          onChange={(e) => setForm({ ...form, stage_mode: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="stage-mode" className="flex-1 text-xs text-zinc-300">
          <span className="font-bold text-white">Stage Mode</span>
          <div className="text-zinc-500 mt-0.5">Only commanders can grant transmit permission (users must hail)</div>
        </label>
      </div>

      {eventId && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
          ℹ️ This voice net will be linked to the current operation and cleaned up after debrief.
        </div>
      )}

      <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={creating}>
            Cancel
          </Button>
        )}
        <Button onClick={handleCreate} disabled={creating || !form.code.trim() || !form.label.trim()}>
          {creating ? 'Creating...' : 'Create Voice Net'}
        </Button>
      </div>
    </div>
  );
}