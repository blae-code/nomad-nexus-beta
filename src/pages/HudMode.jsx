import React, { useEffect, useMemo, useState } from 'react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import TacticalMap from '@/components/tactical/TacticalMap';
import { AlertTriangle, Radio, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEFAULT_PREFERENCES = {
  showOrders: true,
  showAlerts: true,
  compactMap: true,
  highContrast: false,
  orderLimit: 12,
  alertLimit: 12,
  alertSeverityFilter: 'ALL',
  textSize: 'base',
};

function resolveHudPreferences(profile) {
  const raw =
    profile?.hud_preferences ||
    profile?.hud_mode_preferences ||
    profile?.preferences?.hud ||
    DEFAULT_PREFERENCES;

  return {
    showOrders: raw?.showOrders !== false,
    showAlerts: raw?.showAlerts !== false,
    compactMap: raw?.compactMap !== false,
    highContrast: Boolean(raw?.highContrast),
    orderLimit: Math.max(5, Math.min(50, Number(raw?.orderLimit) || 12)),
    alertLimit: Math.max(5, Math.min(50, Number(raw?.alertLimit) || 12)),
    alertSeverityFilter: String(raw?.alertSeverityFilter || 'ALL').toUpperCase(),
    textSize: ['sm', 'base', 'lg'].includes(String(raw?.textSize || '').toLowerCase())
      ? String(raw?.textSize).toLowerCase()
      : 'base',
  };
}

export default function HudMode() {
  const activeOp = useActiveOp();
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [commands, setCommands] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    const loadHudData = async () => {
      try {
        const filter = activeOp?.activeEventId ? { event_id: activeOp.activeEventId } : {};
        const [cmds, incs, profile] = await Promise.all([
          base44.entities.TacticalCommand.filter(filter, '-created_date', 100).catch(() => []),
          base44.entities.Incident.filter(filter, '-created_date', 100).catch(() => []),
          member?.id ? base44.entities.MemberProfile.get(member.id).catch(() => null) : Promise.resolve(null),
        ]);
        setCommands(cmds || []);
        setIncidents(incs || []);
        if (profile) {
          setPreferences(resolveHudPreferences(profile));
        }
      } catch (error) {
        console.error('HUD load failed:', error);
      }
    };

    loadHudData();
  }, [activeOp?.activeEventId, member?.id]);

  const visibleCommands = useMemo(
    () => commands.slice(0, preferences.orderLimit),
    [commands, preferences.orderLimit]
  );

  const visibleIncidents = useMemo(() => {
    const filtered =
      preferences.alertSeverityFilter === 'ALL'
        ? incidents
        : incidents.filter(
            (incident) =>
              String(incident?.severity || '').toUpperCase() === preferences.alertSeverityFilter
          );
    return filtered.slice(0, preferences.alertLimit);
  }, [incidents, preferences.alertLimit, preferences.alertSeverityFilter]);

  const textClass = preferences.textSize === 'sm' ? 'text-[11px]' : preferences.textSize === 'lg' ? 'text-sm' : 'text-xs';

  const savePreferences = async () => {
    try {
      setSavingPreferences(true);
      const response = await invokeMemberFunction('updateHudPreferences', {
        targetMemberProfileId: member?.id,
        preferences,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setPreferences(payload.preferences || preferences);
        setStatusBanner({ type: 'success', message: 'HUD customization saved.' });
      } else {
        setStatusBanner({ type: 'error', message: payload?.error || 'Failed to save HUD preferences.' });
      }
    } catch (error) {
      console.error('HUD preference save failed:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to save HUD preferences.',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className={`min-h-screen text-white ${preferences.highContrast ? 'bg-zinc-950' : 'bg-black'}`}>
      <div className="grid grid-cols-3 gap-4 p-4">
        <div className="col-span-2">
          <TacticalMap
            eventId={activeOp?.activeEventId || null}
            activeEvent={activeOp?.activeEvent || null}
            compact={preferences.compactMap}
          />
        </div>
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Settings2 className="w-3 h-3" />
              HUD Customization
            </div>

            {statusBanner && (
              <div
                role={statusBanner.type === 'error' ? 'alert' : 'status'}
                className={`text-[10px] rounded border px-2 py-1 ${
                  statusBanner.type === 'error'
                    ? 'border-red-500/40 text-red-300 bg-red-500/10'
                    : 'border-green-500/40 text-green-300 bg-green-500/10'
                }`}
              >
                {statusBanner.message}
              </div>
            )}

            <label className="flex items-center justify-between text-xs text-zinc-300">
              Show Orders
              <input
                type="checkbox"
                checked={preferences.showOrders}
                onChange={(e) => setPreferences((prev) => ({ ...prev, showOrders: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between text-xs text-zinc-300">
              Show Alerts
              <input
                type="checkbox"
                checked={preferences.showAlerts}
                onChange={(e) => setPreferences((prev) => ({ ...prev, showAlerts: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between text-xs text-zinc-300">
              Compact Map
              <input
                type="checkbox"
                checked={preferences.compactMap}
                onChange={(e) => setPreferences((prev) => ({ ...prev, compactMap: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between text-xs text-zinc-300">
              High Contrast
              <input
                type="checkbox"
                checked={preferences.highContrast}
                onChange={(e) => setPreferences((prev) => ({ ...prev, highContrast: e.target.checked }))}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Order limit"
                value={preferences.orderLimit}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    orderLimit: Number(e.target.value) || 12,
                  }))
                }
                placeholder="Order limit"
              />
              <Input
                aria-label="Alert limit"
                value={preferences.alertLimit}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    alertLimit: Number(e.target.value) || 12,
                  }))
                }
                placeholder="Alert limit"
              />
            </div>

            <select
              aria-label="Alert severity filter"
              value={preferences.alertSeverityFilter}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  alertSeverityFilter: e.target.value,
                }))
              }
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="ALL">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              aria-label="HUD text size"
              value={preferences.textSize}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  textSize: e.target.value,
                }))
              }
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="sm">Compact Text</option>
              <option value="base">Default Text</option>
              <option value="lg">Large Text</option>
            </select>

            <Button size="sm" variant="outline" onClick={savePreferences} disabled={savingPreferences}>
              {savingPreferences ? 'Saving...' : 'Save HUD Preferences'}
            </Button>
          </div>

          {preferences.showOrders && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                <Radio className="w-3 h-3" />
                Orders
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {visibleCommands.length === 0 ? (
                  <div className={`${textClass} text-zinc-500`}>No active orders</div>
                ) : (
                  visibleCommands.map((cmd) => (
                    <div key={cmd.id} className={`${textClass} text-zinc-300 border border-zinc-700/50 rounded p-2`}>
                      <div className="text-[10px] text-orange-400 uppercase">{cmd.command_type || 'ORDER'}</div>
                      <div>{cmd.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {preferences.showAlerts && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Alerts
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {visibleIncidents.length === 0 ? (
                  <div className={`${textClass} text-zinc-500`}>No active alerts</div>
                ) : (
                  visibleIncidents.map((incident) => (
                    <div key={incident.id} className={`${textClass} text-zinc-300 border border-zinc-700/50 rounded p-2`}>
                      <div className="text-[10px] text-red-400 uppercase">{incident.severity || 'ALERT'}</div>
                      <div>{incident.title}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
