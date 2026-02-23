import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Moon, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function QuietHoursManager() {
  const { user: authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    is_enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    allow_critical: true,
    allow_mentions: true,
  });

  useEffect(() => {
    const loadConfig = async () => {
      if (!authUser?.id) return;
      try {
        const existing = await base44.entities.QuietHours.filter(
          { created_by_member_profile_id: authUser.id },
          '-created_date',
          1
        );
        if (existing?.[0]) {
          setConfig(existing[0]);
        }
      } catch (e) {
        console.debug('[QuietHours] Failed to load config:', e?.message);
      }
    };
    loadConfig();
  }, [authUser?.id]);

  const handleSave = async () => {
    if (!authUser?.id) return;
    setLoading(true);
    try {
      if (config.id) {
        await base44.entities.QuietHours.update(config.id, config);
      } else {
        await base44.entities.QuietHours.create({
          ...config,
          created_by_member_profile_id: authUser.id,
        });
      }
      setIsOpen(false);
    } catch (e) {
      console.error('[QuietHours] Failed to save:', e);
    } finally {
      setLoading(false);
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
          <label className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-700 rounded cursor-pointer">
            <span className="text-sm font-medium text-zinc-300">Enable Quiet Hours</span>
            <input
              type="checkbox"
              checked={config.is_enabled}
              onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
          </label>

          {config.is_enabled && (
            <>
              {/* Time Range */}
              <div className="space-y-3">
                <label className="text-sm font-medium block text-zinc-300">Time Range</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={config.start_time}
                    onChange={(e) => setConfig({ ...config, start_time: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300"
                  />
                  <span className="text-zinc-600 text-sm">to</span>
                  <input
                    type="time"
                    value={config.end_time}
                    onChange={(e) => setConfig({ ...config, end_time: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300"
                  />
                </div>
              </div>

              {/* Exceptions */}
              <div className="space-y-3">
                <label className="text-sm font-medium block text-zinc-300">Allow During Quiet Hours</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allow_critical}
                      onChange={(e) => setConfig({ ...config, allow_critical: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-zinc-300">Critical Priority Alerts</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allow_mentions}
                      onChange={(e) => setConfig({ ...config, allow_mentions: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-zinc-300">Direct Messages & Mentions</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full gap-2 bg-orange-600 hover:bg-orange-500"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}