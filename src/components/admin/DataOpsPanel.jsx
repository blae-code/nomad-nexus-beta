import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, ShieldAlert, Siren, TimerReset } from 'lucide-react';
import {
  readSchedulerTelemetry,
  readVoiceLifecycleFallbackEnabled,
  setVoiceLifecycleFallbackEnabled,
} from '@/components/admin/dataOpsScheduler';

const LANE_META = {
  reference: {
    label: 'Reference',
    description: 'Patch-stable specs for ships, vehicles, weapons, and components.',
  },
  market: {
    label: 'Market',
    description: 'Commodity and pricing snapshots used for route and contract planning.',
  },
  live: {
    label: 'Live',
    description: 'Near-realtime telemetry and status used by tactical overlays.',
  },
};

const LANE_ORDER = ['reference', 'market', 'live'];

function laneDefaults(lane) {
  const defaults = {
    reference: { cadenceMinutes: 360, ttlMinutes: 1440 },
    market: { cadenceMinutes: 15, ttlMinutes: 120 },
    live: { cadenceMinutes: 1, ttlMinutes: 5 },
  };
  return defaults[lane] || defaults.reference;
}

function normalizeLaneConfig(lane, source) {
  const fallback = laneDefaults(lane);
  return {
    lane,
    endpointUrl: String(source?.endpointUrl || ''),
    authHeader: String(source?.authHeader || ''),
    cadenceMinutes: Number(source?.cadenceMinutes || fallback.cadenceMinutes),
    ttlMinutes: Number(source?.ttlMinutes || fallback.ttlMinutes),
    enabled: source?.enabled !== false,
    notes: String(source?.notes || ''),
  };
}

function statusClasses(status) {
  if (status === 'fresh') {
    return {
      panel: 'border-green-500/40 bg-green-500/10',
      text: 'text-green-300',
      icon: CheckCircle2,
    };
  }
  return {
    panel: 'border-red-500/40 bg-red-500/10',
    text: 'text-red-300',
    icon: ShieldAlert,
  };
}

function formatAge(minutes) {
  if (minutes == null || !Number.isFinite(Number(minutes))) return 'No snapshot';
  if (Number(minutes) < 1) return '<1m';
  if (Number(minutes) < 60) return `${Math.round(Number(minutes))}m`;
  const hours = Number(minutes) / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function DataOpsPanel() {
  const [loading, setLoading] = useState(true);
  const [syncingLane, setSyncingLane] = useState('');
  const [savingLane, setSavingLane] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [runs, setRuns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [duePlan, setDuePlan] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [health, setHealth] = useState({ lanes: {} });
  const [orchestrating, setOrchestrating] = useState('');
  const [schedulerTelemetry, setSchedulerTelemetry] = useState(null);
  const [voiceLifecycleFallbackEnabled, setVoiceLifecycleFallbackEnabledState] = useState(false);
  const [sourceConfigs, setSourceConfigs] = useState({
    reference: normalizeLaneConfig('reference', null),
    market: normalizeLaneConfig('market', null),
    live: normalizeLaneConfig('live', null),
  });

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await invokeMemberFunction('updateFittingDataOps', { action: 'get_snapshot' });
      const payload = response?.data || response;
      if (!payload?.success) {
        throw new Error(payload?.error || 'Failed to load fitting data ops state.');
      }

      const configs = payload?.sourceConfigs || {};
      const next = {
        reference: normalizeLaneConfig('reference', configs.reference),
        market: normalizeLaneConfig('market', configs.market),
        live: normalizeLaneConfig('live', configs.live),
      };

      setSourceConfigs(next);
      setRuns(Array.isArray(payload?.runs) ? payload.runs : []);
      setAlerts(Array.isArray(payload?.alerts) ? payload.alerts : []);
      setDuePlan(Array.isArray(payload?.duePlan) ? payload.duePlan : []);
      setSnapshots(payload?.snapshots || {});
      setHealth(payload?.health || { lanes: {} });
      if (typeof window !== 'undefined') {
        setSchedulerTelemetry(readSchedulerTelemetry(window.localStorage, Date.now()));
        setVoiceLifecycleFallbackEnabledState(readVoiceLifecycleFallbackEnabled(window.localStorage));
      }
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Failed to load data operations state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const lanes = useMemo(
    () =>
      LANE_ORDER.map((lane) => ({
        lane,
        meta: LANE_META[lane],
        config: sourceConfigs[lane] || normalizeLaneConfig(lane, null),
        laneHealth: health?.lanes?.[lane] || null,
        snapshot: snapshots?.[lane] || null,
      })),
    [health?.lanes, snapshots, sourceConfigs]
  );

  const updateConfig = (lane, field, value) => {
    setSourceConfigs((prev) => ({
      ...prev,
      [lane]: {
        ...(prev[lane] || normalizeLaneConfig(lane, null)),
        [field]: value,
      },
    }));
  };

  const saveSourceConfig = async (lane) => {
    const config = sourceConfigs[lane];
    if (!config) return;

    setSavingLane(lane);
    setError('');
    setStatusMessage('');
    try {
      const response = await invokeMemberFunction('updateFittingDataOps', {
        action: 'save_source',
        lane,
        endpointUrl: config.endpointUrl,
        authHeader: config.authHeader,
        cadenceMinutes: Number(config.cadenceMinutes || laneDefaults(lane).cadenceMinutes),
        ttlMinutes: Number(config.ttlMinutes || laneDefaults(lane).ttlMinutes),
        enabled: Boolean(config.enabled),
        notes: config.notes,
      });
      const payload = response?.data || response;
      if (!payload?.success) {
        throw new Error(payload?.error || `Unable to save ${lane} source config.`);
      }
      setStatusMessage(`${LANE_META[lane]?.label || lane} source saved.`);
      await loadSnapshot();
    } catch (err) {
      setError(err?.data?.error || err?.message || `Unable to save ${lane} source config.`);
    } finally {
      setSavingLane('');
    }
  };

  const runDueSyncs = async ({ dryRun = false, forceAll = false } = {}) => {
    setOrchestrating(dryRun ? 'dry' : 'run');
    setError('');
    setStatusMessage('');
    try {
      const response = await invokeMemberFunction('updateFittingDataOps', {
        action: 'run_due_syncs',
        mode: 'auto',
        dryRun,
        forceAll,
        emitAlerts: true,
      });
      const payload = response?.data || response;
      if (!payload?.success) {
        throw new Error(payload?.error || 'Unable to run due sync orchestration.');
      }

      const syncedCount = Array.isArray(payload?.synced) ? payload.synced.length : 0;
      const skippedCount = Array.isArray(payload?.skipped) ? payload.skipped.length : 0;
      const alertCount = Array.isArray(payload?.alertsEmitted) ? payload.alertsEmitted.length : 0;
      if (dryRun) {
        const dueCount = Array.isArray(payload?.duePlan)
          ? payload.duePlan.filter((entry) => entry?.selected && entry?.due).length
          : 0;
        setStatusMessage(`Due-sync dry run complete: ${dueCount} lane(s) due.`);
      } else {
        setStatusMessage(`Due-sync run complete: ${syncedCount} synced, ${skippedCount} skipped, ${alertCount} alert event(s).`);
      }
      await loadSnapshot();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Unable to run due sync orchestration.');
    } finally {
      setOrchestrating('');
    }
  };

  const runSync = async (lane, mode) => {
    setSyncingLane(`${lane}:${mode}`);
    setError('');
    setStatusMessage('');
    try {
      const response = await invokeMemberFunction('updateFittingDataOps', {
        action: 'run_sync',
        lane,
        mode,
      });
      const payload = response?.data || response;
      if (!payload?.success) {
        throw new Error(payload?.error || `Sync failed for ${lane}.`);
      }
      const sourceMode = payload?.snapshot?.source_mode || payload?.snapshot?.sourceMode || payload?.health?.sourceMode || mode;
      setStatusMessage(`${LANE_META[lane]?.label || lane} sync complete (${sourceMode}).`);
      await loadSnapshot();
    } catch (err) {
      setError(err?.data?.error || err?.message || `Sync failed for ${lane}.`);
    } finally {
      setSyncingLane('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white uppercase">Fitting Data Ops</h3>
          <p className="text-xs text-zinc-500">
            Manage source lanes, sync cadence, TTL, and freshness for fitting workbench data.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadSnapshot} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => runDueSyncs({ dryRun: true })} disabled={Boolean(orchestrating)}>
          <TimerReset className="w-3 h-3 mr-2" />
          {orchestrating === 'dry' ? 'Running Dry Run...' : 'Due Sync Dry Run'}
        </Button>
        <Button size="sm" onClick={() => runDueSyncs({ dryRun: false })} disabled={Boolean(orchestrating)}>
          <Clock3 className="w-3 h-3 mr-2" />
          {orchestrating === 'run' ? 'Running Syncs...' : 'Run Due Syncs'}
        </Button>
      </div>

      <section className="p-4 border border-zinc-800/70 rounded bg-zinc-900/30">
        <h4 className="text-sm font-bold text-white uppercase mb-2">Auto Scheduler Status</h4>
        {!schedulerTelemetry ? (
          <div className="text-xs text-zinc-500">No scheduler telemetry available yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
              <div className="text-zinc-500 uppercase text-[10px] tracking-widest">Leader Lease</div>
              <div className={schedulerTelemetry.leaderActive ? 'text-green-300' : 'text-zinc-400'}>
                {schedulerTelemetry.leaderActive ? 'Active' : 'Idle'}
              </div>
            </div>
            <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
              <div className="text-zinc-500 uppercase text-[10px] tracking-widest">Last Run</div>
              <div className="text-zinc-300">
                {schedulerTelemetry.lastRunAt
                  ? new Date(schedulerTelemetry.lastRunAt).toLocaleString()
                  : 'Never'}
              </div>
            </div>
            <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
              <div className="text-zinc-500 uppercase text-[10px] tracking-widest">Last Result</div>
              <div className="text-zinc-300">
                {schedulerTelemetry.lastResult
                  ? `${Number(schedulerTelemetry.lastResult.synced || 0)} synced / ${Number(schedulerTelemetry.lastResult.skipped || 0)} skipped`
                  : 'None'}
              </div>
            </div>
            <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
              <div className="text-zinc-500 uppercase text-[10px] tracking-widest">Last Error</div>
              <div className={schedulerTelemetry.lastError ? 'text-red-300' : 'text-zinc-400'}>
                {schedulerTelemetry.lastError?.message || 'None'}
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 border border-zinc-700/70 rounded p-2 bg-zinc-950/50 space-y-2">
          <div className="text-zinc-500 uppercase text-[10px] tracking-widest">Voice Lifecycle Fallback</div>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={voiceLifecycleFallbackEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                if (typeof window !== 'undefined') {
                  setVoiceLifecycleFallbackEnabled(window.localStorage, enabled);
                }
                setVoiceLifecycleFallbackEnabledState(enabled);
              }}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
            />
            Enable `sweepVoiceNetLifecycle` fallback in data-ops scheduler loop
          </label>
          <div className="text-[11px] text-zinc-500">
            Default is disabled. Enable only when cron/external automation for voice lifecycle is unavailable.
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="p-3 border border-red-500/40 bg-red-500/10 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {statusMessage && (
        <div role="status" className="p-3 border border-green-500/40 bg-green-500/10 rounded text-xs text-green-300">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {lanes.map(({ lane, meta, config, laneHealth, snapshot }) => {
          const status = String(laneHealth?.status || 'stale').toLowerCase();
          const style = statusClasses(status);
          const Icon = style.icon;
          const syncBusy = syncingLane.startsWith(`${lane}:`);
          const saveBusy = savingLane === lane;

          return (
            <section
              key={lane}
              aria-label={`${meta.label} data lane`}
              className={`p-4 border rounded-lg space-y-3 ${style.panel}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">{meta.label}</h4>
                  <p className="text-[11px] text-zinc-300">{meta.description}</p>
                </div>
                <div className={`text-[10px] px-2 py-1 rounded border ${style.text} border-current uppercase font-semibold`}>
                  <Icon className="w-3 h-3 inline mr-1" />
                  {status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
                <div className="border border-zinc-700/60 rounded p-2 bg-zinc-950/40">
                  <div className="text-zinc-500 uppercase tracking-wide text-[10px]">Age</div>
                  <div>{formatAge(laneHealth?.ageMinutes)}</div>
                </div>
                <div className="border border-zinc-700/60 rounded p-2 bg-zinc-950/40">
                  <div className="text-zinc-500 uppercase tracking-wide text-[10px]">Records</div>
                  <div>{Number(laneHealth?.recordCount || snapshot?.recordCount || 0)}</div>
                </div>
                <div className="border border-zinc-700/60 rounded p-2 bg-zinc-950/40">
                  <div className="text-zinc-500 uppercase tracking-wide text-[10px]">Cadence</div>
                  <div>{Number(config.cadenceMinutes || 0)}m</div>
                </div>
                <div className="border border-zinc-700/60 rounded p-2 bg-zinc-950/40">
                  <div className="text-zinc-500 uppercase tracking-wide text-[10px]">TTL</div>
                  <div>{Number(config.ttlMinutes || 0)}m</div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={`lane-endpoint-${lane}`} className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Endpoint URL
                </label>
                <Input
                  id={`lane-endpoint-${lane}`}
                  value={config.endpointUrl}
                  onChange={(event) => updateConfig(lane, 'endpointUrl', event.target.value)}
                  placeholder="https://provider.example/api/fits"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`lane-auth-${lane}`} className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Auth Header
                </label>
                <Input
                  id={`lane-auth-${lane}`}
                  value={config.authHeader}
                  onChange={(event) => updateConfig(lane, 'authHeader', event.target.value)}
                  placeholder="Bearer <token>"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor={`lane-cadence-${lane}`} className="text-[10px] uppercase tracking-widest text-zinc-400">
                    Cadence (min)
                  </label>
                  <Input
                    id={`lane-cadence-${lane}`}
                    type="number"
                    min={1}
                    step={1}
                    value={config.cadenceMinutes}
                    onChange={(event) => updateConfig(lane, 'cadenceMinutes', Number(event.target.value || 1))}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`lane-ttl-${lane}`} className="text-[10px] uppercase tracking-widest text-zinc-400">
                    TTL (min)
                  </label>
                  <Input
                    id={`lane-ttl-${lane}`}
                    type="number"
                    min={1}
                    step={1}
                    value={config.ttlMinutes}
                    onChange={(event) => updateConfig(lane, 'ttlMinutes', Number(event.target.value || 1))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={`lane-enabled-${lane}`}
                  type="checkbox"
                  checked={Boolean(config.enabled)}
                  onChange={(event) => updateConfig(lane, 'enabled', event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
                />
                <label htmlFor={`lane-enabled-${lane}`} className="text-xs text-zinc-300">
                  Lane enabled for scheduled/auto syncs
                </label>
              </div>

              <div className="space-y-2">
                <label htmlFor={`lane-notes-${lane}`} className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Notes
                </label>
                <Textarea
                  id={`lane-notes-${lane}`}
                  className="min-h-[70px]"
                  value={config.notes}
                  onChange={(event) => updateConfig(lane, 'notes', event.target.value)}
                  placeholder="Provider details, token rotation notes, parse assumptions..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => saveSourceConfig(lane)} disabled={saveBusy}>
                  <Database className="w-3 h-3 mr-2" />
                  {saveBusy ? 'Saving...' : 'Save Source'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runSync(lane, 'auto')}
                  disabled={syncBusy}
                >
                  <Clock3 className="w-3 h-3 mr-2" />
                  {syncBusy ? 'Syncing...' : 'Sync Auto'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runSync(lane, 'seed')}
                  disabled={syncBusy}
                >
                  Seed Sync
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="p-4 border border-zinc-800/70 rounded bg-zinc-900/30">
        <h4 className="text-sm font-bold text-white uppercase mb-2">Cadence Queue</h4>
        {loading ? (
          <div className="text-xs text-zinc-500">Loading cadence queue...</div>
        ) : duePlan.length === 0 ? (
          <div className="text-xs text-zinc-500">No due plan available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {duePlan.map((entry) => {
              const lane = String(entry?.lane || '');
              const laneLabel = LANE_META[lane]?.label || lane;
              const due = Boolean(entry?.due);
              const enabled = entry?.enabled !== false;
              const reason = String(entry?.reason || 'unknown');
              const tone = !enabled
                ? 'border-zinc-700 text-zinc-400'
                : due
                  ? 'border-orange-500/50 text-orange-300'
                  : 'border-green-500/40 text-green-300';
              return (
                <div key={`due-${lane}`} className={`border rounded p-2 bg-zinc-950/50 ${tone}`}>
                  <div className="text-xs font-semibold uppercase">{laneLabel}</div>
                  <div className="text-[11px]">
                    {enabled ? (due ? 'Due' : 'Within cadence') : 'Disabled'}
                    {entry?.ageMinutes == null ? '' : ` · age ${entry.ageMinutes}m`}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-1">{reason.replaceAll('_', ' ')}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="p-4 border border-zinc-800/70 rounded bg-zinc-900/30">
        <h4 className="text-sm font-bold text-white uppercase mb-2">Recent Sync Runs</h4>
        {loading ? (
          <div className="text-xs text-zinc-500">Loading sync history...</div>
        ) : runs.length === 0 ? (
          <div className="text-xs text-zinc-500">No sync runs recorded yet.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {runs.map((run) => {
              const runStatus = String(run?.status || 'unknown').toLowerCase();
              const rowColor = runStatus === 'success' ? 'text-green-300 border-green-500/30' : runStatus === 'fallback' ? 'text-orange-300 border-orange-500/30' : 'text-zinc-300 border-zinc-700/70';
              return (
                <div key={run?.id || `${run?.lane}-${run?.finishedAt}`} className={`border rounded p-2 bg-zinc-950/50 ${rowColor}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-semibold uppercase">
                      {LANE_META[run?.lane]?.label || run?.lane || 'Unknown lane'} · {runStatus}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {run?.finishedAt ? new Date(run.finishedAt).toLocaleString() : 'n/a'}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    mode: {run?.sourceMode || 'unknown'} · records: {Number(run?.recordCount || 0)}
                  </div>
                  {run?.message && <div className="text-[11px] text-zinc-300 mt-1">{run.message}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="p-4 border border-zinc-800/70 rounded bg-zinc-900/30">
        <h4 className="text-sm font-bold text-white uppercase mb-2">Freshness Alerts</h4>
        {loading ? (
          <div className="text-xs text-zinc-500">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-xs text-zinc-500">No freshness alerts recorded.</div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const status = String(alert?.status || 'stale').toLowerCase();
              const statusTone = status === 'resolved'
                ? 'border-green-500/40 text-green-300'
                : 'border-red-500/40 text-red-300';
              return (
                <div key={`alert-${alert?.id || `${alert?.lane}-${alert?.createdAt}`}`} className={`border rounded p-2 bg-zinc-950/50 ${statusTone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase flex items-center gap-1">
                      <Siren className="w-3 h-3" />
                      {LANE_META[alert?.lane]?.label || alert?.lane || 'Unknown lane'} · {status}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {alert?.createdAt ? new Date(alert.createdAt).toLocaleString() : 'n/a'}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    age {Number(alert?.ageMinutes || 0)}m · ttl {Number(alert?.ttlMinutes || 0)}m · cadence {Number(alert?.cadenceMinutes || 0)}m
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="text-[11px] text-zinc-500 border border-zinc-800/70 rounded p-3 bg-zinc-900/20 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
        <div>
          `live` data lanes can degrade quickly during outages. Keep TTL conservative and ensure seed fallback remains usable for continuity.
        </div>
      </div>
    </div>
  );
}
