import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/AuthProvider';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { isAdminUser } from '@/utils';
import { Plus, Shuffle, Users, Radio } from 'lucide-react';
import { closeManagedVoiceNet, createManagedVoiceNet, listManagedVoiceNets } from '@/components/voice/voiceNetGovernanceClient';

const DEFAULT_NET = {
  code: '',
  label: '',
  type: 'squad',
  discipline: 'casual',
  scope: 'temp_adhoc',
  status: 'active',
  priority: 2,
};

export default function VoiceNetDirector() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const isAdmin = isAdminUser(user) || ['FOUNDER', 'PIONEER', 'COMMANDER'].includes((member?.rank || '').toUpperCase());

  const [nets, setNets] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_NET);
  const [selectedNets, setSelectedNets] = useState([]);

  const memberIds = useMemo(() => presences.map((p) => p.member_profile_id || p.user_id).filter(Boolean), [presences]);
  const { memberMap } = useMemberProfileMap(memberIds);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const presencePromise = base44.entities.UserPresence?.list
        ? base44.entities.UserPresence.list('-last_activity', 200)
        : base44.entities.UserPresence.filter({}, '-last_activity', 200);

      const [netResult, presenceList] = await Promise.all([
        listManagedVoiceNets().catch(() => ({ nets: [] })),
        presencePromise.catch(() => []),
      ]);
      setNets(netResult?.nets || []);
      setPresences(presenceList || []);
    } catch (error) {
      console.error('VoiceNetDirector load failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const presencesByNet = useMemo(() => {
    const map = new Map();
    nets.forEach((net) => map.set(net.id, []));
    const unassigned = [];
    presences.forEach((presence) => {
      if (presence.net_id && map.has(presence.net_id)) {
        map.get(presence.net_id).push(presence);
      } else {
        unassigned.push(presence);
      }
    });
    return { map, unassigned };
  }, [nets, presences]);

  const updatePresenceNet = async (presence, netId) => {
    if (!presence?.id) return;
    const net = nets.find((n) => n.id === netId) || null;
    try {
      await base44.entities.UserPresence.update(presence.id, {
        net_id: netId || null,
        current_net: net ? { id: net.id, code: net.code, label: net.label } : null,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to move presence:', error);
    }
  };

  const handleDrop = (event, netId) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      const presence = presences.find((p) => p.id === parsed.presenceId);
      if (presence) updatePresenceNet(presence, netId);
    } catch (error) {
      console.error('Drop parse failed:', error);
    }
  };

  const createNet = async () => {
    if (!form.code.trim() || !form.label.trim()) return;
    try {
      await createManagedVoiceNet({
        code: form.code.trim(),
        label: form.label.trim(),
        type: form.type,
        discipline: form.discipline,
        scope: form.scope,
        temporary: form.scope !== 'permanent',
        status: form.status,
        priority: Number(form.priority || 2),
      });
      setForm(DEFAULT_NET);
      loadData();
    } catch (error) {
      console.error('Failed to create net:', error);
    }
  };

  const mergeNets = async () => {
    if (selectedNets.length < 2) return;
    const mergeLabel = `Merged-${Date.now()}`;
    try {
      const merged = await createManagedVoiceNet({
        code: mergeLabel.toLowerCase(),
        label: mergeLabel,
        type: 'command',
        discipline: 'focused',
        scope: 'temp_adhoc',
        temporary: true,
        status: 'active',
        priority: 1,
      });

      const mergedNetId = merged?.net?.id;
      const affectedPresences = presences.filter((p) => selectedNets.includes(p.net_id));
      await Promise.all(affectedPresences.map((presence) => updatePresenceNet(presence, mergedNetId)));

      await Promise.all(selectedNets.map((netId) => closeManagedVoiceNet(netId, 'merged_into_new_lane').catch(() => null)));
      setSelectedNets([]);
      loadData();
    } catch (error) {
      console.error('Failed to merge nets:', error);
    }
  };

  if (!isAdmin) {
    return <div className="text-xs text-zinc-500">Command authority required to manage voice nets.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <Plus className="w-3 h-3" />
          Create Net
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Net code" />
          <Input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Net label" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            <option value="command">Command</option>
            <option value="squad">Squad</option>
            <option value="support">Support</option>
            <option value="general">General</option>
          </select>
          <select
            value={form.scope}
            onChange={(e) => setForm((prev) => ({ ...prev, scope: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            <option value="temp_adhoc">Temporary</option>
            <option value="permanent">Permanent</option>
          </select>
        </div>
        <Button onClick={createNet} className="w-full">
          Create Net
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Radio className="w-3 h-3" />
          Live Nets
        </div>
        <Button size="sm" variant="outline" onClick={mergeNets} disabled={selectedNets.length < 2}>
          <Shuffle className="w-3 h-3 mr-2" />
          Merge Selected
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500">Loading nets...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div
            className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded p-3 min-h-[200px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Unassigned</div>
            <div className="space-y-2">
              {presencesByNet.unassigned.map((presence) => {
                const label = memberMap[presence.member_profile_id || presence.user_id]?.label || presence.member_profile_id || presence.user_id;
                return (
                  <div
                    key={presence.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ presenceId: presence.id }))}
                    className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800/60 border border-zinc-700 rounded cursor-move"
                  >
                    {label}
                  </div>
                );
              })}
              {presencesByNet.unassigned.length === 0 && <div className="text-[10px] text-zinc-500">All members assigned</div>}
            </div>
          </div>

          {nets.map((net) => {
            const roster = presencesByNet.map.get(net.id) || [];
            const selected = selectedNets.includes(net.id);
            return (
              <div
                key={net.id}
                className={`bg-zinc-900/60 border rounded p-3 min-h-[200px] ${selected ? 'border-orange-500' : 'border-zinc-800'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, net.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-widest text-zinc-500">{net.label || net.code}</div>
                  <label className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        setSelectedNets((prev) => (prev.includes(net.id) ? prev.filter((id) => id !== net.id) : [...prev, net.id]))
                      }
                    />
                    Select
                  </label>
                </div>
                <div className="text-[10px] text-zinc-500 mb-2">
                  {net.type} · {net.status} · {String(net.lifecycle_scope || '').replace('_', ' ')}
                </div>
                <div className="space-y-2">
                  {roster.map((presence) => {
                    const label = memberMap[presence.member_profile_id || presence.user_id]?.label || presence.member_profile_id || presence.user_id;
                    return (
                      <div
                        key={presence.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ presenceId: presence.id }))}
                        className="px-2 py-1 text-xs text-zinc-300 bg-zinc-800/60 border border-zinc-700 rounded cursor-move"
                      >
                        {label}
                      </div>
                    );
                  })}
                  {roster.length === 0 && <div className="text-[10px] text-zinc-500">No members assigned</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-zinc-500 flex items-center gap-2">
        <Users className="w-3 h-3" />
        Drag members between nets to update their active voice channel.
      </div>
    </div>
  );
}
