import React, { useState, useEffect } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import { NexusButton, NexusBadge } from '../nexus-os/ui/primitives';

const DEFAULT_KEYBINDINGS = [
  { id: 'command-palette', name: 'Command Palette', default: 'Ctrl+Shift+P', category: 'global' },
  { id: 'open-action', name: 'Open Action Console', default: 'Alt+1', category: 'focus-apps' },
  { id: 'open-comms', name: 'Open Comms Network', default: 'Alt+2', category: 'focus-apps' },
  { id: 'open-map', name: 'Open Tactical Map', default: 'Alt+3', category: 'focus-apps' },
  { id: 'open-mobile', name: 'Open Mobile AR', default: 'Alt+4', category: 'focus-apps' },
  { id: 'open-ops', name: 'Open Ops Focus', default: 'Alt+5', category: 'focus-apps' },
  { id: 'open-force', name: 'Open Force Design', default: 'Alt+6', category: 'focus-apps' },
  { id: 'open-reports', name: 'Open Reports', default: 'Alt+7', category: 'focus-apps' },
  { id: 'suspend-app', name: 'Suspend Foreground App', default: 'Ctrl+Shift+S', category: 'global' },
  { id: 'toggle-voice', name: 'Toggle Voice Panel', default: 'Ctrl+V', category: 'panels' },
  { id: 'toggle-comms', name: 'Toggle Comms Panel', default: 'Ctrl+C', category: 'panels' },
  { id: 'ptt', name: 'Push to Talk', default: 'Space', category: 'voice' },
];

const CATEGORIES = [
  { id: 'global', name: 'Global' },
  { id: 'focus-apps', name: 'Focus Apps' },
  { id: 'panels', name: 'Panels' },
  { id: 'voice', name: 'Voice' },
];

export default function KeybindingSettings() {
  const [keybindings, setKeybindings] = useState(() => {
    const saved = localStorage.getItem('nexus.keybindings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_KEYBINDINGS.reduce((acc, kb) => ({ ...acc, [kb.id]: kb.default }), {});
      }
    }
    return DEFAULT_KEYBINDINGS.reduce((acc, kb) => ({ ...acc, [kb.id]: kb.default }), {});
  });

  const [recording, setRecording] = useState(null);

  useEffect(() => {
    localStorage.setItem('nexus.keybindings', JSON.stringify(keybindings));
  }, [keybindings]);

  const startRecording = (id) => {
    setRecording(id);
  };

  const stopRecording = () => {
    setRecording(null);
  };

  const handleKeyDown = (e, id) => {
    if (!recording || recording !== id) return;

    e.preventDefault();
    e.stopPropagation();

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Cmd');

    const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
      parts.push(key);
    }

    if (parts.length > 0) {
      const binding = parts.join('+');
      setKeybindings((prev) => ({ ...prev, [id]: binding }));
      stopRecording();
    }
  };

  const resetKeybinding = (id) => {
    const defaultBinding = DEFAULT_KEYBINDINGS.find((kb) => kb.id === id);
    if (defaultBinding) {
      setKeybindings((prev) => ({ ...prev, [id]: defaultBinding.default }));
    }
  };

  const resetAll = () => {
    if (confirm('Reset all keybindings to defaults?')) {
      setKeybindings(DEFAULT_KEYBINDINGS.reduce((acc, kb) => ({ ...acc, [kb.id]: kb.default }), {}));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Keyboard Shortcuts</h3>
        </div>
        <NexusButton size="sm" intent="subtle" onClick={resetAll}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset All
        </NexusButton>
      </div>

      {CATEGORIES.map((category) => {
        const categoryBindings = DEFAULT_KEYBINDINGS.filter((kb) => kb.category === category.id);
        if (categoryBindings.length === 0) return null;

        return (
          <section key={category.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">{category.name}</h4>
            <div className="space-y-2">
              {categoryBindings.map((kb) => (
                <div key={kb.id} className="flex items-center justify-between gap-3 p-2 rounded border border-zinc-800 bg-zinc-950/40">
                  <span className="text-xs text-zinc-200 flex-1">{kb.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startRecording(kb.id)}
                      onKeyDown={(e) => handleKeyDown(e, kb.id)}
                      onBlur={stopRecording}
                      className={`px-3 py-1 rounded border text-[10px] font-mono transition-all ${
                        recording === kb.id
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300 animate-pulse'
                          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {recording === kb.id ? 'Press keys...' : keybindings[kb.id] || kb.default}
                    </button>
                    {keybindings[kb.id] !== kb.default && (
                      <button
                        type="button"
                        onClick={() => resetKeybinding(kb.id)}
                        className="p-1 text-zinc-500 hover:text-orange-400 transition-colors"
                        title="Reset to default"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Sound Mode */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Sound Settings</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SOUND_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSoundMode(option.id)}
                className={`p-3 rounded border transition-all flex items-center gap-2 ${
                  soundMode === option.id
                    ? 'border-orange-500/60 bg-orange-500/10'
                    : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                }`}
              >
                <Icon className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-200 font-semibold">{option.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Desktop Notifications & Quiet Hours */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Desktop Notifications</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Show notifications outside browser</p>
          </div>
          <Switch checked={desktopNotifications} onCheckedChange={setDesktopNotifications} />
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Quiet Hours</h4>
              <p className="text-[10px] text-zinc-500 mt-0.5">Mute non-critical notifications</p>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(enabled) => setQuietHours((prev) => ({ ...prev, enabled }))}
            />
          </div>
          {quietHours.enabled && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Start</label>
                <input
                  type="time"
                  value={quietHours.start}
                  onChange={(e) => setQuietHours((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">End</label>
                <input
                  type="time"
                  value={quietHours.end}
                  onChange={(e) => setQuietHours((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}