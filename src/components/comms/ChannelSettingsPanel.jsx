import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Shield, Plug, AlertTriangle, Trash2 } from 'lucide-react';

export default function ChannelSettingsPanel({ channel, onUpdate, onDelete, onClose }) {
  const [settings, setSettings] = useState({
    name: channel?.name || '',
    description: channel?.description || '',
    is_private: channel?.is_private || false,
    is_public: channel?.is_public || true,
    max_members: channel?.max_members || 0,
    voice_quality: channel?.voice_quality || 'high',
    echo_cancellation: channel?.echo_cancellation !== false,
    noise_suppression: channel?.noise_suppression !== false,
    push_to_talk_enabled: channel?.push_to_talk_enabled || false,
    allowed_roles: channel?.allowed_roles || [],
  });

  const handleSave = () => {
    onUpdate?.(settings);
    onClose?.();
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950/95 border border-zinc-800/60">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Channel Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs rounded hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="general" className="h-full">
          <TabsList className="bg-zinc-900/60 border border-zinc-800/40">
            <TabsTrigger value="general" className="data-[state=active]:bg-zinc-800">General</TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-zinc-800">Permissions</TabsTrigger>
            {channel?.type === 'voice' && (
              <TabsTrigger value="voice" className="data-[state=active]:bg-zinc-800">Voice</TabsTrigger>
            )}
            <TabsTrigger value="advanced" className="data-[state=active]:bg-zinc-800">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Channel Name</Label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Description</Label>
              <Textarea
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200 h-24"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <Label className="text-xs text-zinc-300">Private Channel</Label>
                <Switch
                  checked={settings.is_private}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_private: checked, is_public: !checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <Label className="text-xs text-zinc-300">Public Channel</Label>
                <Switch
                  checked={settings.is_public}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_public: checked, is_private: !checked })}
                />
              </div>
            </div>

            {channel?.type === 'voice' && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-zinc-400">Max Members</Label>
                <Input
                  type="number"
                  value={settings.max_members}
                  onChange={(e) => setSettings({ ...settings, max_members: parseInt(e.target.value) || 0 })}
                  className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200"
                />
                <p className="text-[10px] text-zinc-600 mt-1">0 = unlimited</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Allowed Roles</Label>
              <div className="mt-2 space-y-2">
                {['PIONEER', 'FOUNDER', 'VAGRANT', 'NOMAD'].map(role => (
                  <div key={role} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                    <Label className="text-xs text-zinc-300">{role}</Label>
                    <Switch
                      checked={settings.allowed_roles.includes(role)}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          allowed_roles: checked
                            ? [...settings.allowed_roles, role]
                            : settings.allowed_roles.filter(r => r !== role)
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {channel?.type === 'voice' && (
            <TabsContent value="voice" className="space-y-4 mt-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-zinc-400">Voice Quality</Label>
                <Select
                  value={settings.voice_quality}
                  onValueChange={(value) => setSettings({ ...settings, voice_quality: value })}
                >
                  <SelectTrigger className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="low">Low (32 kbps)</SelectItem>
                    <SelectItem value="medium">Medium (64 kbps)</SelectItem>
                    <SelectItem value="high">High (128 kbps)</SelectItem>
                    <SelectItem value="ultra">Ultra (256 kbps)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <Label className="text-xs text-zinc-300">Echo Cancellation</Label>
                  <Switch
                    checked={settings.echo_cancellation}
                    onCheckedChange={(checked) => setSettings({ ...settings, echo_cancellation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <Label className="text-xs text-zinc-300">Noise Suppression</Label>
                  <Switch
                    checked={settings.noise_suppression}
                    onCheckedChange={(checked) => setSettings({ ...settings, noise_suppression: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <Label className="text-xs text-zinc-300">Push to Talk</Label>
                  <Switch
                    checked={settings.push_to_talk_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, push_to_talk_enabled: checked })}
                  />
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-red-900/40 bg-red-950/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <Label className="text-xs font-semibold uppercase tracking-wide text-red-300">Danger Zone</Label>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Deleting this channel will permanently remove all messages and history. This action cannot be undone.
              </p>
              <Button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${channel?.name}"?`)) {
                    onDelete?.(channel?.id);
                    onClose?.();
                  }
                }}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Channel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/40 flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1 bg-orange-600 hover:bg-orange-700">
          Save Changes
        </Button>
      </div>
    </div>
  );
}