import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Plus, X } from 'lucide-react';
import { createManagedVoiceNet, listManagedVoiceNets } from '@/components/voice/voiceNetGovernanceClient';

function defaultScopeForEvent(eventId) {
  return eventId ? 'temp_operation' : 'temp_adhoc';
}

export default function VoiceNetCreator({ eventId = null, onSuccess, onCreated, onCancel }) {
  const [form, setForm] = useState({
    code: '',
    label: '',
    type: 'squad',
    discipline: eventId ? 'focused' : 'casual',
    min_rank_to_tx: 'VAGRANT',
    min_rank_to_rx: 'VAGRANT',
    scope: defaultScopeForEvent(eventId),
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState({ canCreatePermanent: false });

  useEffect(() => {
    let mounted = true;
    listManagedVoiceNets({ eventId: eventId || null })
      .then((result) => {
        if (!mounted) return;
        setPolicy(result?.policy || {});
      })
      .catch(() => {
        if (!mounted) return;
        setPolicy({ canCreatePermanent: false });
      });
    return () => {
      mounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    setForm((prev) => ({
      ...prev,
      scope: 'temp_operation',
      discipline: prev.discipline || 'focused',
    }));
  }, [eventId]);

  const canSelectPermanent = Boolean(policy?.canCreatePermanent);
  const scopeLabel = useMemo(() => {
    if (form.scope === 'permanent') return 'Permanent';
    if (form.scope === 'temp_operation') return 'Operation Temporary';
    return 'Temporary';
  }, [form.scope]);

  const handleCreated = (payload) => {
    if (onCreated) onCreated(payload?.net || payload);
    if (onSuccess) onSuccess(payload?.net || payload);
  };

  const submitCreateVoiceNet = async () => {
    if (!form.code.trim() || !form.label.trim()) return;

    setCreating(true);
    setError('');
    try {
      const scope = eventId ? 'temp_operation' : form.scope;
      if (scope === 'permanent' && !canSelectPermanent) {
        setError('Permanent nets require System Admin or Pioneer authority.');
        setCreating(false);
        return;
      }

      const payload = await createManagedVoiceNet({
        eventId: eventId || undefined,
        scope,
        temporary: scope !== 'permanent',
        code: form.code,
        label: form.label,
        type: form.type,
        discipline: form.discipline,
        min_rank_to_tx: form.min_rank_to_tx,
        min_rank_to_rx: form.min_rank_to_rx,
        priority: form.type === 'command' ? 1 : form.type === 'squad' ? 2 : 3,
      });

      handleCreated(payload);
    } catch (err) {
      const blocked = err?.blockedReason ? ` (${err.blockedReason})` : '';
      setError(`${err?.message || 'Failed to create voice net'}${blocked}`);
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
        {!eventId ? (
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Lifecycle Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              <option value="temp_adhoc">Temporary (ad hoc)</option>
              <option value="permanent" disabled={!canSelectPermanent}>
                Permanent {canSelectPermanent ? '' : '(Admin/Pioneer required)'}
              </option>
            </select>
          </div>
        ) : (
          <div className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-1.5 text-xs text-zinc-300">
            Scope: Operation temporary channel
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Net Code (e.g., ALPHA, COMMAND)</label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="ALPHA"
            className="uppercase"
            maxLength={24}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">Net Name</label>
          <Input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Alpha Squad Channel"
            maxLength={80}
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
            <p><strong>Scope:</strong> {scopeLabel}</p>
            <p><strong>Type:</strong> Command (priority 1), Squad (priority 2), Support/General (priority 3)</p>
          </div>
        </div>

        {error ? <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded px-2 py-1">{error}</div> : null}

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={creating}>
              Cancel
            </Button>
          )}
          <Button onClick={submitCreateVoiceNet} disabled={creating || !form.code.trim() || !form.label.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Voice Net'}
          </Button>
        </div>
      </div>
    </div>
  );
}
