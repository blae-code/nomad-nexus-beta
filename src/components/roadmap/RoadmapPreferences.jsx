import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * RoadmapPreferences
 * Allows users to configure roadmap notification settings
 */
export default function RoadmapPreferences() {
  const [preferences, setPreferences] = useState({
    inAppNotifications: true,
    emailNotifications: true,
    milestoneCompletionAlerts: true,
    featureStartAlerts: true,
    upcomingDeadlineAlerts: true,
    notificationFrequency: 'realtime', // realtime, daily, weekly
  });

  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load saved preferences from user data if available
      if (currentUser?.roadmapNotificationPrefs) {
        setPreferences(currentUser.roadmapNotificationPrefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Save preferences to user data
      await base44.auth.updateMe({
        roadmapNotificationPrefs: preferences,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider">
          Roadmap Notifications
        </h3>
        {saved && <span className="text-xs text-green-400">✓ Saved</span>}
      </div>

      <div className="space-y-3">
        {/* In-App Notifications */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={preferences.inAppNotifications}
            onChange={() => togglePreference('inAppNotifications')}
            className="w-4 h-4 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-white">
              <Bell className="w-4 h-4 text-blue-400" />
              In-App Notifications
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time alerts for roadmap updates
            </p>
          </div>
        </label>

        {/* Email Notifications */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={preferences.emailNotifications}
            onChange={() => togglePreference('emailNotifications')}
            className="w-4 h-4 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-white">
              <Mail className="w-4 h-4 text-orange-400" />
              Email Notifications
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Receive email alerts for major roadmap changes
            </p>
          </div>
        </label>

        {/* Milestone Alerts */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={preferences.milestoneCompletionAlerts}
            onChange={() => togglePreference('milestoneCompletionAlerts')}
            className="w-4 h-4 rounded"
          />
          <div className="flex-1 text-sm text-white">Milestone Completion Alerts</div>
        </label>

        {/* Feature Alerts */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={preferences.featureStartAlerts}
            onChange={() => togglePreference('featureStartAlerts')}
            className="w-4 h-4 rounded"
          />
          <div className="flex-1 text-sm text-white">Feature Development Start Alerts</div>
        </label>

        {/* Deadline Alerts */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={preferences.upcomingDeadlineAlerts}
            onChange={() => togglePreference('upcomingDeadlineAlerts')}
            className="w-4 h-4 rounded"
          />
          <div className="flex-1 text-sm text-white">Upcoming Deadline Alerts</div>
        </label>

        {/* Notification Frequency */}
        {preferences.emailNotifications && (
          <div className="pt-2 border-t border-zinc-800">
            <label className="flex items-center gap-3 text-sm text-white mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Email Frequency
            </label>
            <select
              value={preferences.notificationFrequency}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  notificationFrequency: e.target.value,
                }))
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold py-2 rounded transition-colors"
      >
        Save Preferences
      </button>
    </div>
  );
}