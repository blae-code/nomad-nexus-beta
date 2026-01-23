import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, Monitor, User, Shield, Palette, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [preferences, setPreferences] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: userPreferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const prefs = await base44.entities.NotificationPreference.filter({ user_id: user.id });
      return prefs[0] || null;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (userPreferences) {
      setPreferences(userPreferences);
    } else if (user && !isLoading) {
      // Set defaults
      setPreferences({
        user_id: user.id,
        high_priority_alerts: true,
        event_assignments: true,
        event_status_changes: true,
        new_messages: true,
        direct_messages: true,
        squad_invitations: true,
        squad_events: true,
        voice_net_activity: false,
        incident_alerts: true,
        rank_changes: true,
        treasury_changes: true,
        delivery_methods: ['in_app', 'browser'],
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      });
    }
  }, [userPreferences, user, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (prefs) => {
      if (userPreferences?.id) {
        return await base44.entities.NotificationPreference.update(userPreferences.id, prefs);
      } else {
        return await base44.entities.NotificationPreference.create(prefs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    }
  });

  const handleSave = () => {
    if (preferences) {
      saveMutation.mutate(preferences);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleDeliveryMethod = (method) => {
    setPreferences(prev => {
      const methods = prev.delivery_methods || [];
      if (methods.includes(method)) {
        return { ...prev, delivery_methods: methods.filter(m => m !== method) };
      } else {
        return { ...prev, delivery_methods: [...methods, method] };
      }
    });
  };

  if (isLoading || !preferences) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-500 font-mono">LOADING SETTINGS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 text-zinc-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-tight">User Settings</h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Configure your preferences</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#ea580c] hover:bg-[#ea580c]/90 text-white text-xs h-8"
          >
            {saveMutation.isPending ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-4 shrink-0">
        <div className="flex gap-0">
          {[
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'appearance', label: 'Appearance', icon: Palette }
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2',
                  activeTab === tab.id
                    ? 'text-white border-[#ea580c]'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                )}
              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'notifications' && (
          <div className="max-w-3xl space-y-4">
            {/* Event Types Section */}
            <div className="border border-zinc-800 bg-zinc-900/40">
              <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Event Types</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5">Choose which events trigger notifications</p>
              </div>
              <div className="p-3 space-y-3">
                <NotificationToggle
                  label="High-Priority Alerts"
                  description="Critical operational alerts and emergencies"
                  checked={preferences.high_priority_alerts}
                  onChange={(checked) => updatePreference('high_priority_alerts', checked)}
                  badge="CRITICAL"
                  badgeColor="bg-red-500"
                />
                <NotificationToggle
                  label="Event Assignments"
                  description="When you're assigned to operations or missions"
                  checked={preferences.event_assignments}
                  onChange={(checked) => updatePreference('event_assignments', checked)}
                />
                <NotificationToggle
                  label="Event Status Changes"
                  description="Updates to operations you're assigned to"
                  checked={preferences.event_status_changes}
                  onChange={(checked) => updatePreference('event_status_changes', checked)}
                />
                <NotificationToggle
                  label="New Messages"
                  description="New messages in channels you follow"
                  checked={preferences.new_messages}
                  onChange={(checked) => updatePreference('new_messages', checked)}
                />
                <NotificationToggle
                  label="Direct Messages"
                  description="Private messages and whispers"
                  checked={preferences.direct_messages}
                  onChange={(checked) => updatePreference('direct_messages', checked)}
                  badge="RECOMMENDED"
                  badgeColor="bg-blue-500"
                />
                <NotificationToggle
                  label="Squad Invitations"
                  description="Invitations to join squads"
                  checked={preferences.squad_invitations}
                  onChange={(checked) => updatePreference('squad_invitations', checked)}
                />
                <NotificationToggle
                  label="Squad Events"
                  description="Events scheduled by your squads"
                  checked={preferences.squad_events}
                  onChange={(checked) => updatePreference('squad_events', checked)}
                />
                <NotificationToggle
                  label="Voice Net Activity"
                  description="Users joining/leaving voice networks"
                  checked={preferences.voice_net_activity}
                  onChange={(checked) => updatePreference('voice_net_activity', checked)}
                />
                <NotificationToggle
                  label="Incident Alerts"
                  description="New rescue requests and incidents"
                  checked={preferences.incident_alerts}
                  onChange={(checked) => updatePreference('incident_alerts', checked)}
                />
                <NotificationToggle
                  label="Rank Changes"
                  description="Promotions and rank updates"
                  checked={preferences.rank_changes}
                  onChange={(checked) => updatePreference('rank_changes', checked)}
                />
                <NotificationToggle
                  label="Treasury Changes"
                  description="Changes to your personal balance"
                  checked={preferences.treasury_changes}
                  onChange={(checked) => updatePreference('treasury_changes', checked)}
                />
              </div>
            </div>

            {/* Delivery Methods Section */}
            <div className="border border-zinc-800 bg-zinc-900/40">
              <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Delivery Methods</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5">How you receive notifications</p>
              </div>
              <div className="p-3 space-y-3">
                <DeliveryMethodToggle
                  icon={Bell}
                  label="In-App"
                  description="Show notifications in the app interface"
                  checked={(preferences.delivery_methods || []).includes('in_app')}
                  onChange={() => toggleDeliveryMethod('in_app')}
                />
                <DeliveryMethodToggle
                  icon={Monitor}
                  label="Browser"
                  description="System notifications in your browser"
                  checked={(preferences.delivery_methods || []).includes('browser')}
                  onChange={() => toggleDeliveryMethod('browser')}
                />
                <DeliveryMethodToggle
                  icon={Mail}
                  label="Email"
                  description="Send notifications to your email"
                  checked={(preferences.delivery_methods || []).includes('email')}
                  onChange={() => toggleDeliveryMethod('email')}
                />
              </div>
            </div>

            {/* Quiet Hours Section */}
            <div className="border border-zinc-800 bg-zinc-900/40">
              <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Quiet Hours</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5">Pause non-critical notifications during specific hours</p>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[10px] text-zinc-300 font-medium">Enable Quiet Hours</Label>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Critical alerts will still come through</p>
                  </div>
                  <Switch
                    checked={preferences.quiet_hours_enabled}
                    onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
                  />
                </div>
                {preferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                    <div>
                      <Label className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Start Time</Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_start}
                        onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">End Time</Label>
                      <Input
                        type="time"
                        value={preferences.quiet_hours_end}
                        onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl">
            <div className="border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <User className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Profile settings coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-3xl">
            <div className="border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <Palette className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Appearance settings coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationToggle({ label, description, checked, onChange, badge, badgeColor }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-zinc-200 font-medium cursor-pointer">{label}</Label>
          {badge && (
            <Badge className={cn('text-[7px] px-1.5 py-0 text-white border-0', badgeColor)}>
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-[9px] text-zinc-500 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function DeliveryMethodToggle({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-start gap-2 flex-1">
        <div className="w-6 h-6 border border-zinc-700 bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3 h-3 text-zinc-400" />
        </div>
        <div>
          <Label className="text-[10px] text-zinc-200 font-medium cursor-pointer">{label}</Label>
          <p className="text-[9px] text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}