/**
 * Event Notification & Reminder Manager
 * Manage notifications and reminders for events
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function EventNotificationManager({ onSave, eventId }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'email', timing: '1-day-before' },
  ]);

  const [newNotif, setNewNotif] = useState({ type: 'email', timing: '1-hour-before' });

  const timingOptions = [
    { value: '15-min-before', label: '15 minutes before' },
    { value: '1-hour-before', label: '1 hour before' },
    { value: '1-day-before', label: '1 day before' },
    { value: 'at-start', label: 'At event start' },
    { value: 'at-end', label: 'At event end' },
  ];

  const typeOptions = [
    { value: 'email', label: 'Email' },
    { value: 'push', label: 'Push Notification' },
    { value: 'sms', label: 'SMS' },
    { value: 'in-app', label: 'In-App' },
  ];

  const addNotification = () => {
    setNotifications([
      ...notifications,
      { ...newNotif, id: Date.now() },
    ]);
  };

  const removeNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleSave = () => {
    onSave({
      event_id: eventId,
      notifications,
    });
  };

  return (
    <div className="space-y-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-orange-500" />
        <h4 className="text-sm font-bold uppercase text-white">Notifications & Reminders</h4>
      </div>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex items-center justify-between p-2 bg-zinc-800/40 rounded">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-300">
                  {typeOptions.find((t) => t.value === notif.type)?.label} •{' '}
                  {timingOptions.find((t) => t.value === notif.timing)?.label}
                </span>
              </div>
              <Button
                onClick={() => removeNotification(notif.id)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-zinc-700/50 pt-3">
        <label className="text-xs font-semibold text-zinc-400">Add Notification</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={newNotif.type}
            onChange={(e) => setNewNotif({ ...newNotif, type: e.target.value })}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={newNotif.timing}
            onChange={(e) => setNewNotif({ ...newNotif, timing: e.target.value })}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
          >
            {timingOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={addNotification}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      <Button
        onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-500"
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Save Notifications
      </Button>
    </div>
  );
}