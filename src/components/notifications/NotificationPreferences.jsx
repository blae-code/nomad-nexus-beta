import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Volume2, Radio } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ user }) {
  const queryClient = useQueryClient();
  const [expandedChannels, setExpandedChannels] = useState(new Set());

  // Fetch user's global preferences and channel-specific preferences
  const { data: prefs = [] } = useQuery({
    queryKey: ['notification-prefs', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.NotificationPreference.filter({ user_id: user.id });
    },
    enabled: !!user?.id
  });

  // Fetch all channels for quick access
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list()
  });

  const globalPref = prefs.find(p => !p.channel_id && !p.squad_id);
  const channelPrefs = prefs.filter(p => p.channel_id);

  const createOrUpdateMutation = useMutation({
    mutationFn: (prefData) => {
      if (prefData.id) {
        return base44.entities.NotificationPreference.update(prefData.id, prefData);
      } else {
        return base44.entities.NotificationPreference.create(prefData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', user?.id] });
      toast.success('Preferences updated');
    }
  });

  const handleGlobalPreferenceChange = (field, value) => {
    const prefData = globalPref
      ? { ...globalPref, [field]: value }
      : { user_id: user.id, [field]: value };

    createOrUpdateMutation.mutate(prefData);
  };

  const handleChannelMute = (channelId, isMuted) => {
    const existingPref = channelPrefs.find(p => p.channel_id === channelId);
    const prefData = existingPref
      ? { ...existingPref, is_muted: isMuted }
      : {
        user_id: user.id,
        channel_id: channelId,
        is_muted: isMuted,
        push_enabled: true,
        sound_enabled: true
      };

    createOrUpdateMutation.mutate(prefData);
  };

  const toggleChannelExpand = (channelId) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channelId)) {
      newExpanded.delete(channelId);
    } else {
      newExpanded.add(channelId);
    }
    setExpandedChannels(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Global Preferences */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ea580c]" />
            Global Notification Settings
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Default notification behavior across all channels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-[#ea580c]" />
              <div>
                <div className="text-sm font-bold text-white">Push Notifications</div>
                <div className="text-xs text-zinc-500">Receive push alerts for important events</div>
              </div>
            </div>
            <Switch
              checked={globalPref?.push_enabled ?? true}
              onCheckedChange={(value) =>
                handleGlobalPreferenceChange('push_enabled', value)
              }
            />
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-[#ea580c]" />
              <div>
                <div className="text-sm font-bold text-white">Sound Alerts</div>
                <div className="text-xs text-zinc-500">Play sound for incoming notifications</div>
              </div>
            </div>
            <Switch
              checked={globalPref?.sound_enabled ?? true}
              onCheckedChange={(value) =>
                handleGlobalPreferenceChange('sound_enabled', value)
              }
            />
          </div>

          {/* Notification Types */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <div className="text-sm font-bold text-white mb-2">Notification Types</div>
            <div className="flex flex-wrap gap-2">
              {['mention', 'direct_message', 'channel_activity', 'moderation', 'system'].map(
                (type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="border-[#ea580c] text-[#ea580c] text-[11px] capitalize cursor-pointer hover:bg-[#ea580c]/10"
                  >
                    ✓ {type.replace('_', ' ')}
                  </Badge>
                )
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">All notification types enabled</p>
          </div>
        </CardContent>
      </Card>

      {/* Channel-Specific Settings */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide">
            Channel-Specific Settings
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Customize notifications for individual channels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            {channels.slice(0, 8).map((channel) => {
              const channelPref = channelPrefs.find(p => p.channel_id === channel.id);
              const isMuted = channelPref?.is_muted ?? false;

              return (
                <div
                  key={channel.id}
                  className="p-3 bg-zinc-900/50 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">#{channel.name}</div>
                      <div className="text-xs text-zinc-500 capitalize">{channel.category}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={isMuted ? 'destructive' : 'outline'}
                        className={`text-[10px] ${
                          isMuted
                            ? 'bg-red-950 border-red-900'
                            : 'border-emerald-900 text-emerald-400'
                        }`}
                      >
                        {isMuted ? 'Muted' : 'Enabled'}
                      </Badge>

                      <Switch
                        checked={!isMuted}
                        onCheckedChange={(value) =>
                          handleChannelMute(channel.id, !value)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {channels.length === 0 && (
              <div className="text-center py-8 text-zinc-600 text-sm">
                No channels available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}