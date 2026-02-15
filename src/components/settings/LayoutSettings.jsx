import React, { useState, useEffect } from 'react';
import { Layout, Monitor, RotateCcw, Save } from 'lucide-react';
import { NexusButton, NexusBadge } from '../nexus-os/ui/primitives';
import { Switch } from '@/components/ui/switch';

const PANEL_PRESETS = [
  { id: 'default', name: 'Default Layout', leftWidth: 320, rightWidth: 320, footerHeight: 320 },
  { id: 'comms-focused', name: 'Comms Focused', leftWidth: 480, rightWidth: 280, footerHeight: 280 },
  { id: 'voice-focused', name: 'Voice Focused', leftWidth: 280, rightWidth: 480, footerHeight: 280 },
  { id: 'tactical-focused', name: 'Tactical Focused', leftWidth: 280, rightWidth: 280, footerHeight: 480 },
  { id: 'balanced', name: 'Balanced', leftWidth: 360, rightWidth: 360, footerHeight: 360 },
];

const WORKBENCH_PRESETS = [
  { id: 'GRID_2X2', name: '2×2 Grid' },
  { id: 'GRID_3_COLUMN', name: '3 Column Grid' },
  { id: 'COMMAND_LEFT', name: 'Command Left' },
  { id: 'OPERATIONS_HUB', name: 'Operations Hub' },
  { id: 'WIDE_MESH', name: 'Wide Mesh' },
];

export default function LayoutSettings() {
  const [panelPreset, setPanelPreset] = useState('default');
  const [autoCollapsePanels, setAutoCollapsePanels] = useState(() => {
    return localStorage.getItem('nexus.layout.autoCollapse') !== 'false';
  });
  const [persistLayout, setPersistLayout] = useState(() => {
    return localStorage.getItem('nexus.layout.persist') !== 'false';
  });
  const [defaultWorkbench, setDefaultWorkbench] = useState(() => {
    return localStorage.getItem('nexus.layout.defaultWorkbench') || 'GRID_2X2';
  });

  useEffect(() => {
    localStorage.setItem('nexus.layout.autoCollapse', String(autoCollapsePanels));
  }, [autoCollapsePanels]);

  useEffect(() => {
    localStorage.setItem('nexus.layout.persist', String(persistLayout));
  }, [persistLayout]);

  useEffect(() => {
    localStorage.setItem('nexus.layout.defaultWorkbench', defaultWorkbench);
  }, [defaultWorkbench]);

  const applyPanelPreset = (presetId) => {
    const preset = PANEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    localStorage.setItem('nexus.leftPanelWidth', String(preset.leftWidth));
    localStorage.setItem('nexus.rightPanelWidth', String(preset.rightWidth));
    localStorage.setItem('nexus.tacticalFooter.height', String(preset.footerHeight));
    setPanelPreset(presetId);

    alert(`Panel layout updated to "${preset.name}". Reload the page to see changes.`);
  };

  const resetAllLayouts = () => {
    if (!confirm('Reset all layout customizations? This will clear panel sizes, workbench configurations, and positions.')) {
      return;
    }

    localStorage.removeItem('nexus.leftPanelWidth');
    localStorage.removeItem('nexus.rightPanelWidth');
    localStorage.removeItem('nexus.tacticalFooter.height');
    localStorage.removeItem('nexus.commsHub.messagePanelHeight');
    
    // Clear workbench layouts
    Object.keys(localStorage).forEach((key) => {
      if (key.includes('workbench') || key.includes('workspace')) {
        localStorage.removeItem(key);
      }
    });

    alert('All layouts reset. Reload the page to see default configuration.');
  };

  return (
    <div className="space-y-4">
      {/* Panel Size Presets */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Panel Size Presets</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PANEL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPanelPreset(preset.id)}
              className="p-3 rounded border border-zinc-700 bg-zinc-900/60 hover:border-orange-500/40 hover:bg-zinc-800 transition-all text-left"
            >
              <div className="text-xs font-semibold text-zinc-200">{preset.name}</div>
              <div className="text-[10px] text-zinc-500 mt-1">
                L:{preset.leftWidth} R:{preset.rightWidth} F:{preset.footerHeight}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Workbench Default */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layout className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Default Workbench Preset</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {WORKBENCH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDefaultWorkbench(preset.id)}
              className={`p-2.5 rounded border transition-all ${
                defaultWorkbench === preset.id
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
              }`}
            >
              <span className="text-xs text-zinc-200 font-semibold">{preset.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Behavior Options */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Auto-Collapse Panels</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Collapse panels on small screens</p>
          </div>
          <Switch checked={autoCollapsePanels} onCheckedChange={setAutoCollapsePanels} />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Persist Layout Changes</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Remember panel sizes and positions</p>
          </div>
          <Switch checked={persistLayout} onCheckedChange={setPersistLayout} />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded border border-red-900/40 bg-red-950/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">Reset All Layouts</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Clear all layout customizations and restore defaults</p>
          </div>
          <NexusButton size="sm" intent="danger" onClick={resetAllLayouts}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </NexusButton>
        </div>
      </section>
    </div>
  );
}