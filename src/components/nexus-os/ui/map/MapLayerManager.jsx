import React, { useState } from 'react';
import { NexusButton, NexusBadge } from '../primitives';
import { Eye, EyeOff, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const LAYER_GROUPS = [
  {
    id: 'tactical',
    label: 'Tactical',
    layers: ['presence', 'ops', 'controlZones'],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    layers: ['intel'],
  },
  {
    id: 'communications',
    label: 'Communications',
    layers: ['comms'],
  },
  {
    id: 'operations',
    label: 'Operations',
    layers: ['logistics'],
  },
];

const LAYER_LABELS = {
  presence: 'Unit Presence',
  ops: 'Operations',
  controlZones: 'Control Zones',
  intel: 'Intel Markers',
  comms: 'Comms Overlay',
  logistics: 'Logistics Lanes',
};

export default function MapLayerManager({ layers, onToggleLayer, onApplyPreset }) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [presets, setPresets] = useState(() => {
    const saved = localStorage.getItem('nexus.map.layer.presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;

    const config = layers.reduce((acc, layer) => {
      acc[layer.id] = layer.enabled;
      return acc;
    }, {});

    const newPreset = {
      id: `preset-${Date.now()}`,
      name,
      config,
      createdAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('nexus.map.layer.presets', JSON.stringify(updated));
    setPresetName('');
    setShowPresetInput(false);
  };

  const deletePreset = (presetId) => {
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    localStorage.setItem('nexus.map.layer.presets', JSON.stringify(updated));
  };

  const applyPreset = (preset) => {
    onApplyPreset(preset.config);
  };

  const enabledCount = layers.filter((l) => l.enabled).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Layer Control</h4>
        <NexusBadge tone="neutral">{enabledCount}/{layers.length}</NexusBadge>
      </div>

      {LAYER_GROUPS.map((group) => {
        const isCollapsed = collapsedGroups[group.id];
        const groupLayers = layers.filter((l) => group.layers.includes(l.id));
        const enabledInGroup = groupLayers.filter((l) => l.enabled).length;

        return (
          <section key={group.id} className="rounded border border-zinc-800 bg-zinc-900/45 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{group.label}</span>
              </div>
              <NexusBadge tone={enabledInGroup > 0 ? 'active' : 'neutral'}>
                {enabledInGroup}/{groupLayers.length}
              </NexusBadge>
            </button>

            {!isCollapsed && (
              <div className="px-2.5 pb-2 space-y-1">
                {groupLayers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onToggleLayer(layer.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-all ${
                      layer.enabled
                        ? 'bg-sky-900/30 border border-sky-700/40 text-sky-200'
                        : 'bg-zinc-950/55 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>{LAYER_LABELS[layer.id] || layer.id}</span>
                    {layer.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Presets</h5>
          <NexusButton
            size="sm"
            intent="subtle"
            className="text-[10px]"
            onClick={() => setShowPresetInput(!showPresetInput)}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </NexusButton>
        </div>

        {showPresetInput && (
          <div className="flex items-center gap-1.5">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePreset();
                if (e.key === 'Escape') setShowPresetInput(false);
              }}
              placeholder="Preset name..."
              className="flex-1 rounded border border-zinc-800 bg-zinc-950/75 px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-sky-700/60"
              autoFocus
            />
            <NexusButton size="sm" intent="primary" className="text-[10px]" onClick={savePreset} disabled={!presetName.trim()}>
              Save
            </NexusButton>
          </div>
        )}

        {presets.length > 0 ? (
          <div className="space-y-1">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex-1 text-left text-[11px] text-zinc-300 hover:text-sky-300 transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => deletePreset(preset.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete preset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">No saved presets</div>
        )}
      </section>
    </div>
  );
}