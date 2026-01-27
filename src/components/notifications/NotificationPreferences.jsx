import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Volume2, Radio, Mail, Smartphone, AlertCircle, Calendar, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const handleNotificationTypeToggle = (type) => {
    const currentTypes = globalPref?.notification_types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    handleGlobalPreferenceChange('notification_types', newTypes);
  };

  const handleDeliveryMethodToggle = (method) => {
    const currentMethods = globalPref?.delivery_methods || ['in_app', 'push', 'sound'];
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method];
    
    handleGlobalPreferenceChange('delivery_methods', newMethods);
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

  const eventNotificationTypes = [
    { id: 'event_assignment', label: 'Event Assignments', description: 'When you are assigned to an operation', icon: Calendar },
    { id: 'event_update', label: 'Event Updates', description: 'Changes to operations you are involved in', icon: Calendar },
    { id: 'event_phase_change', label: 'Phase Changes', description: 'When an operation moves to a new phase', icon: Calendar },
    { id: 'high_priority_alert', label: 'High Priority Alerts', description: 'Critical system-wide alerts', icon: AlertCircle },
    { id: 'incident_alert', label: 'Incident Alerts', description: 'New incidents and emergencies', icon: Shield },
    { id: 'rescue_request', label: 'Rescue Requests', description: 'Distress calls and rescue operations', icon: Shield },
    { id: 'squad_invitation', label: 'Squad Invitations', description: 'Invitations to join squads', icon: Users },
    { id: 'comms_net_activity', label: 'Comms Net Activity', description: 'Voice net changes and activity', icon: Radio },
  ];

  const communicationTypes = [
    { id: 'mention', label: 'Mentions', description: 'When someone mentions you', icon: Bell },
    { id: 'direct_message', label: 'Direct Messages', description: 'Private messages sent to you', icon: Mail },
    { id: 'channel_activity', label: 'Channel Activity', description: 'New messages in channels', icon: Radio },
  ];

  const systemTypes = [
    { id: 'moderation', label: 'Moderation Actions', description: 'Moderation alerts and warnings', icon: Shield },
    { id: 'system', label: 'System Updates', description: 'System announcements and updates', icon: Bell },
  ];

  const deliveryMethods = [
    { id: 'in_app', label: 'In-App', description: 'Show notifications within the application', icon: Bell },
    { id: 'push', label: 'Push', description: 'Browser push notifications', icon: Smartphone },
    { id: 'email', label: 'Email', description: 'Send notifications to your email', icon: Mail },
    { id: 'sound', label: 'Sound', description: 'Play alert sounds', icon: Volume2 },
  ];

  const activeTypes = globalPref?.notification_types || [];
  const activeMethods = globalPref?.delivery_methods || ['in_app', 'push', 'sound'];

  return (
    <div className="space-y-4">
      {/* Delivery Methods */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-base font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#ea580c]" />
            Delivery Methods
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {deliveryMethods.map((method) => {
            const MethodIcon = method.icon;
            const isActive = activeMethods.includes(method.id);
            
            return (
              <div
                key={method.id}
                onClick={() => handleDeliveryMethodToggle(method.id)}
                className={cn(
                  'flex items-center justify-between p-3 border cursor-pointer transition-all',
                  isActive 
                    ? 'bg-[#ea580c]/10 border-[#ea580c]/50 hover:border-[#ea580c]' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <MethodIcon className={cn('w-4 h-4', isActive ? 'text-[#ea580c]' : 'text-zinc-500')} />
                  <div>
                    <div className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-zinc-400')}>
                      {method.label}
                    </div>
                    <div className="text-xs text-zinc-500">{method.description}</div>
                  </div>
                </div>
                <Checkbox checked={isActive} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Event & Operations Notifications */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-base font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#ea580c]" />
            Event & Operations
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Notifications related to operations and events
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {eventNotificationTypes.map((type) => {
            const TypeIcon = type.icon;
            const isActive = activeTypes.length === 0 || activeTypes.includes(type.id);
            
            return (
              <div
                key={type.id}
                onClick={() => handleNotificationTypeToggle(type.id)}
                className={cn(
                  'flex items-center justify-between p-3 border cursor-pointer transition-all',
                  isActive 
                    ? 'bg-emerald-950/20 border-emerald-800/50 hover:border-emerald-700' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <TypeIcon className={cn('w-4 h-4', isActive ? 'text-emerald-400' : 'text-zinc-500')} />
                  <div>
                    <div className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-zinc-400')}>
                      {type.label}
                    </div>
                    <div className="text-xs text-zinc-500">{type.description}</div>
                  </div>
                </div>
                <Checkbox checked={isActive} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Communication Notifications */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-base font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#ea580c]" />
            Communication
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Messages and mentions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {communicationTypes.map((type) => {
            const TypeIcon = type.icon;
            const isActive = activeTypes.length === 0 || activeTypes.includes(type.id);
            
            return (
              <div
                key={type.id}
                onClick={() => handleNotificationTypeToggle(type.id)}
                className={cn(
                  'flex items-center justify-between p-3 border cursor-pointer transition-all',
                  isActive 
                    ? 'bg-blue-950/20 border-blue-800/50 hover:border-blue-700' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <TypeIcon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-zinc-500')} />
                  <div>
                    <div className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-zinc-400')}>
                      {type.label}
                    </div>
                    <div className="text-xs text-zinc-500">{type.description}</div>
                  </div>
                </div>
                <Checkbox checked={isActive} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-base font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#ea580c]" />
            System & Moderation
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Administrative notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {systemTypes.map((type) => {
            const TypeIcon = type.icon;
            const isActive = activeTypes.length === 0 || activeTypes.includes(type.id);
            
            return (
              <div
                key={type.id}
                onClick={() => handleNotificationTypeToggle(type.id)}
                className={cn(
                  'flex items-center justify-between p-3 border cursor-pointer transition-all',
                  isActive 
                    ? 'bg-purple-950/20 border-purple-800/50 hover:border-purple-700' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <TypeIcon className={cn('w-4 h-4', isActive ? 'text-purple-400' : 'text-zinc-500')} />
                  <div>
                    <div className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-zinc-400')}>
                      {type.label}
                    </div>
                    <div className="text-xs text-zinc-500">{type.description}</div>
                  </div>
                </div>
                <Checkbox checked={isActive} />
              </div>
            );
          })}
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