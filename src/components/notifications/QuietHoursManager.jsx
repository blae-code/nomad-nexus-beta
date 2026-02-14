import React, { useState, useEffect } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Moon, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function QuietHoursManager() {
  const { quietHours, setQuietHoursConfig } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    is_enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    allow_critical: true,
    allow_mentions: true,
  });

  useEffect(() => {
    if (quietHours) {
      setConfig(quietHours);
    }
  }, [quietHours]);

  const handleSave = async () => {
    try {
      let savedConfig = config;
      if (!config.id) {
        // Create new quiet hours config
        const created = await base44.entities.QuietHours.create(config);
        savedConfig = created;
      }
      await setQuietHoursConfig(savedConfig);
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to save quiet hours:', e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Moon className="w-4 h-4" />
          Quiet Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quiet Hours Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-700 rounded">
            <span className="text-sm font-medium">Enable Quiet Hours</span>
            <input
              type="checkbox"
              checked={config.is_enabled}
              onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          {config.is_enabled && (
            <>
              {/* Time Range */}
              <div className="space-y-3">
                <label className="text-sm font-medium block">Time Range</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={config.start_time}
                    onChange={(e) => setConfig({ ...config, start_time: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm"
                  />
                  <span className="text-zinc-600">to</span>
                  <input
                    type="time"
                    value={config.end_time}
                    onChange={(e) => setConfig({ ...config, end_time: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm"
                  />
                </div>
              </div>

              {/* Exceptions */}
              <div className="space-y-3">
                <label className="text-sm font-medium block">Allow During Quiet Hours</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded">
                    <input
                      type="checkbox"
                      checked={config.allow_critical}
                      onChange={(e) => setConfig({ ...config, allow_critical: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm">Critical Priority Alerts</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded">
                    <input
                      type="checkbox"
                      checked={config.allow_mentions}
                      onChange={(e) => setConfig({ ...config, allow_mentions: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm">Mentions & Direct Alerts</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full gap-2 bg-orange-600 hover:bg-orange-500">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}