import React from 'react';
import { useLayoutPreferences } from '@/components/hooks/useLayoutPreferences';
import { ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * LayoutSettings — Controls for layout preferences
 * Toggles: SidePanel collapse, CommsDock visibility, Telemetry display
 */
export default function LayoutSettings() {
  const { prefs, toggleSidePanel, toggleCommsDock, toggleTelemetry } = useLayoutPreferences();

  const SettingItem = ({ label, description, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        className="ml-4 transition-colors"
        title={isEnabled ? 'Disable' : 'Enable'}
      >
        {isEnabled ? (
          <ToggleRight className="w-6 h-6 text-green-500" />
        ) : (
          <ToggleLeft className="w-6 h-6 text-zinc-600" />
        )}
      </button>
    </div>
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/20">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Layout Preferences
        </h3>
        <p className="text-xs text-zinc-500 mt-1">Customize your workspace</p>
      </div>

      <div>
        <SettingItem
          label="Navigation Panel"
          description="Show/hide left navigation sidebar"
          isEnabled={!prefs.sidePanelCollapsed}
          onToggle={toggleSidePanel}
        />
        <SettingItem
          label="Comms Dock"
          description="Show/hide right communications panel"
          isEnabled={prefs.commsDockOpen}
          onToggle={toggleCommsDock}
        />
        <SettingItem
          label="Telemetry Display"
          description="Show comms status and latency in header"
          isEnabled={prefs.showTelemetry}
          onToggle={toggleTelemetry}
        />
      </div>
    </div>
  );
}