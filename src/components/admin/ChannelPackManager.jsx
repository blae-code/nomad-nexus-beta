import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

const LOCAL_PACKS_KEY = 'nexus.comms.channelPacks';

const loadLocalPacks = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalPacks = (packs) => {
  try {
    localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(packs));
  } catch {
    // ignore storage failure
  }
};

export default function ChannelPackManager() {
  const [packs, setPacks] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [squads, setSquads] = useState([]);
  const [scopeType, setScopeType] = useState('role');
  const [scopeValue, setScopeValue] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [error, setError] = useState(null);

  const hasEntity = Boolean(base44?.entities?.ChannelPack?.list);

  useEffect(() => {
    const load = async () => {
      try {
        const channelList = await base44.entities.Channel.list();
        setChannels(channelList || []);
      } catch {
        setChannels([]);
      }

      try {
        const roleList = await base44.entities.Role.list();
        setRoles(roleList || []);
      } catch {
        setRoles([]);
      }

      try {
        const squadList = await base44.entities.Squad.list();
        setSquads(squadList || []);
      } catch {
        setSquads([]);
      }

      if (hasEntity) {
        try {
          const packList = await base44.entities.ChannelPack.list();
          setPacks(packList || []);
        } catch (err) {
          setError(err?.message || 'Failed to load channel packs.');
        }
      } else {
        setPacks(loadLocalPacks());
      }
    };

    load();
  }, [hasEntity]);

  const availableChannels = useMemo(
    () => channels.filter((ch) => !ch.is_dm),
    [channels]
  );

  const scopeOptions = useMemo(() => {
    if (scopeType === 'role') {
      return roles.map((role) => role.name);
    }
    if (scopeType === 'rank') {
      return ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];
    }
    if (scopeType === 'membership') {
      return ['GUEST', 'VAGRANT', 'MEMBER', 'AFFILIATE', 'PARTNER'];
    }
    if (scopeType === 'squad') {
      return squads.map((s) => s.name);
    }
    return [];
  }, [scopeType, roles, squads]);

  const toggleChannel = (channelId) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId];
    });
  };

  const handleCreate = async () => {
    if (!scopeValue.trim() || selectedChannels.length === 0) {
      setError('Choose a scope and at least one channel.');
      return;
    }

    const packPayload = {
      scope_type: scopeType,
      scope_value: scopeValue.trim(),
      channel_ids: selectedChannels,
    };

    try {
      setError(null);
      if (hasEntity) {
        const created = await base44.entities.ChannelPack.create(packPayload);
        setPacks((prev) => [...prev, created]);
      } else {
        const next = [
          ...packs,
          { id: `local_${Date.now()}`, ...packPayload },
        ];
        setPacks(next);
        saveLocalPacks(next);
      }
      setScopeValue('');
      setSelectedChannels([]);
    } catch (err) {
      setError(err?.message || 'Failed to create pack.');
    }
  };

  const handleDelete = async (packId) => {
    try {
      setError(null);
      if (hasEntity) {
        await base44.entities.ChannelPack.delete(packId);
        setPacks((prev) => prev.filter((pack) => pack.id !== packId));
      } else {
        const next = packs.filter((pack) => pack.id !== packId);
        setPacks(next);
        saveLocalPacks(next);
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete pack.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white uppercase">Channel Packs</h3>
        <p className="text-xs text-zinc-500">Auto-recommend channels by role, rank, membership, or squad.</p>
      </div>

      {!hasEntity && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <div className="font-semibold">ChannelPack entity not available</div>
              <div className="text-[11px] text-orange-200/80">
                Packs will be stored locally until Base44 schema is added.
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
        <div className="text-xs uppercase tracking-widest text-zinc-500">Create Pack</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value)}
            className="h-9 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 px-2"
          >
            <option value="role">Role</option>
            <option value="rank">Rank</option>
            <option value="membership">Membership</option>
            <option value="squad">Squad</option>
          </select>
          <Input
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            placeholder="Scope value..."
            list="scope-values"
            className="h-9 text-xs"
          />
          <Button onClick={handleCreate} className="h-9">
            <Plus className="w-3 h-3 mr-2" />
            Add Pack
          </Button>
          <datalist id="scope-values">
            {scopeOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="text-xs uppercase tracking-widest text-zinc-500">Channels</div>
        <div className="max-h-40 overflow-y-auto border border-zinc-800 rounded p-2 space-y-1 text-xs">
          {availableChannels.map((channel) => (
            <label key={channel.id} className="flex items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={selectedChannels.includes(channel.id)}
                onChange={() => toggleChannel(channel.id)}
              />
              <span>#{channel.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {packs.length === 0 ? (
          <div className="text-xs text-zinc-500">No channel packs configured.</div>
        ) : (
          packs.map((pack) => (
            <div key={pack.id} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-200">
                  <span className="text-orange-300 uppercase">{pack.scope_type || pack.scopeType}</span>{' '}
                  <span className="text-zinc-500">→</span> {pack.scope_value || pack.scopeValue}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(pack.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(pack.channel_ids || pack.channelIds || []).map((id) => {
                  const channel = channels.find((ch) => ch.id === id);
                  return (
                    <span
                      key={id}
                      className="text-[10px] uppercase px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-900/50"
                    >
                      {channel ? `#${channel.name}` : id}
                    </span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
