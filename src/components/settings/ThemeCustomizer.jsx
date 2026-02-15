import React, { useState, useEffect } from 'react';
import { Palette, Type, Zap } from 'lucide-react';
import { NexusButton, NexusBadge } from '../nexus-os/ui/primitives';

const COLOR_PRESETS = [
  { id: 'orange-tactical', name: 'Orange Tactical', primary: '#f97316', accent: '#fb923c', danger: '#dc2626' },
  { id: 'cyan-ops', name: 'Cyan Ops', primary: '#06b6d4', accent: '#22d3ee', danger: '#dc2626' },
  { id: 'emerald-field', name: 'Emerald Field', primary: '#10b981', accent: '#34d399', danger: '#dc2626' },
  { id: 'violet-command', name: 'Violet Command', primary: '#8b5cf6', accent: '#a78bfa', danger: '#dc2626' },
  { id: 'amber-warning', name: 'Amber Warning', primary: '#f59e0b', accent: '#fbbf24', danger: '#dc2626' },
];

const FONT_PRESETS = [
  { id: 'mono', name: 'Monospace', family: 'ui-monospace, monospace' },
  { id: 'sans', name: 'Sans-Serif', family: 'ui-sans-serif, sans-serif' },
  { id: 'system', name: 'System Default', family: 'system-ui, sans-serif' },
];

const DENSITY_OPTIONS = [
  { id: 'compact', name: 'Compact', spacing: '0.5rem' },
  { id: 'standard', name: 'Standard', spacing: '0.75rem' },
  { id: 'comfortable', name: 'Comfortable', spacing: '1rem' },
];

export default function ThemeCustomizer() {
  const [selectedPreset, setSelectedPreset] = useState(() => {
    return localStorage.getItem('nexus.theme.preset') || 'orange-tactical';
  });
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('nexus.theme.font') || 'mono';
  });
  const [selectedDensity, setSelectedDensity] = useState(() => {
    return localStorage.getItem('nexus.theme.density') || 'standard';
  });

  useEffect(() => {
    const preset = COLOR_PRESETS.find(p => p.id === selectedPreset);
    if (preset) {
      document.documentElement.style.setProperty('--nx-primary', preset.primary);
      document.documentElement.style.setProperty('--nx-accent', preset.accent);
      document.documentElement.style.setProperty('--nx-danger', preset.danger);
      localStorage.setItem('nexus.theme.preset', selectedPreset);
    }
  }, [selectedPreset]);

  useEffect(() => {
    const font = FONT_PRESETS.find(f => f.id === selectedFont);
    if (font) {
      document.documentElement.style.setProperty('--nx-font-family', font.family);
      localStorage.setItem('nexus.theme.font', selectedFont);
    }
  }, [selectedFont]);

  useEffect(() => {
    const density = DENSITY_OPTIONS.find(d => d.id === selectedDensity);
    if (density) {
      document.documentElement.style.setProperty('--nx-spacing', density.spacing);
      localStorage.setItem('nexus.theme.density', selectedDensity);
    }
  }, [selectedDensity]);

  return (
    <div className="space-y-4">
      {/* Color Presets */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Color Palette</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedPreset(preset.id)}
              className={`flex items-center gap-3 p-3 rounded border transition-all ${
                selectedPreset === preset.id
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
              }`}
            >
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.danger }} />
              </div>
              <span className="text-xs text-zinc-200 font-semibold">{preset.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Font Selection */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Typography</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {FONT_PRESETS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => setSelectedFont(font.id)}
              className={`p-3 rounded border transition-all ${
                selectedFont === font.id
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
              }`}
              style={{ fontFamily: font.family }}
            >
              <div className="text-xs text-zinc-200 font-semibold">{font.name}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Sample Aa</div>
            </button>
          ))}
        </div>
      </section>

      {/* Density */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Interface Density</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DENSITY_OPTIONS.map((density) => (
            <button
              key={density.id}
              type="button"
              onClick={() => setSelectedDensity(density.id)}
              className={`p-3 rounded border transition-all ${
                selectedDensity === density.id
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
              }`}
            >
              <div className="text-xs text-zinc-200 font-semibold">{density.name}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}