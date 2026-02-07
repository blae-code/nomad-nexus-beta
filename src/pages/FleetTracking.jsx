import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, List, Activity, BarChart3, History, AlertTriangle } from 'lucide-react';
import { LoadingState } from '@/components/common/UIStates';
import FleetMap from '@/components/fleet/FleetMap';
import FleetList from '@/components/fleet/FleetList';
import AssetDetails from '@/components/fleet/AssetDetails';
import FleetTelemetryPanel from '@/components/fleet/FleetTelemetryPanel';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';

const DEPLOYMENT_STATUSES = ['deployed', 'recalled', 'maintenance_transfer', 'standby'];

const DEFAULT_HISTORY_FORM = {
  status: 'deployed',
  eventId: '',
  location: '',
  note: '',
};

function parseFleetState(notes) {
  const text = String(notes || '');
  const regex = /\[fleet_command_state\]([\s\S]*?)\[\/fleet_command_state\]/i;
  const match = text.match(regex);
  if (!match?.[1]) return { reservations: [], engineering_queue: [] };
  try {
    const parsed = JSON.parse(match[1]);
    return {
      reservations: Array.isArray(parsed?.reservations) ? parsed.reservations : [],
      engineering_queue: Array.isArray(parsed?.engineering_queue) ? parsed.engineering_queue : [],
    };
  } catch {
    return { reservations: [], engineering_queue: [] };
  }
}

function asDateLabel(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function calculateAssetAlerts(asset) {
  const alerts = [];
  const state = parseFleetState(asset?.maintenance_notes);
  const nowMs = Date.now();
  const status = String(asset?.status || '').toUpperCase();

  const openEngineering = state.engineering_queue.filter((entry) => {
    const taskStatus = String(entry?.status || '').toLowerCase();
    return taskStatus !== 'resolved' && taskStatus !== 'cancelled';
  });
  const criticalEngineering = openEngineering.filter((entry) => String(entry?.severity || '').toLowerCase() === 'critical');
  if (criticalEngineering.length > 0) {
    alerts.push({
      key: `${asset.id}:critical-eng-open`,
      severity: 'critical',
      message: `${criticalEngineering.length} critical engineering task(s) unresolved`,
      sourceTime: asset?.updated_date || asset?.created_date || null,
    });
  }

  const highEngineering = openEngineering.filter((entry) => String(entry?.severity || '').toLowerCase() === 'high');
  if (highEngineering.length > 0) {
    alerts.push({
      key: `${asset.id}:high-eng-open`,
      severity: 'high',
      message: `${highEngineering.length} high-severity engineering task(s) pending`,
      sourceTime: asset?.updated_date || asset?.created_date || null,
    });
  }

  const overdueReservations = state.reservations.filter((entry) => {
    const reservationStatus = String(entry?.status || '').toLowerCase();
    const endMs = entry?.end_time ? new Date(entry.end_time).getTime() : null;
    return reservationStatus === 'scheduled' && endMs && endMs < nowMs;
  });
  if (overdueReservations.length > 0) {
    alerts.push({
      key: `${asset.id}:overdue-reservations`,
      severity: 'medium',
      message: `${overdueReservations.length} scheduled reservation(s) are overdue`,
      sourceTime: overdueReservations[0]?.end_time || null,
    });
  }

  if (status === 'MAINTENANCE') {
    alerts.push({
      key: `${asset.id}:maintenance-status`,
      severity: 'medium',
      message: 'Asset currently marked as MAINTENANCE',
      sourceTime: asset?.updated_date || null,
    });
  }

  if (status === 'DESTROYED') {
    alerts.push({
      key: `${asset.id}:destroyed-status`,
      severity: 'critical',
      message: 'Asset marked DESTROYED',
      sourceTime: asset?.updated_date || null,
    });
  }

  const fuel = Number(asset?.fuel_level ?? asset?.fuel ?? -1);
  if (Number.isFinite(fuel) && fuel >= 0 && fuel <= 20) {
    alerts.push({
      key: `${asset.id}:low-fuel`,
      severity: fuel <= 10 ? 'high' : 'medium',
      message: `Fuel level low (${fuel}%)`,
      sourceTime: asset?.updated_date || null,
    });
  }

  const health = Number(asset?.health ?? asset?.hull_integrity ?? -1);
  if (Number.isFinite(health) && health >= 0 && health <= 50) {
    alerts.push({
      key: `${asset.id}:low-health`,
      severity: health <= 25 ? 'critical' : 'high',
      message: `Hull/health degraded (${health}%)`,
      sourceTime: asset?.updated_date || null,
    });
  }

  const updatedMs = new Date(asset?.updated_date || asset?.created_date || 0).getTime();
  if (Number.isFinite(updatedMs) && nowMs - updatedMs > 48 * 60 * 60 * 1000) {
    alerts.push({
      key: `${asset.id}:stale-telemetry`,
      severity: 'low',
      message: 'Telemetry appears stale (no update in >48h)',
      sourceTime: asset?.updated_date || asset?.created_date || null,
    });
  }

  return alerts;
}

export default function FleetTracking() {
  const activeOp = useActiveOp();
  const [assets, setAssets] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historyForm, setHistoryForm] = useState(DEFAULT_HISTORY_FORM);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const deploymentHistory = useMemo(() => {
    return (eventLogs || [])
      .filter((entry) => String(entry?.type || '').toUpperCase() === 'FLEET_DEPLOYMENT_HISTORY')
      .map((entry) => ({
        id: entry.id,
        ...entry.details,
        createdAt: entry.created_date || null,
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [eventLogs]);

  const acknowledgedAlerts = useMemo(() => {
    const map = new Map();
    for (const entry of eventLogs || []) {
      if (String(entry?.type || '').toUpperCase() !== 'FLEET_CONDITION_ALERT_ACK') continue;
      const details = entry?.details || {};
      const key = String(details?.alert_key || '');
      if (!key) continue;
      const at = new Date(entry?.created_date || 0).getTime();
      const existing = map.get(key);
      if (!existing || at >= existing.at) {
        map.set(key, {
          at,
          acknowledgedAt: entry?.created_date || null,
          actorMemberId: entry?.actor_member_profile_id || null,
        });
      }
    }
    return map;
  }, [eventLogs]);

  const conditionAlerts = useMemo(() => {
    const alerts = [];
    for (const asset of assets) {
      const assetAlerts = calculateAssetAlerts(asset);
      for (const alert of assetAlerts) {
        const ack = acknowledgedAlerts.get(alert.key);
        alerts.push({
          ...alert,
          assetId: asset.id,
          assetName: asset?.name || asset?.model || asset.id,
          acknowledged: Boolean(ack),
          acknowledgedAt: ack?.acknowledgedAt || null,
        });
      }
    }
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => {
      const sev = (severityOrder[a.severity] ?? 10) - (severityOrder[b.severity] ?? 10);
      if (sev !== 0) return sev;
      return new Date(b.sourceTime || 0).getTime() - new Date(a.sourceTime || 0).getTime();
    });
  }, [assets, acknowledgedAlerts]);

  useEffect(() => {
    loadFleetData();
    if (!base44.entities.FleetAsset?.subscribe) return undefined;
    const unsubscribeAssets = base44.entities.FleetAsset.subscribe((event) => {
      if (event.type === 'update') {
        setAssets((prev) => prev.map((asset) => (asset.id === event.id ? event.data : asset)));
      } else if (event.type === 'create') {
        setAssets((prev) => [...prev, event.data]);
      } else if (event.type === 'delete') {
        setAssets((prev) => prev.filter((asset) => asset.id !== event.id));
      }
    });
    return () => unsubscribeAssets?.();
  }, []);

  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [assetList, eventList, logsList] = await Promise.all([
        base44.entities.FleetAsset.list('-updated_date', 250).catch(() => []),
        base44.entities.Event.list('-start_time', 180).catch(() => []),
        base44.entities.EventLog.list('-created_date', 500).catch(() => []),
      ]);
      setAssets(assetList || []);
      setEvents(eventList || []);
      setEventLogs(logsList || []);
      if (!selectedAsset && assetList?.[0]) {
        setSelectedAsset(assetList[0]);
      } else if (selectedAsset) {
        const refreshed = (assetList || []).find((asset) => asset.id === selectedAsset.id);
        if (refreshed) setSelectedAsset(refreshed);
      }
    } catch (error) {
      console.error('Failed to load fleet data:', error);
      setBanner({ type: 'error', message: 'Failed to load fleet tracking data.' });
    } finally {
      setLoading(false);
    }
  };

  const getDeployedEvents = (assetId) => {
    return events.filter((event) => Array.isArray(event.assigned_asset_ids) && event.assigned_asset_ids.includes(assetId));
  };

  const selectedAssetHistory = useMemo(() => {
    if (!selectedAsset?.id) return deploymentHistory;
    return deploymentHistory.filter((entry) => String(entry.asset_id || '') === String(selectedAsset.id));
  }, [deploymentHistory, selectedAsset?.id]);

  const submitDeploymentHistory = async () => {
    if (!selectedAsset?.id) return;
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateFleetTrackingRecord', {
        action: 'log_deployment',
        assetId: selectedAsset.id,
        eventId: historyForm.eventId || null,
        status: historyForm.status,
        location: historyForm.location.trim(),
        note: historyForm.note.trim(),
      });
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'Failed to log deployment history.' });
      } else {
        setBanner({ type: 'success', message: 'Deployment history recorded.' });
        setHistoryForm(DEFAULT_HISTORY_FORM);
      }
      await loadFleetData();
    } catch (error) {
      console.error('Deployment history action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Failed to log deployment history.' });
    } finally {
      setActionBusy(false);
    }
  };

  const acknowledgeAlert = async (alert) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateFleetTrackingRecord', {
        action: 'ack_condition_alert',
        assetId: alert.assetId,
        alertKey: alert.key,
        severity: alert.severity,
      });
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'Failed to acknowledge alert.' });
      } else {
        setBanner({ type: 'success', message: 'Condition alert acknowledged.' });
      }
      await loadFleetData();
    } catch (error) {
      console.error('Alert acknowledgement failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Failed to acknowledge alert.' });
    } finally {
      setActionBusy(false);
    }
  };

  const alertCount = conditionAlerts.filter((alert) => !alert.acknowledged).length;

  if (loading) {
    return (
      <div className="max-w-full mx-auto h-screen">
        <LoadingState label="Loading fleet data..." />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto h-screen flex flex-col">
      <div className="border-b border-zinc-800 p-4 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">Fleet Tracking</h1>
            <p className="text-zinc-400 text-sm">Real-time asset locations, deployment history, and condition alerts</p>
            {banner && (
              <div
                role={banner.type === 'error' ? 'alert' : 'status'}
                className={`inline-flex mt-2 rounded border px-2 py-0.5 text-[10px] ${
                  banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
                }`}
              >
                {banner.message}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-400">{assets.length}</div>
            <div className="text-xs text-zinc-400">Assets Tracked</div>
            <div className="text-xs text-orange-300 mt-1">Active Alerts: {alertCount}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="map" className="flex-1 flex flex-col border-t border-zinc-800">
        <div className="border-b border-zinc-800 px-4 bg-zinc-900/50">
          <TabsList>
            <TabsTrigger value="map">
              <MapPin className="w-4 h-4 mr-2" />
              Live Map
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              Fleet List
            </TabsTrigger>
            <TabsTrigger value="details">
              <Activity className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="telemetry">
              <BarChart3 className="w-4 h-4 mr-2" />
              Telemetry
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Deployment History
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Condition Alerts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="flex-1 m-0 p-0">
          <FleetMap assets={assets} events={events} selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} />
        </TabsContent>

        <TabsContent value="list" className="flex-1 m-0 p-0">
          <FleetList assets={assets} selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} getDeployedEvents={getDeployedEvents} />
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 p-0">
          {selectedAsset ? (
            <AssetDetails asset={selectedAsset} deployedEvents={getDeployedEvents(selectedAsset.id)} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">Select an asset to view details</div>
          )}
        </TabsContent>

        <TabsContent value="telemetry" className="flex-1 m-0 p-0">
          <FleetTelemetryPanel assets={assets} activeEvent={activeOp?.activeEvent || events.find((event) => event.status === 'active')} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 m-0 p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Log Deployment Record</div>
              <select
                value={selectedAsset?.id || ''}
                onChange={(event) => {
                  const next = assets.find((asset) => asset.id === event.target.value) || null;
                  setSelectedAsset(next);
                }}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name || asset.model || asset.id}
                  </option>
                ))}
              </select>
              <select
                value={historyForm.status}
                onChange={(event) => setHistoryForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {DEPLOYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={historyForm.eventId}
                onChange={(event) => setHistoryForm((prev) => ({ ...prev, eventId: event.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                <option value="">No linked operation</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.id}
                  </option>
                ))}
              </select>
              <Input
                value={historyForm.location}
                onChange={(event) => setHistoryForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Location"
              />
              <Textarea
                value={historyForm.note}
                onChange={(event) => setHistoryForm((prev) => ({ ...prev, note: event.target.value }))}
                className="min-h-[90px]"
                placeholder="Deployment note"
              />
              <Button onClick={submitDeploymentHistory} disabled={actionBusy || !selectedAsset}>
                Log Deployment
              </Button>
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">
                Deployment History {selectedAsset ? `- ${selectedAsset.name || selectedAsset.id}` : ''}
              </div>
              {selectedAssetHistory.length === 0 ? (
                <div className="text-xs text-zinc-500">No deployment records logged yet.</div>
              ) : (
                selectedAssetHistory.slice(0, 80).map((entry) => (
                  <div key={entry.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">
                          {entry.asset_name || entry.asset_id} - {entry.status || 'deployed'}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">
                          {entry.location || 'Unknown'} {entry.event_id ? `· op ${entry.event_id}` : ''}
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(entry.createdAt || entry.logged_at)}</div>
                    </div>
                    {entry.note ? <div className="text-xs text-zinc-300 mt-1">{entry.note}</div> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 m-0 p-4 overflow-y-auto">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Asset Condition Alerts</div>
            {conditionAlerts.length === 0 ? (
              <div className="text-xs text-zinc-500">No condition alerts detected.</div>
            ) : (
              conditionAlerts.map((alert) => (
                <div key={alert.key} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-semibold">
                        {alert.assetName} - {alert.severity.toUpperCase()}
                      </div>
                      <div className="text-xs text-zinc-300">{alert.message}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] text-zinc-500">{asDateLabel(alert.sourceTime)}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert)}
                        disabled={actionBusy || alert.acknowledged}
                      >
                        {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                  {alert.acknowledgedAt ? (
                    <div className="text-[10px] text-green-300 mt-1">Acked at {asDateLabel(alert.acknowledgedAt)}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
