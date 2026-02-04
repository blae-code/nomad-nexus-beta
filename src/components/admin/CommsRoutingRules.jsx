import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_CHANNEL_ROUTING } from '@/components/constants/channelRouting';
import { AlertTriangle, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

const normalizeTag = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const tag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return tag.toLowerCase();
};

const parseTargets = (value) => {
  if (!value) return [];
  const targets = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(targets));
};

const toTargetsInput = (targets) => (targets || []).join(', ');

export default function CommsRoutingRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ tag: '', targets: '' });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ tag: '', targets: '' });

  const hasEntity = Boolean(base44?.entities?.ChannelRoutingRule?.list);

  const loadRules = async () => {
    setLoading(true);
    setError(null);

    if (!hasEntity) {
      setSchemaMissing(true);
      setRules(DEFAULT_CHANNEL_ROUTING);
      setLoading(false);
      return;
    }

    try {
      const list = await base44.entities.ChannelRoutingRule.list();
      const normalized = (list || []).map((rule) => ({
        id: rule.id,
        tag: normalizeTag(rule.tag),
        targets: (rule.target_channel_names || []).map((name) => name.toLowerCase()),
      }));
      setRules(normalized);
      setSchemaMissing(false);
    } catch (err) {
      const message = err?.message || 'Failed to load routing rules.';
      setError(message);
      setSchemaMissing(true);
      setRules(DEFAULT_CHANNEL_ROUTING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreate = async () => {
    const tag = normalizeTag(draft.tag);
    const targets = parseTargets(draft.targets);

    if (!tag || targets.length === 0) {
      setError('Provide a #tag and at least one target channel.');
      return;
    }

    if (rules.some((rule) => rule.tag === tag)) {
      setError('That tag already exists.');
      return;
    }

    if (schemaMissing) return;

    try {
      setError(null);
      const created = await base44.entities.ChannelRoutingRule.create({
        tag,
        target_channel_names: targets,
      });
      setRules((prev) => [...prev, { id: created.id, tag, targets }]);
      setDraft({ tag: '', targets: '' });
    } catch (err) {
      setError(err?.message || 'Failed to create rule.');
    }
  };

  const beginEdit = (rule) => {
    setEditingId(rule.id);
    setEditDraft({ tag: rule.tag, targets: toTargetsInput(rule.targets) });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ tag: '', targets: '' });
  };

  const handleSave = async (ruleId) => {
    const tag = normalizeTag(editDraft.tag);
    const targets = parseTargets(editDraft.targets);

    if (!tag || targets.length === 0) {
      setError('Provide a #tag and at least one target channel.');
      return;
    }

    if (rules.some((rule) => rule.id !== ruleId && rule.tag === tag)) {
      setError('Another rule already uses that tag.');
      return;
    }

    try {
      setError(null);
      await base44.entities.ChannelRoutingRule.update(ruleId, {
        tag,
        target_channel_names: targets,
      });
      setRules((prev) =>
        prev.map((rule) => (rule.id === ruleId ? { ...rule, tag, targets } : rule))
      );
      cancelEdit();
    } catch (err) {
      setError(err?.message || 'Failed to update rule.');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm('Delete this routing rule?')) return;
    try {
      setError(null);
      await base44.entities.ChannelRoutingRule.delete(ruleId);
      setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    } catch (err) {
      setError(err?.message || 'Failed to delete rule.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white uppercase">Comms Routing</h3>
          <p className="text-xs text-zinc-500">
            Auto-route messages that include #tags into target channels.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={loadRules} className="text-zinc-300">
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh
        </Button>
      </div>

      {schemaMissing && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <div className="font-semibold">ChannelRoutingRule entity not available</div>
              <div className="text-[11px] text-orange-200/80">
                Showing defaults. Create a `ChannelRoutingRule` entity with fields `tag` and
                `target_channel_names[]` to enable editing.
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded space-y-3">
        <div className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Add Rule</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={draft.tag}
            onChange={(e) => setDraft((prev) => ({ ...prev, tag: e.target.value }))}
            placeholder="#ops"
            className="h-9 text-xs"
            disabled={schemaMissing}
          />
          <Input
            value={draft.targets}
            onChange={(e) => setDraft((prev) => ({ ...prev, targets: e.target.value }))}
            placeholder="ops, operations"
            className="h-9 text-xs md:col-span-2"
            disabled={schemaMissing}
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleCreate} disabled={schemaMissing}>
            <Plus className="w-3 h-3 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500">Loading routing rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-xs text-zinc-500">No routing rules configured.</div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const isEditing = editingId === rule.id;
            return (
              <div
                key={rule.id}
                className="p-3 bg-zinc-900/40 border border-zinc-800 rounded flex flex-col gap-2"
              >
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        value={editDraft.tag}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, tag: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <Input
                        value={editDraft.targets}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, targets: e.target.value }))}
                        className="h-8 text-xs md:col-span-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSave(rule.id)}>
                        <Save className="w-3 h-3 mr-2" />
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white">{rule.tag}</div>
                      {!schemaMissing && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => beginEdit(rule)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rule.targets.map((target, idx) => (
                        <span
                          key={`${rule.id}-${target}-${idx}`}
                          className="text-[10px] uppercase px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-900/50"
                        >
                          {target}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
