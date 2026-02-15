import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Settings, Palette, Bell, Keyboard, Layout, User, Shield, Save } from 'lucide-react';
import { NexusButton, NexusBadge } from '@/components/nexus-os/ui/primitives';
import ThemeCustomizer from '@/components/settings/ThemeCustomizer';
import NotificationSettings from '@/components/settings/NotificationSettings';
import KeybindingSettings from '@/components/settings/KeybindingSettings';
import LayoutSettings from '@/components/settings/LayoutSettings';

const TABS = [
  { id: 'theme', name: 'Theme', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'keybindings', name: 'Keybindings', icon: Keyboard },
  { id: 'layout', name: 'Layout', icon: Layout },
  { id: 'profile', name: 'Profile', icon: User },
];

export default function UserSettings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('theme');
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 800);
  };

  const displayName = user?.member_profile_data?.display_callsign || user?.callsign || user?.full_name || 'Operator';
  const rank = user?.member_profile_data?.rank || 'VAGRANT';
  const isAdmin = user?.is_admin || user?.member_profile_data?.rank === 'PIONEER' || user?.member_profile_data?.rank === 'FOUNDER';

  return (
    <div className="h-full overflow-hidden bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-orange-500/20 bg-zinc-900/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">User Settings</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Customize your NexusOS experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' && (
              <NexusBadge tone="ok">Saved</NexusBadge>
            )}
            <NexusButton size="sm" intent="primary" onClick={handleSave} disabled={saveStatus === 'saving'}>
              <Save className="w-3 h-3 mr-1" />
              {saveStatus === 'saving' ? 'Saving...' : 'Save All'}
            </NexusButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Navigation */}
        <aside className="flex-shrink-0 w-56 border-r border-zinc-800 bg-zinc-900/20 overflow-y-auto">
          <div className="p-3 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all ${
                    activeTab === tab.id
                      ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* User Info */}
          <div className="p-3 mt-4 border-t border-zinc-800">
            <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold text-zinc-200">{displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <NexusBadge tone="warning">{rank}</NexusBadge>
                {isAdmin && <NexusBadge tone="danger">ADMIN</NexusBadge>}
              </div>
              <NexusButton size="sm" intent="subtle" onClick={logout} className="w-full">
                Logout
              </NexusButton>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'theme' && <ThemeCustomizer />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'keybindings' && <KeybindingSettings />}
            {activeTab === 'layout' && <LayoutSettings />}
            {activeTab === 'profile' && (
              <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide mb-3">Profile Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Display Callsign</label>
                    <input
                      type="text"
                      value={displayName}
                      readOnly
                      className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-950/60 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/60"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Contact admin to change your callsign</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Rank</label>
                    <div className="px-3 py-2 rounded border border-zinc-700 bg-zinc-950/40 text-sm text-zinc-400">
                      {rank}
                    </div>
                  </div>
                  {user?.member_profile_data?.roles && user.member_profile_data.roles.length > 0 && (
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Roles</label>
                      <div className="flex flex-wrap gap-1">
                        {user.member_profile_data.roles.map((role) => (
                          <NexusBadge key={role} tone="neutral">{role}</NexusBadge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}