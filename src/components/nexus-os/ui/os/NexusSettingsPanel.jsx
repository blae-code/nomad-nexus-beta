import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings, Sparkles, User, Volume2, Monitor, Zap, Bell, Shield, Database, X } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';

const SETTINGS_CATEGORIES = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'voice', label: 'Voice & Audio', icon: Volume2 },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'accessibility', label: 'Accessibility', icon: Zap },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'data', label: 'Data & Storage', icon: Database },
];

export default function NexusSettingsPanel({
  open,
  onClose,
  user,
  onUpdateSetting,
}) {
  const [activeCategory, setActiveCategory] = useState('account');
  const [categoryPage, setCategoryPage] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCategoryPage(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const categoryPageCount = Math.max(1, Math.ceil(SETTINGS_CATEGORIES.length / 4));
  const visibleCategories = useMemo(
    () => SETTINGS_CATEGORIES.slice(categoryPage * 4, categoryPage * 4 + 4),
    [categoryPage]
  );

  const activeCategoryData = SETTINGS_CATEGORIES.find((cat) => cat.id === activeCategory);

  if (!open) return null;

  return (
    <div className="nx-command-deck-backdrop" onClick={onClose}>
      <section 
        ref={panelRef}
        className="nx-command-deck nexus-panel-glow" 
        onClick={(event) => event.stopPropagation()}
        style={{ maxHeight: '85vh' }}
      >
        <header className="nx-command-deck-header">
          <div className="nx-command-deck-title-wrap">
            <span className="nx-command-deck-mark">
              <Settings className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="nx-command-deck-title">Nexus Settings Console</h3>
              <p className="nx-command-deck-context">
                Configure workspace preferences and system parameters
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="nx-command-deck-close" 
            title="Close settings (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="nx-command-deck-hints">
          <span>Esc close</span>
          <span>Click to apply</span>
          <span>Changes saved automatically</span>
        </div>

        <div className="nx-command-deck-content">
          <section className="nx-command-block">
            <div className="nx-command-block-head">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-300" />
                <span>Settings Categories</span>
              </div>
              <span>{SETTINGS_CATEGORIES.length}</span>
            </div>
            <div className="nx-command-catalog-grid">
              {visibleCategories.map((category) => {
                const Icon = category.icon;
                const active = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`nx-command-catalog-item ${active ? 'bg-orange-500/10 border-orange-500/40' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-orange-400" />
                      <span className="nx-command-catalog-label">{category.label}</span>
                    </div>
                    {active && (
                      <NexusBadge tone="active" className="text-[9px]">Active</NexusBadge>
                    )}
                  </button>
                );
              })}
            </div>
            {categoryPageCount > 1 && (
              <div className="nx-command-pager">
                <button
                  type="button"
                  onClick={() => setCategoryPage((prev) => Math.max(0, prev - 1))}
                  disabled={categoryPage === 0}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>{categoryPage + 1}/{categoryPageCount}</span>
                <button
                  type="button"
                  onClick={() => setCategoryPage((prev) => Math.min(categoryPageCount - 1, prev + 1))}
                  disabled={categoryPage >= categoryPageCount - 1}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>

          <section className="nx-command-block">
            <div className="nx-command-block-head">
              <div className="flex items-center gap-1">
                {activeCategoryData && <activeCategoryData.icon className="w-3.5 h-3.5 text-orange-300" />}
                <span>{activeCategoryData?.label || 'Settings'}</span>
              </div>
            </div>

            <div className="space-y-3 px-4 pb-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
              {activeCategory === 'account' && (
                <AccountSettings user={user} onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'voice' && (
                <VoiceSettings onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'display' && (
                <DisplaySettings onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'notifications' && (
                <NotificationSettings onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'accessibility' && (
                <AccessibilitySettings onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'privacy' && (
                <PrivacySettings onUpdateSetting={onUpdateSetting} />
              )}
              {activeCategory === 'data' && (
                <DataSettings onUpdateSetting={onUpdateSetting} />
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function AccountSettings({ user, onUpdateSetting }) {
  return (
    <div className="space-y-4">
      <SettingRow
        label="Display Callsign"
        description="Your visible identifier in operations and comms"
        value={user?.callsign || 'Operator'}
        disabled
      />
      <SettingRow
        label="Rank"
        description="Current operational rank and clearance level"
        value={user?.rank || 'VAGRANT'}
        disabled
      />
      <SettingRow
        label="Member ID"
        description="Unique system identifier"
        value={user?.member_profile_id?.slice(0, 12) || 'Unknown'}
        disabled
      />
      <SettingRow
        label="Account Type"
        description="Authentication method and privileges"
        value={user?.authType === 'admin' ? 'System Admin' : 'Member Profile'}
        disabled
      />
    </div>
  );
}

function VoiceSettings({ onUpdateSetting }) {
  const [micGain, setMicGain] = useState(75);
  const [outputVolume, setOutputVolume] = useState(80);
  const [pttMode, setPttMode] = useState('hold');
  const [noiseSuppress, setNoiseSuppress] = useState(true);

  return (
    <div className="space-y-4">
      <SettingRow
        label="Microphone Gain"
        description="Input sensitivity for voice transmission"
        control={
          <div className="flex items-center gap-2 w-full">
            <input
              type="range"
              min="0"
              max="100"
              value={micGain}
              onChange={(e) => {
                setMicGain(Number(e.target.value));
                onUpdateSetting?.('voice.micGain', Number(e.target.value));
              }}
              className="flex-1 h-1 bg-zinc-700 rounded appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(249 115 22) 0%, rgb(249 115 22) ${micGain}%, rgb(63 63 70) ${micGain}%, rgb(63 63 70) 100%)`
              }}
            />
            <span className="text-xs text-zinc-400 font-mono w-10 text-right">{micGain}%</span>
          </div>
        }
      />
      <SettingRow
        label="Output Volume"
        description="Audio level for incoming voice traffic"
        control={
          <div className="flex items-center gap-2 w-full">
            <input
              type="range"
              min="0"
              max="100"
              value={outputVolume}
              onChange={(e) => {
                setOutputVolume(Number(e.target.value));
                onUpdateSetting?.('voice.outputVolume', Number(e.target.value));
              }}
              className="flex-1 h-1 bg-zinc-700 rounded appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(249 115 22) 0%, rgb(249 115 22) ${outputVolume}%, rgb(63 63 70) ${outputVolume}%, rgb(63 63 70) 100%)`
              }}
            />
            <span className="text-xs text-zinc-400 font-mono w-10 text-right">{outputVolume}%</span>
          </div>
        }
      />
      <SettingRow
        label="PTT Mode"
        description="Push-to-talk activation behavior"
        control={
          <select
            value={pttMode}
            onChange={(e) => {
              setPttMode(e.target.value);
              onUpdateSetting?.('voice.pttMode', e.target.value);
            }}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
          >
            <option value="hold">Hold to Transmit</option>
            <option value="toggle">Toggle Transmit</option>
            <option value="vox">Voice Activation</option>
          </select>
        }
      />
      <SettingRow
        label="Noise Suppression"
        description="AI-powered background noise filtering"
        control={
          <button
            type="button"
            onClick={() => {
              setNoiseSuppress(!noiseSuppress);
              onUpdateSetting?.('voice.noiseSuppress', !noiseSuppress);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              noiseSuppress
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {noiseSuppress ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
    </div>
  );
}

function DisplaySettings({ onUpdateSetting }) {
  const [theme, setTheme] = useState('auto');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [fontSize, setFontSize] = useState(100);

  return (
    <div className="space-y-4">
      <SettingRow
        label="Theme Mode"
        description="Visual appearance profile"
        control={
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              onUpdateSetting?.('display.theme', e.target.value);
            }}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
          >
            <option value="auto">Auto (System)</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        }
      />
      <SettingRow
        label="Font Scale"
        description="Interface text size multiplier"
        control={
          <div className="flex items-center gap-2 w-full">
            <input
              type="range"
              min="80"
              max="120"
              step="5"
              value={fontSize}
              onChange={(e) => {
                setFontSize(Number(e.target.value));
                onUpdateSetting?.('display.fontSize', Number(e.target.value));
              }}
              className="flex-1 h-1 bg-zinc-700 rounded appearance-none cursor-pointer"
            />
            <span className="text-xs text-zinc-400 font-mono w-12 text-right">{fontSize}%</span>
          </div>
        }
      />
      <SettingRow
        label="Reduced Motion"
        description="Minimize animations and transitions"
        control={
          <button
            type="button"
            onClick={() => {
              setReducedMotion(!reducedMotion);
              onUpdateSetting?.('display.reducedMotion', !reducedMotion);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              reducedMotion
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {reducedMotion ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Compact Layout"
        description="Reduce spacing for higher information density"
        control={
          <button
            type="button"
            onClick={() => {
              setCompactMode(!compactMode);
              onUpdateSetting?.('display.compactMode', !compactMode);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              compactMode
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {compactMode ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
    </div>
  );
}

function NotificationSettings({ onUpdateSetting }) {
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [mentionNotifs, setMentionNotifs] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <div className="space-y-4">
      <SettingRow
        label="Desktop Notifications"
        description="System notifications for critical alerts"
        control={
          <button
            type="button"
            onClick={() => {
              setDesktopNotifs(!desktopNotifs);
              onUpdateSetting?.('notifications.desktop', !desktopNotifs);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              desktopNotifs
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {desktopNotifs ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Sound Alerts"
        description="Audio cues for incoming messages and events"
        control={
          <button
            type="button"
            onClick={() => {
              setSoundNotifs(!soundNotifs);
              onUpdateSetting?.('notifications.sound', !soundNotifs);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              soundNotifs
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {soundNotifs ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Mention Notifications"
        description="Alert when you are directly mentioned"
        control={
          <button
            type="button"
            onClick={() => {
              setMentionNotifs(!mentionNotifs);
              onUpdateSetting?.('notifications.mentions', !mentionNotifs);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              mentionNotifs
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {mentionNotifs ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Quiet Hours"
        description="Suppress non-critical notifications (22:00 - 08:00)"
        control={
          <button
            type="button"
            onClick={() => {
              setQuietHours(!quietHours);
              onUpdateSetting?.('notifications.quietHours', !quietHours);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              quietHours
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {quietHours ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
    </div>
  );
}

function AccessibilitySettings({ onUpdateSetting }) {
  const [keyboardNav, setKeyboardNav] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div className="space-y-4">
      <SettingRow
        label="Keyboard Navigation"
        description="Enhanced keyboard shortcuts and tab navigation"
        control={
          <button
            type="button"
            onClick={() => {
              setKeyboardNav(!keyboardNav);
              onUpdateSetting?.('accessibility.keyboard', !keyboardNav);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              keyboardNav
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {keyboardNav ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Screen Reader Optimized"
        description="Improved ARIA labels and semantic markup"
        control={
          <button
            type="button"
            onClick={() => {
              setScreenReader(!screenReader);
              onUpdateSetting?.('accessibility.screenReader', !screenReader);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              screenReader
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {screenReader ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="High Contrast Mode"
        description="Increased color contrast for better visibility"
        control={
          <button
            type="button"
            onClick={() => {
              setHighContrast(!highContrast);
              onUpdateSetting?.('accessibility.highContrast', !highContrast);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              highContrast
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {highContrast ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
    </div>
  );
}

function PrivacySettings({ onUpdateSetting }) {
  const [aiFeatures, setAiFeatures] = useState(true);
  const [telemetry, setTelemetry] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);

  return (
    <div className="space-y-4">
      <SettingRow
        label="AI Features"
        description="Enable AI-assisted analysis and recommendations"
        control={
          <button
            type="button"
            onClick={() => {
              setAiFeatures(!aiFeatures);
              onUpdateSetting?.('privacy.aiFeatures', !aiFeatures);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              aiFeatures
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {aiFeatures ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Usage Telemetry"
        description="Anonymous usage data for system improvement"
        control={
          <button
            type="button"
            onClick={() => {
              setTelemetry(!telemetry);
              onUpdateSetting?.('privacy.telemetry', !telemetry);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              telemetry
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {telemetry ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
      <SettingRow
        label="Activity Status"
        description="Show your online/offline status to other members"
        control={
          <button
            type="button"
            onClick={() => {
              setActivityStatus(!activityStatus);
              onUpdateSetting?.('privacy.activityStatus', !activityStatus);
            }}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              activityStatus
                ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            {activityStatus ? 'Enabled' : 'Disabled'}
          </button>
        }
      />
    </div>
  );
}

function DataSettings({ onUpdateSetting }) {
  return (
    <div className="space-y-4">
      <SettingRow
        label="Local Cache"
        description="Temporary data storage for faster loading"
        value="12.4 MB"
        action={
          <NexusButton size="sm" intent="subtle" onClick={() => onUpdateSetting?.('data.clearCache')}>
            Clear
          </NexusButton>
        }
      />
      <SettingRow
        label="Offline Data"
        description="Locally stored maps and operational data"
        value="48.7 MB"
        action={
          <NexusButton size="sm" intent="subtle" onClick={() => onUpdateSetting?.('data.clearOffline')}>
            Clear
          </NexusButton>
        }
      />
      <SettingRow
        label="Session History"
        description="Recent operations and command logs"
        value="32 entries"
        action={
          <NexusButton size="sm" intent="subtle" onClick={() => onUpdateSetting?.('data.clearHistory')}>
            Clear
          </NexusButton>
        }
      />
      <SettingRow
        label="Export Data"
        description="Download your operational data archive"
        action={
          <NexusButton size="sm" intent="primary" onClick={() => onUpdateSetting?.('data.export')}>
            Export
          </NexusButton>
        }
      />
    </div>
  );
}

function SettingRow({ label, description, value, control, action, disabled }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 border-b border-zinc-800/50 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-zinc-200 mb-0.5">{label}</div>
        <div className="text-[10px] text-zinc-500 leading-snug">{description}</div>
        {value && !control && (
          <div className="text-xs text-orange-400 font-mono mt-1">{value}</div>
        )}
      </div>
      {control && (
        <div className="shrink-0">
          {control}
        </div>
      )}
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
      {value && !control && !action && (
        <div className="shrink-0 text-xs text-zinc-400 font-mono">{value}</div>
      )}
    </div>
  );
}