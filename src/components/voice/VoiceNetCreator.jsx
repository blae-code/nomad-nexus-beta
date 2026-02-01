import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Plus, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function VoiceNetCreator({ onSuccess, onCancel }) {
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const [form, setForm] = useState({
    code: '',
    label: '',
    type: 'squad',
    discipline: 'casual',
    min_rank_to_tx: 'VAGRANT',
    min_rank_to_rx: 'VAGRANT',
  });
  const [creating, setCreating] = useState(false);

  const createVoiceNet = async () => {
    if (!form.code.trim() || !form.label.trim()) return;

    setCreating(true);
    try {
      const netData = {
        code: form.code.toUpperCase().trim(),
        label: form.label.trim(),
        type: form.type,
        discipline: form.discipline,
        min_rank_to_tx: form.min_rank_to_tx,
        min_rank_to_rx: form.min_rank_to_rx,
        status: 'active',
        priority: form.type === 'command' ? 1 : form.type === 'squad' ? 2 : 3,
      };

      await base44.entities.VoiceNet.create(netData);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      alert(`Failed to create voice net: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-white uppercase">Create Voice Net</h3>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Net Code (e.g., ALPHA, COMMAND)</label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="ALPHA"
            className="uppercase"
            maxLength={20}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Net Name</label>
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Alpha Squad Channel"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              <option value="command">Command</option>
              <option value="squad">Squad</option>
              <option value="support">Support</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Discipline</label>
            <select
              value={form.discipline}
              onChange={(e) => setForm({ ...form, discipline: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              <option value="casual">Casual</option>
              <option value="focused">Focused</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Min Rank to Transmit</label>
            <select
              value={form.min_rank_to_tx}
              onChange={(e) => setForm({ ...form, min_rank_to_tx: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              <option value="VAGRANT">Vagrant</option>
              <option value="SCOUT">Scout</option>
              <option value="VOYAGER">Voyager</option>
              <option value="PIONEER">Pioneer</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Min Rank to Receive</label>
            <select
              value={form.min_rank_to_rx}
              onChange={(e) => setForm({ ...form, min_rank_to_rx: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              <option value="VAGRANT">Vagrant</option>
              <option value="SCOUT">Scout</option>
              <option value="VOYAGER">Voyager</option>
              <option value="PIONEER">Pioneer</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 space-y-1 mb-3">
            <p><strong>Type:</strong> Command (priority 1), Squad (priority 2), Support/General (priority 3)</p>
            <p><strong>Discipline:</strong> Casual = open access. Focused = requires Member+ membership</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={creating}>
              Cancel
            </Button>
          )}
          <Button onClick={createVoiceNet} disabled={creating || !form.code.trim() || !form.label.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Voice Net'}
          </Button>
        </div>
      </div>
    </div>
  );
}