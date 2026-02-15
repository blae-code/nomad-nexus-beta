import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { NexusButton, NexusBadge } from '../nexus-os/ui/primitives';
import { Switch } from '@/components/ui/switch';

const NOTIFICATION_CATEGORIES = [
  { id: 'comms', name: 'Communications', description: 'Channel messages and mentions' },
  { id: 'operations', name: 'Operations', description: 'Event updates and assignments' },
  { id: 'tactical', name: 'Tactical Alerts', description: 'Critical alerts and commands' },
  { id: 'voice', name: 'Voice Activity', description: 'Net joins, transmissions, and status' },
  { id: 'system', name: 'System', description: 'Platform updates and diagnostics' },
];

const SOUND_OPTIONS = [
  { id: 'all', name: 'All Notifications', icon: Volume2 },
  { id: 'critical', name: 'Critical Only', icon: Bell },
  { id: 'none', name: 'Silent', icon: VolumeX },
];

export default function NotificationSettings() {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('nexus.notifications.categories');
    return saved ? JSON.parse(saved) : NOTIFICATION_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {});
  });

  const [soundMode, setSoundMode] = useState(() => {
    return localStorage.getItem('nexus.notifications.sound') || 'all';
  });

  const [desktopNotifications, setDesktopNotifications] = useState(() => {
    return localStorage.getItem('nexus.notifications.desktop') !== 'false';
  });

  const [quietHours, setQuietHours] = useState(() => {
    const saved = localStorage.getItem('nexus.notifications.quietHours');
    return saved ? JSON.parse(saved) : { enabled: false, start: '22:00', end: '08:00' };
  });

  useEffect(() => {
    localStorage.setItem('nexus.notifications.categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('nexus.notifications.sound', soundMode);
  }, [soundMode]);

  useEffect(() => {
    localStorage.setItem('nexus.notifications.desktop', String(desktopNotifications));
  }, [desktopNotifications]);

  useEffect(() => {
    localStorage.setItem('nexus.notifications.quietHours', JSON.stringify(quietHours));
  }, [quietHours]);

  const toggleCategory = (id) => {
    setCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* Categories */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Notification Categories</h3>
        </div>
        <div className="space-y-2">
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded border border-zinc-800 bg-zinc-950/40">
              <div>
                <div className="text-xs font-semibold text-zinc-200">{cat.name}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{cat.description}</div>
              </div>
              <Switch
                checked={categories[cat.id]}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Sound Mode */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Sound Alerts</h3>
        </div>
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

      {/* Desktop Notifications */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Desktop Notifications</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Show system notifications outside browser window</p>
          </div>
          <Switch
            checked={desktopNotifications}
            onCheckedChange={setDesktopNotifications}
          />
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BellOff className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Quiet Hours</h3>
          </div>
          <Switch
            checked={quietHours.enabled}
            onCheckedChange={(enabled) => setQuietHours((prev) => ({ ...prev, enabled }))}
          />
        </div>
        {quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Start Time</label>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">End Time</label>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/60"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}