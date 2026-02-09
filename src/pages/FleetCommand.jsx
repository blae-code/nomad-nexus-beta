import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl } from '@/utils';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import TacticalMap from '@/components/tactical/TacticalMap';
import FittingWorkbench from '@/components/fleet/FittingWorkbench';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, CalendarClock, CheckCircle2, CloudSun, Gauge, Layers, Ship, Volume2, Wrench } from 'lucide-react';

const WEATHER_POINTS = [
  { key: 'microtech', label: 'MicroTech Corridor', lat: 64.13, lon: -21.82 },
  { key: 'crusader', label: 'Crusader Lane', lat: 25.27, lon: 55.29 },
  { key: 'stanton', label: 'Stanton Belt', lat: 34.05, lon: -118.24 },
  { key: 'daymar', label: 'Daymar Surface', lat: 31.2, lon: 121.47 },
  { key: 'yela', label: 'Yela Route', lat: 35.68, lon: 139.76 },
  { key: 'arccorp', label: 'ArcCorp Orbit', lat: 37.77, lon: -122.42 },
];

const SOUND_PROFILES = {
  quiet: { label: 'Quiet Bridge', tones: [98, 130, 196] },
  active: { label: 'Combat Drift', tones: [92, 164, 246] },
  debrief: { label: 'Debrief Glow', tones: [110, 175, 220] },
};

const DEFAULT_RESERVATION_FORM = {
  start_time: '',
  end_time: '',
  operation_mode: 'casual',
  purpose: '',
};

const DEFAULT_LOADOUT_FORM = {
  name: '',
  role: '',
  weapons: '',
  utilities: '',
  notes: '',
  tags: '',
};

const DEFAULT_ENGINEERING_FORM = {
  summary: '',
  category: 'systems',
  severity: 'medium',
  due_time: '',
};

function createDefaultState() {
  return {
    schema_version: 1,
    reservations: [],
    loadout_library: [],
    active_loadout_id: null,
    engineering_queue: [],
  };
}

function parseFleetCommandState(notes) {
  const text = String(notes || '');
  const regex = /\[fleet_command_state\]([\s\S]*?)\[\/fleet_command_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return createDefaultState();
  try {
    const state = JSON.parse(match[1]);
    return {
      schema_version: Number(state?.schema_version || 1),
      reservations: Array.isArray(state?.reservations) ? state.reservations : [],
      loadout_library: Array.isArray(state?.loadout_library) ? state.loadout_library : [],
      active_loadout_id: state?.active_loadout_id ? String(state.active_loadout_id) : null,
      engineering_queue: Array.isArray(state?.engineering_queue) ? state.engineering_queue : [],
    };
  } catch {
    return createDefaultState();
  }
}

function resolveWeatherPoint(location) {
  const normalized = String(location || '').toLowerCase();
  if (!normalized) return null;
  return WEATHER_POINTS.find((entry) => normalized.includes(entry.key)) || null;
}

function weatherLabel(code) {
  const numeric = Number(code);
  if (numeric === 0) return 'Clear';
  if (numeric <= 3) return 'Partly Cloudy';
  if (numeric <= 48) return 'Fog';
  if (numeric <= 67) return 'Rain';
  if (numeric <= 77) return 'Snow';
  if (numeric <= 99) return 'Storm';
  return 'Unknown';
}

function getPhaseGradient(phase) {
  const key = String(phase || '').toUpperCase();
  if (key === 'ACTIVE') return 'linear-gradient(140deg, rgba(9,46,34,0.7), rgba(10,10,12,0.98) 40%, rgba(28,19,8,0.75))';
  if (key === 'DEBRIEF' || key === 'ARCHIVED') return 'linear-gradient(140deg, rgba(18,25,42,0.7), rgba(10,10,12,0.98) 40%, rgba(28,14,24,0.65))';
  return 'linear-gradient(140deg, rgba(30,28,16,0.7), rgba(10,10,12,0.98) 40%, rgba(19,22,32,0.75))';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export default function FleetCommand() {
  const activeOp = useActiveOp();
  const [tab, setTab] = useState('database');
  const [assets, setAssets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [reservationForm, setReservationForm] = useState(DEFAULT_RESERVATION_FORM);
  const [loadoutForm, setLoadoutForm] = useState(DEFAULT_LOADOUT_FORM);
  const [engineeringForm, setEngineeringForm] = useState(DEFAULT_ENGINEERING_FORM);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [soundscape, setSoundscape] = useState(() => {
    if (typeof window === 'undefined') return 'quiet';
    return window.localStorage.getItem('fleet.soundscape.profile') || 'quiet';
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window === 'undefined') return 35;
    const parsed = Number(window.localStorage.getItem('fleet.soundscape.volume') || 35);
    return Number.isFinite(parsed) ? Math.max(5, Math.min(70, parsed)) : 35;
  });

  const activeEvent = useMemo(() => {
    if (activeOp?.activeEvent?.id) return activeOp.activeEvent;
    if (!activeOp?.activeEventId) return null;
    return events.find((event) => event.id === activeOp.activeEventId) || null;
  }, [activeOp?.activeEvent, activeOp?.activeEventId, events]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || assets[0] || null,
    [assets, selectedAssetId]
  );

  const selectedState = useMemo(
    () => parseFleetCommandState(selectedAsset?.maintenance_notes),
    [selectedAsset?.maintenance_notes]
  );

  const analytics = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    let operational = 0;
    let maintenance = 0;
    let destroyed = 0;
    let reservationsNextWeek = 0;
    let openEngineering = 0;
    let criticalEngineering = 0;
    let loadoutCount = 0;
    const byModel = {};

    for (const asset of assets) {
      const status = String(asset?.status || '').toUpperCase();
      if (status === 'OPERATIONAL') operational += 1;
      else if (status === 'MAINTENANCE') maintenance += 1;
      else if (status === 'DESTROYED') destroyed += 1;

      const model = String(asset?.model || 'Unknown');
      byModel[model] = (byModel[model] || 0) + 1;

      const state = parseFleetCommandState(asset?.maintenance_notes);
      loadoutCount += state.loadout_library.length;
      reservationsNextWeek += state.reservations.filter((entry) => {
        if (String(entry?.status || '').toLowerCase() !== 'scheduled') return false;
        const start = parseDate(entry.start_time)?.getTime();
        const end = parseDate(entry.end_time)?.getTime();
        return Boolean(start && end && end >= now && start <= weekFromNow);
      }).length;

      const openQueue = state.engineering_queue.filter((task) => {
        const statusKey = String(task?.status || '').toLowerCase();
        return statusKey !== 'resolved' && statusKey !== 'cancelled';
      });
      openEngineering += openQueue.length;
      criticalEngineering += openQueue.filter((task) => String(task?.severity || '').toLowerCase() === 'critical').length;
    }

    const readinessPct = assets.length === 0 ? 0 : Math.round((operational / assets.length) * 100);
    const modelBreakdown = Object.entries(byModel)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6);

    return {
      operational,
      maintenance,
      destroyed,
      readinessPct,
      reservationsNextWeek,
      openEngineering,
      criticalEngineering,
      loadoutCount,
      modelBreakdown,
    };
  }, [assets]);

  const loadFleetData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetList, eventList] = await Promise.all([
        base44.entities.FleetAsset.list('-updated_date', 250).catch(() => []),
        base44.entities.Event.list('-start_time', 120).catch(() => []),
      ]);
      setAssets(assetList || []);
      setEvents(eventList || []);
      if (!selectedAssetId && assetList?.[0]?.id) {
        setSelectedAssetId(assetList[0].id);
      }
    } catch (error) {
      console.error('FleetCommand load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load fleet command data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId]);

  useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  useEffect(() => {
    if (!base44.entities.FleetAsset?.subscribe) return undefined;
    const unsubscribe = base44.entities.FleetAsset.subscribe((event) => {
      setAssets((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((asset) => (asset.id === event.id ? event.data : asset));
        if (event.type === 'delete') return prev.filter((asset) => asset.id !== event.id);
        return prev;
      });
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('fleet.soundscape.profile', soundscape);
  }, [soundscape]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('fleet.soundscape.volume', String(soundVolume));
  }, [soundVolume]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const point = resolveWeatherPoint(selectedAsset?.location);
      if (!point) {
        setWeather(null);
        return;
      }
      setWeatherLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&current=temperature_2m,wind_speed_10m,precipitation,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
        const payload = await response.json();
        const current = payload?.current || {};
        if (!active) return;
        setWeather({
          source: 'live',
          point,
          temperatureC: current.temperature_2m,
          windKph: current.wind_speed_10m,
          precipitation: current.precipitation,
          weatherCode: current.weather_code,
          label: weatherLabel(current.weather_code),
          observedAt: payload?.current?.time || new Date().toISOString(),
        });
      } catch (error) {
        if (!active) return;
        console.warn('Weather lookup failed:', error?.message);
        setWeather({
          source: 'estimated',
          point,
          temperatureC: null,
          windKph: null,
          precipitation: null,
          weatherCode: null,
          label: 'Estimated conditions unavailable',
          observedAt: new Date().toISOString(),
        });
      } finally {
        if (active) setWeatherLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedAsset?.location]);

  const runAssetAction = async (payload, successMessage) => {
    if (!selectedAsset?.id) return;
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateFleetCommandAsset', {
        assetId: selectedAsset.id,
        eventId: activeOp?.activeEventId || null,
        ...payload,
      });
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'Fleet update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || result?.summary || 'Fleet command updated.' });
      }
      await loadFleetData();
    } catch (error) {
      console.error('Fleet command action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Fleet command update failed.' });
    } finally {
      setActionBusy(false);
    }
  };

  const submitReservation = async () => {
    if (!reservationForm.start_time || !reservationForm.end_time) return;
    await runAssetAction(
      {
        action: 'reserve_asset',
        reservation: {
          start_time: reservationForm.start_time,
          end_time: reservationForm.end_time,
          operation_mode: reservationForm.operation_mode,
          purpose: reservationForm.purpose,
        },
      },
      'Fleet reservation saved.'
    );
    setReservationForm(DEFAULT_RESERVATION_FORM);
  };

  const saveLoadout = async () => {
    if (!loadoutForm.name.trim()) return;
    const profile = {
      role: loadoutForm.role,
      weapons: loadoutForm.weapons,
      utilities: loadoutForm.utilities,
      notes: loadoutForm.notes,
    };
    const tags = loadoutForm.tags
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    await runAssetAction(
      {
        action: 'save_loadout',
        loadout: {
          name: loadoutForm.name.trim(),
          profile,
          tags,
        },
      },
      'Loadout saved to library.'
    );
    setLoadoutForm(DEFAULT_LOADOUT_FORM);
  };

  const queueEngineering = async () => {
    if (!engineeringForm.summary.trim()) return;
    await runAssetAction(
      {
        action: 'queue_engineering_task',
        task: {
          summary: engineeringForm.summary.trim(),
          category: engineeringForm.category,
          severity: engineeringForm.severity,
          due_time: engineeringForm.due_time || null,
        },
      },
      'Engineering task queued.'
    );
    setEngineeringForm(DEFAULT_ENGINEERING_FORM);
  };

  const applyFittingPlanToAsset = async (fitPlan) => {
    if (!selectedAsset?.id) {
      return { ok: false, message: 'Select an active asset before applying a fitting plan.' };
    }
    const profile = {
      fit_type: fitPlan?.fitType || 'ship',
      template_id: fitPlan?.templateId || '',
      role_tag: fitPlan?.roleTag || '',
      slot_assignments: fitPlan?.slotAssignments || {},
      stats: fitPlan?.stats || {},
      adjusted_stats: fitPlan?.adjustedStats || fitPlan?.stats || {},
      scenario_profile: fitPlan?.scenarioProfile || null,
      score: Number(fitPlan?.score || 0),
      scenario_score: Number(fitPlan?.scenarioScore || fitPlan?.score || 0),
      scope_type: fitPlan?.scopeType || 'personal',
      scope_id: fitPlan?.scopeId || null,
      notes: fitPlan?.notes || '',
    };
    const tags = [fitPlan?.fitType, fitPlan?.roleTag, 'fitting_lab']
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);

    await runAssetAction(
      {
        action: 'save_loadout',
        loadout: {
          name: String(fitPlan?.title || `${selectedAsset?.name || 'Asset'} Fit`),
          profile,
          tags,
        },
      },
      'Fitting plan saved to active asset loadout library.'
    );
    return { ok: true };
  };

  const previewSoundscape = () => {
    const profile = SOUND_PROFILES[soundscape] || SOUND_PROFILES.quiet;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      setBanner({ type: 'error', message: 'Audio preview is not supported on this device.' });
      return;
    }
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.value = (soundVolume / 100) * 0.08;
    const now = ctx.currentTime;
    profile.tones.forEach((tone, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tone;
      osc.connect(gain);
      gain.connect(master);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.4 + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
      osc.start(now);
      osc.stop(now + 2.8);
    });
    window.setTimeout(() => {
      ctx.close().catch(() => null);
    }, 3200);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading Fleet Command...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" style={{ backgroundImage: getPhaseGradient(activeEvent?.phase) }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Fleet Command</h1>
          <p className="text-zinc-400 text-sm">Scheduler, loadout library, engineering queue, tactical map, analytics, and weather watch</p>
          <div className="mt-2 text-xs text-zinc-500">
            Active operation: <span className="text-orange-300">{activeEvent?.title || 'None selected'}</span> · Phase:{' '}
            <span className="text-zinc-300">{String(activeEvent?.phase || 'PLANNING')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('MissionControl')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">
            Operations
          </a>
          <a href={createPageUrl('CommsConsole')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">
            Voice Comms
          </a>
        </div>
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`inline-flex rounded border px-3 py-1 text-xs ${
            banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Assets</div>
          <div className="text-lg font-bold text-white">{assets.length}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Readiness</div>
          <div className="text-lg font-bold text-green-300">{analytics.readinessPct}%</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Reservations (7d)</div>
          <div className="text-lg font-bold text-cyan-300">{analytics.reservationsNextWeek}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Engineering Open</div>
          <div className={`text-lg font-bold ${analytics.criticalEngineering > 0 ? 'text-red-300' : 'text-orange-300'}`}>
            {analytics.openEngineering}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 flex items-center gap-3">
        <label htmlFor="fleet-command-asset" className="text-xs uppercase tracking-widest text-zinc-500">
          Active Asset
        </label>
        <select
          id="fleet-command-asset"
          value={selectedAsset?.id || ''}
          onChange={(event) => setSelectedAssetId(event.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded min-w-[280px]"
        >
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} · {asset.model || 'Unknown model'}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="database">Asset Database</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
          <TabsTrigger value="loadouts">Loadout Library</TabsTrigger>
          <TabsTrigger value="fitting">Fitting Lab</TabsTrigger>
          <TabsTrigger value="engineering">Engineering Queue</TabsTrigger>
          <TabsTrigger value="analytics">Fleet Analytics</TabsTrigger>
          <TabsTrigger value="environment">Environment + Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Ship className="w-3 h-3" />
                Fleet Roster
              </div>
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`w-full text-left border rounded p-2 transition ${
                    selectedAsset?.id === asset.id ? 'border-orange-500/60 bg-orange-500/10' : 'border-zinc-700/70 bg-zinc-950/50'
                  }`}
                >
                  <div className="text-sm text-white font-semibold">{asset.name}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">{asset.model} · {asset.status}</div>
                </button>
              ))}
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              {!selectedAsset ? (
                <div className="text-zinc-500 text-sm">No fleet assets available.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl text-white font-black uppercase">{selectedAsset.name}</div>
                      <div className="text-xs text-zinc-500 uppercase">{selectedAsset.model || 'Unknown model'} · {selectedAsset.type || 'Unknown type'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs uppercase ${String(selectedAsset.status || '').toUpperCase() === 'OPERATIONAL' ? 'text-green-300' : 'text-orange-300'}`}>
                        {selectedAsset.status || 'UNKNOWN'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Location</div>
                      <div className="text-xs text-zinc-200">{selectedAsset.location || 'Unassigned'}</div>
                    </div>
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Active Loadout</div>
                      <div className="text-xs text-zinc-200">{selectedState.active_loadout_id || 'None'}</div>
                    </div>
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Engineering Open</div>
                      <div className="text-xs text-zinc-200">
                        {
                          selectedState.engineering_queue.filter((task) => {
                            const status = String(task?.status || '').toLowerCase();
                            return status !== 'resolved' && status !== 'cancelled';
                          }).length
                        }
                      </div>
                    </div>
                  </div>
                  <div className="border border-zinc-800 rounded overflow-hidden">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800 bg-zinc-950/40">
                      Tactical Map Integration
                    </div>
                    <TacticalMap eventId={activeOp?.activeEventId || null} activeEvent={activeEvent || null} compact />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <CalendarClock className="w-3 h-3" />
                Fleet Scheduler
              </div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500" htmlFor="fleet-reserve-start">Start</label>
              <Input
                id="fleet-reserve-start"
                type="datetime-local"
                value={reservationForm.start_time}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, start_time: event.target.value }))}
              />
              <label className="text-[10px] uppercase tracking-widest text-zinc-500" htmlFor="fleet-reserve-end">End</label>
              <Input
                id="fleet-reserve-end"
                type="datetime-local"
                value={reservationForm.end_time}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, end_time: event.target.value }))}
              />
              <label className="text-[10px] uppercase tracking-widest text-zinc-500" htmlFor="fleet-reserve-mode">Operation mode</label>
              <select
                id="fleet-reserve-mode"
                value={reservationForm.operation_mode}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, operation_mode: event.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                <option value="casual">Casual</option>
                <option value="focused">Focused</option>
              </select>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500" htmlFor="fleet-reserve-purpose">Purpose</label>
              <Textarea
                id="fleet-reserve-purpose"
                className="min-h-[80px]"
                value={reservationForm.purpose}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, purpose: event.target.value }))}
                placeholder="Patrol, mission support, escort..."
              />
              <Button onClick={submitReservation} disabled={actionBusy || !selectedAsset || !reservationForm.start_time || !reservationForm.end_time}>
                {actionBusy ? 'Updating...' : 'Reserve Asset'}
              </Button>
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Reservation Queue</div>
              {selectedState.reservations.length === 0 ? (
                <div className="text-xs text-zinc-500">No reservations recorded.</div>
              ) : (
                selectedState.reservations
                  .slice()
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((entry) => (
                    <div key={entry.reservation_id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs text-white font-semibold">
                            {new Date(entry.start_time).toLocaleString()} → {new Date(entry.end_time).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase">
                            {entry.operation_mode} · {entry.status}
                          </div>
                          {entry.purpose && <div className="text-xs text-zinc-300 mt-1">{entry.purpose}</div>}
                        </div>
                        {String(entry.status || '').toLowerCase() === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runAssetAction({ action: 'cancel_reservation', reservationId: entry.reservation_id }, 'Reservation cancelled.')}
                            disabled={actionBusy}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="loadouts" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Save Loadout
              </div>
              <Input value={loadoutForm.name} onChange={(event) => setLoadoutForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Loadout name" />
              <Input value={loadoutForm.role} onChange={(event) => setLoadoutForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role profile" />
              <Input value={loadoutForm.weapons} onChange={(event) => setLoadoutForm((prev) => ({ ...prev, weapons: event.target.value }))} placeholder="Weapons" />
              <Input value={loadoutForm.utilities} onChange={(event) => setLoadoutForm((prev) => ({ ...prev, utilities: event.target.value }))} placeholder="Utilities / modules" />
              <Textarea
                className="min-h-[80px]"
                value={loadoutForm.notes}
                onChange={(event) => setLoadoutForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Doctrine notes"
              />
              <Input value={loadoutForm.tags} onChange={(event) => setLoadoutForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
              <Button onClick={saveLoadout} disabled={actionBusy || !selectedAsset || !loadoutForm.name.trim()}>
                {actionBusy ? 'Saving...' : 'Save Loadout'}
              </Button>
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Library</div>
              {selectedState.loadout_library.length === 0 ? (
                <div className="text-xs text-zinc-500">No loadouts saved for this asset.</div>
              ) : (
                selectedState.loadout_library.map((entry) => (
                  <div key={entry.loadout_id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{entry.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">
                          {entry.loadout_id} {selectedState.active_loadout_id === entry.loadout_id ? '· ACTIVE' : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAssetAction({ action: 'apply_loadout', loadoutId: entry.loadout_id }, 'Loadout applied.')}
                        disabled={actionBusy}
                      >
                        Apply
                      </Button>
                    </div>
                    <div className="text-xs text-zinc-300">{JSON.stringify(entry.profile)}</div>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span key={`${entry.loadout_id}-${tag}`} className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fitting" className="space-y-4 mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
            <div className="mb-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Ship, Vehicle, and FPS Fitting</div>
              <div className="text-xs text-zinc-400 mt-1">
                Build personal fits, publish squad/wing/fleet plans, and collaborate with threaded fit notes.
              </div>
            </div>
            <FittingWorkbench
              activeEventId={activeOp?.activeEventId || null}
              activeEventTitle={activeEvent?.title || ''}
              onApplyToActiveAsset={applyFittingPlanToAsset}
            />
          </div>
        </TabsContent>

        <TabsContent value="engineering" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Wrench className="w-3 h-3" />
                Queue Task
              </div>
              <Textarea
                className="min-h-[90px]"
                value={engineeringForm.summary}
                onChange={(event) => setEngineeringForm((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Describe maintenance / engineering work"
              />
              <Input
                value={engineeringForm.category}
                onChange={(event) => setEngineeringForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Category"
              />
              <select
                value={engineeringForm.severity}
                onChange={(event) => setEngineeringForm((prev) => ({ ...prev, severity: event.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <Input
                type="datetime-local"
                value={engineeringForm.due_time}
                onChange={(event) => setEngineeringForm((prev) => ({ ...prev, due_time: event.target.value }))}
              />
              <Button onClick={queueEngineering} disabled={actionBusy || !selectedAsset || !engineeringForm.summary.trim()}>
                {actionBusy ? 'Updating...' : 'Queue Task'}
              </Button>
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Engineering Queue</div>
              {selectedState.engineering_queue.length === 0 ? (
                <div className="text-xs text-zinc-500">No engineering tasks queued.</div>
              ) : (
                selectedState.engineering_queue.map((task) => {
                  const status = String(task.status || '').toLowerCase();
                  const isOpen = status !== 'resolved' && status !== 'cancelled';
                  return (
                    <div key={task.task_id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-white font-semibold">{task.summary}</div>
                          <div className="text-[10px] text-zinc-500 uppercase">
                            {task.category} · {task.severity} · {task.status}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOpen && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runAssetAction({ action: 'update_engineering_task', taskId: task.task_id, status: 'in_progress' }, 'Task moved to in progress.')}
                              disabled={actionBusy}
                            >
                              Start
                            </Button>
                          )}
                          {status !== 'resolved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                runAssetAction(
                                  {
                                    action: 'update_engineering_task',
                                    taskId: task.task_id,
                                    status: 'resolved',
                                    resolution_notes: 'Resolved in Fleet Command',
                                  },
                                  'Task marked resolved.'
                                )
                              }
                              disabled={actionBusy}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                      {task.due_time && <div className="text-[10px] text-zinc-400">Due: {new Date(task.due_time).toLocaleString()}</div>}
                      {task.resolution_notes && <div className="text-xs text-zinc-300">Resolution: {task.resolution_notes}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                Operational
              </div>
              <div className="text-xl font-bold text-green-300">{analytics.operational}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Maintenance
              </div>
              <div className="text-xl font-bold text-orange-300">{analytics.maintenance}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Open Engineering
              </div>
              <div className="text-xl font-bold text-red-300">{analytics.openEngineering}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Loadouts
              </div>
              <div className="text-xl font-bold text-cyan-300">{analytics.loadoutCount}</div>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Model Coverage</div>
            {analytics.modelBreakdown.length === 0 ? (
              <div className="text-xs text-zinc-500">No assets available.</div>
            ) : (
              analytics.modelBreakdown.map(([model, count]) => (
                <div key={String(model)} className="flex items-center justify-between border border-zinc-700/70 rounded px-3 py-2 bg-zinc-950/50">
                  <div className="text-sm text-zinc-200">{model}</div>
                  <div className="text-xs text-zinc-500">{count}</div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <CloudSun className="w-3 h-3" />
                Environmental Awareness
              </div>
              {!selectedAsset?.location && <div className="text-xs text-zinc-500">Assign asset location for weather lookup.</div>}
              {selectedAsset?.location && (
                <>
                  <div className="text-xs text-zinc-400">
                    Asset location: <span className="text-zinc-200">{selectedAsset.location}</span>
                  </div>
                  {weatherLoading && <div className="text-xs text-zinc-500">Fetching weather brief...</div>}
                  {!weatherLoading && weather && (
                    <div className="space-y-2 border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                      <div className="text-sm text-white font-semibold">{weather.point?.label || 'Weather point'}</div>
                      <div className="text-xs text-zinc-300">{weather.label}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
                        <div>Temp: {weather.temperatureC ?? 'n/a'}°C</div>
                        <div>Wind: {weather.windKph ?? 'n/a'} km/h</div>
                        <div>Precip: {weather.precipitation ?? 'n/a'} mm</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase">
                        Source: {weather.source} · {weather.observedAt ? new Date(weather.observedAt).toLocaleString() : 'n/a'}
                      </div>
                    </div>
                  )}
                  {!weatherLoading && !weather && (
                    <div className="text-xs text-zinc-500">No weather point configured for this location keyword.</div>
                  )}
                </>
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                Ambient Soundscapes
              </div>
              <label htmlFor="fleet-sound-profile" className="text-[10px] uppercase tracking-widest text-zinc-500">Profile</label>
              <select
                id="fleet-sound-profile"
                value={soundscape}
                onChange={(event) => setSoundscape(event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {Object.entries(SOUND_PROFILES).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.label}
                  </option>
                ))}
              </select>

              <label htmlFor="fleet-sound-volume" className="text-[10px] uppercase tracking-widest text-zinc-500">
                Volume: {soundVolume}%
              </label>
              <input
                id="fleet-sound-volume"
                type="range"
                min={5}
                max={70}
                value={soundVolume}
                onChange={(event) => setSoundVolume(Number(event.target.value))}
                className="w-full"
              />

              <Button size="sm" variant="outline" onClick={previewSoundscape}>
                Preview 3s Soundscape
              </Button>

              <div className="text-[10px] text-zinc-500">
                Dynamic backgrounds follow operation phase. Current phase:{' '}
                <span className="text-zinc-300">{String(activeEvent?.phase || 'PLANNING')}</span>.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
