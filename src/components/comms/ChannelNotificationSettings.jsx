/**
 * ChannelNotificationSettings — Per-channel notification preferences
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ChannelNotificationSettings({ channel, isOpen, onClose, userId, autoLinkPreview = true, onToggleAutoLinkPreview }) {
  const [settings, setSettings] = useState({
    muted: false,
    desktop_notifications: true,
    sound_enabled: true,
    mentions_only: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !channel?.id || !userId) return;

    const loadSettings = async () => {
      try {
        let prefs = [];
        try {
          prefs = await base44.entities.NotificationPreference.filter({
            user_id: userId,
            channel_id: channel.id,
          });
        } catch {
          prefs = [];
        }

        if (prefs.length === 0) {
          try {
            prefs = await base44.entities.NotificationPreference.filter({
              member_profile_id: userId,
              channel_id: channel.id,
            });
          } catch {
            prefs = [];
          }
        }

        if (prefs.length > 0) {
          const pref = prefs[0];
          setSettings({
            muted: pref.muted || false,
            desktop_notifications: pref.desktop_notifications ?? true,
            sound_enabled: pref.sound_enabled ?? true,
            mentions_only: pref.mentions_only || false,
          });
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };

    loadSettings();
  }, [isOpen, channel?.id, userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let existing = [];
      try {
        existing = await base44.entities.NotificationPreference.filter({
          user_id: userId,
          channel_id: channel.id,
        });
      } catch {
        existing = [];
      }

      if (existing.length === 0) {
        try {
          existing = await base44.entities.NotificationPreference.filter({
            member_profile_id: userId,
            channel_id: channel.id,
          });
        } catch {
          existing = [];
        }
      }

      if (existing.length > 0) {
        await base44.entities.NotificationPreference.update(existing[0].id, settings);
      } else {
        await base44.entities.NotificationPreference.create({
          user_id: userId,
          channel_id: channel.id,
          ...settings,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!channel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <div className="text-sm text-zinc-500">#{channel.name}</div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.muted ? (
                <BellOff className="w-4 h-4 text-zinc-500" />
              ) : (
                <Bell className="w-4 h-4 text-orange-400" />
              )}
              <div>
                <div className="text-sm font-medium">Mute Channel</div>
                <div className="text-xs text-zinc-500">No notifications from this channel</div>
              </div>
            </div>
            <Switch
              checked={settings.muted}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, muted: checked }))}
            />
          </div>

      {!settings.muted && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Desktop Notifications</div>
                  <div className="text-xs text-zinc-500">Show desktop notifications</div>
                </div>
                <Switch
                  checked={settings.desktop_notifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, desktop_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.sound_enabled ? (
                    <Volume2 className="w-4 h-4 text-orange-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">Notification Sound</div>
                    <div className="text-xs text-zinc-500">Play sound for new messages</div>
                  </div>
                </div>
                <Switch
                  checked={settings.sound_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Mentions Only</div>
                  <div className="text-xs text-zinc-500">Only notify when @mentioned</div>
                </div>
                <Switch
                  checked={settings.mentions_only}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, mentions_only: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Auto Link Previews</div>
                  <div className="text-xs text-zinc-500">Show previews automatically</div>
                </div>
                <Switch
                  checked={autoLinkPreview}
                  onCheckedChange={(checked) => onToggleAutoLinkPreview?.(checked)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
