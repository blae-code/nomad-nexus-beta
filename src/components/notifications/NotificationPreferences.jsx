import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Bell, Volume2, Mail, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const result = await base44.entities.NotificationPreference.filter(
          { user_id: user.id },
          '-created_date',
          1
        );
        const existingPrefs = result?.[0] || null;
        if (existingPrefs) {
          setPrefs(existingPrefs);
        } else {
          // Create default preferences
          const newPrefs = await base44.entities.NotificationPreference.create({
            user_id: user.id,
            high_priority_alerts: true,
            event_assignments: true,
            new_messages: true,
            direct_messages: true,
            squad_invitations: true,
            incident_alerts: true,
            delivery_methods: ['in_app', 'browser'],
          });
          setPrefs(newPrefs);
        }
      } catch (e) {
        console.error('[Notifications] Failed to load preferences:', e);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  const handleToggle = async (field) => {
    if (!prefs) return;
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setSaving(true);
    try {
      await base44.entities.NotificationPreference.update(prefs.id, updated);
    } catch (e) {
      console.error('[Notifications] Failed to save preference:', e);
      setPrefs(prefs); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const handleDeliveryMethodChange = async (method) => {
    if (!prefs) return;
    const methods = prefs.delivery_methods || [];
    const updated = methods.includes(method)
      ? methods.filter((m) => m !== method)
      : [...methods, method];
    const newPrefs = { ...prefs, delivery_methods: updated };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await base44.entities.NotificationPreference.update(prefs.id, newPrefs);
    } catch (e) {
      console.error('[Notifications] Failed to save preference:', e);
      setPrefs(prefs); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-zinc-500 py-4">Loading preferences...</div>;
  }

  if (!prefs) {
    return <div className="text-xs text-zinc-500 py-4">Failed to load preferences</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Alert Types</div>

      {/* Alert Type Toggles */}
      <div className="space-y-2">
        {[
          { key: 'high_priority_alerts', label: 'Critical Alerts' },
          { key: 'event_assignments', label: 'Event Assignments' },
          { key: 'new_messages', label: 'New Messages' },
          { key: 'direct_messages', label: 'Direct Messages' },
          { key: 'squad_invitations', label: 'Squad Invitations' },
          { key: 'incident_alerts', label: 'Incidents' },
          { key: 'rank_changes', label: 'Rank Changes' },
        ].map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-zinc-900/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={prefs[key] ?? false}
              onChange={() => handleToggle(key)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-xs text-zinc-400">{label}</span>
          </label>
        ))}
      </div>

      <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mt-4">Delivery Methods</div>

      {/* Delivery Method Toggles */}
      <div className="space-y-2">
        {[
          { value: 'in_app', icon: Bell, label: 'In-App' },
          { value: 'browser', icon: Monitor, label: 'Browser' },
          { value: 'email', icon: Mail, label: 'Email' },
        ].map(({ value, icon: Icon, label }) => (
          <label
            key={value}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-zinc-900/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={(prefs.delivery_methods || []).includes(value)}
              onChange={() => handleDeliveryMethodChange(value)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <Icon className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-400">{label}</span>
          </label>
        ))}
      </div>

      {saving && <div className="text-xs text-orange-400 mt-2">Saving...</div>}
    </div>
  );
}