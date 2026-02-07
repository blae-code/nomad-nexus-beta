import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl } from '@/utils';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Database, LineChart, Radio, ShieldAlert, Sparkles, Target, TrendingUp } from 'lucide-react';

const THREAT_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const THREAT_TYPES = ['hostile', 'pirate', 'environmental', 'logistics', 'comms', 'unknown'];

const DEFAULT_REPORT_FORM = {
  title: '',
  summary: '',
  threatType: 'hostile',
  threatLevel: 'MEDIUM',
  location: '',
  tags: '',
  countermeasures: '',
  createIncident: true,
};

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function levelColor(level) {
  const normalized = String(level || '').toUpperCase();
  if (normalized === 'CRITICAL') return 'text-red-300 border-red-500/40 bg-red-500/10';
  if (normalized === 'HIGH') return 'text-orange-300 border-orange-500/40 bg-orange-500/10';
  if (normalized === 'MEDIUM') return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10';
  return 'text-green-300 border-green-500/40 bg-green-500/10';
}

function parseIntelReportLogs(logs) {
  return (logs || [])
    .filter((log) => String(log?.type || '').toUpperCase() === 'INTEL_REPORT')
    .map((log) => {
      const details = log?.details || {};
      return {
        id: log.id,
        source: 'report',
        title: details.title || log.summary || 'Intel report',
        summary: details.summary || log.summary || '',
        level: String(details.threat_level || log.severity || 'LOW').toUpperCase(),
        type: String(details.threat_type || 'unknown').toLowerCase(),
        location: details.location || 'Unknown',
        tags: Array.isArray(details.tags) ? details.tags : [],
        riskScore: Number(details.risk_score || 0),
        channels: Array.isArray(details.recommended_channels) ? details.recommended_channels : [],
        eventId: log.event_id || null,
        createdAt: log.created_date || null,
      };
    });
}

function parseIncidentsAsThreats(incidents) {
  return (incidents || []).map((incident) => ({
    id: incident.id,
    source: 'incident',
    title: incident.title || 'Incident',
    summary: incident.description || '',
    level: String(incident.severity || 'LOW').toUpperCase(),
    type: String(incident.incident_type || 'unknown').toLowerCase(),
    location: incident.location || 'Unknown',
    tags: [],
    riskScore: String(incident.severity || '').toUpperCase() === 'CRITICAL' ? 88 : String(incident.severity || '').toUpperCase() === 'HIGH' ? 72 : 45,
    channels: [],
    eventId: incident.event_id || null,
    createdAt: incident.reported_at || incident.created_date || null,
  }));
}

function uniqueById(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function channelSuggestions(level, type, tags, channels) {
  const list = new Set(['intel']);
  if (level === 'HIGH' || level === 'CRITICAL') {
    list.add('command');
    list.add('operations');
  }
  if (type === 'hostile' || type === 'pirate') list.add('focused-command');
  if (tags.includes('distress') || tags.includes('medical')) list.add('rescue');
  if (tags.includes('logistics') || tags.includes('hauling') || tags.includes('supply')) list.add('logistics');
  if (tags.includes('contract') || tags.includes('commerce')) list.add('trade');
  const available = (channels || []).map((channel) => String(channel?.name || '').toLowerCase()).filter(Boolean);
  return Array.from(list).filter((name) => available.includes(name)).concat(Array.from(list).filter((name) => !available.includes(name)));
}

export default function IntelNexus() {
  const { user } = useAuth();
  const activeOp = useActiveOp();
  const member = user?.member_profile_data || user;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('threats');
  const [incidents, setIncidents] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [channels, setChannels] = useState([]);
  const [assets, setAssets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(DEFAULT_REPORT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [selectedThreatId, setSelectedThreatId] = useState('');

  const activeEvent = useMemo(() => {
    if (activeOp?.activeEvent?.id) return activeOp.activeEvent;
    if (!activeOp?.activeEventId) return null;
    return events.find((event) => event.id === activeOp.activeEventId) || null;
  }, [activeOp?.activeEvent, activeOp?.activeEventId, events]);

  const threats = useMemo(() => {
    const combined = uniqueById([
      ...parseIntelReportLogs(eventLogs),
      ...parseIncidentsAsThreats(incidents),
    ]);
    return combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [eventLogs, incidents]);

  const selectedThreat = useMemo(
    () => threats.find((threat) => threat.id === selectedThreatId) || threats[0] || null,
    [threats, selectedThreatId]
  );

  const metrics = useMemo(() => {
    const openIncidents = incidents.filter((incident) => {
      const status = String(incident?.status || '').toLowerCase();
      return status === 'open' || status === 'investigating' || status === 'active';
    }).length;
    const intelReports = parseIntelReportLogs(eventLogs);
    const criticalThreats = threats.filter((threat) => String(threat.level).toUpperCase() === 'CRITICAL').length;
    const avgRisk = threats.length > 0 ? Math.round(threats.reduce((sum, threat) => sum + Number(threat.riskScore || 0), 0) / threats.length) : 0;
    return {
      openIncidents,
      intelReports: intelReports.length,
      criticalThreats,
      avgRisk,
    };
  }, [incidents, eventLogs, threats]);

  const predictiveLogistics = useMemo(() => {
    const byLocation = {};
    for (const threat of threats) {
      const key = String(threat.location || 'Unknown');
      if (!byLocation[key]) byLocation[key] = { location: key, score: 0, threatCount: 0, notes: [] };
      const risk = Number(threat.riskScore || 0);
      byLocation[key].score += risk;
      byLocation[key].threatCount += 1;
      if (threat.level === 'CRITICAL') byLocation[key].notes.push('Critical threat pattern');
      if (threat.type === 'logistics') byLocation[key].notes.push('Logistics disruption likely');
    }

    const lowStockItems = (inventory || []).filter((item) => Number(item?.quantity || 0) <= 5);
    for (const item of lowStockItems) {
      const key = String(item?.location || 'Unassigned');
      if (!byLocation[key]) byLocation[key] = { location: key, score: 0, threatCount: 0, notes: [] };
      byLocation[key].score += 18;
      byLocation[key].notes.push(`Low stock: ${item?.name || 'item'}`);
    }

    return Object.values(byLocation)
      .map((entry) => ({
        ...entry,
        projectedRisk: Math.min(100, Math.round(entry.score / Math.max(1, entry.threatCount || 1))),
      }))
      .sort((a, b) => b.projectedRisk - a.projectedRisk)
      .slice(0, 8);
  }, [threats, inventory]);

  const pastOperationComparisons = useMemo(() => {
    if (!activeEvent?.id) return [];
    const activeTags = Array.isArray(activeEvent?.tags) ? activeEvent.tags.map((tag) => String(tag).toLowerCase()) : [];
    return (events || [])
      .filter((event) => event.id !== activeEvent.id)
      .map((event) => {
        let similarity = 0;
        if (String(event.event_type || '').toLowerCase() === String(activeEvent.event_type || '').toLowerCase()) similarity += 45;
        if (String(event.priority || '').toUpperCase() === String(activeEvent.priority || '').toUpperCase()) similarity += 20;
        const tags = Array.isArray(event?.tags) ? event.tags.map((tag) => String(tag).toLowerCase()) : [];
        const overlap = tags.filter((tag) => activeTags.includes(tag)).length;
        similarity += Math.min(35, overlap * 12);
        const aarCount = reports.filter((report) => report.event_id === event.id).length;
        return {
          id: event.id,
          title: event.title || event.id,
          status: event.status || 'unknown',
          similarity: Math.min(100, similarity),
          aarCount,
          startTime: event.start_time || null,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);
  }, [events, activeEvent, reports]);

  const resourceRecommendations = useMemo(() => {
    const recommendations = [];
    const maintenanceAssets = assets.filter((asset) => String(asset?.status || '').toUpperCase() === 'MAINTENANCE').length;
    const criticalThreats = threats.filter((threat) => threat.level === 'CRITICAL').length;
    const highRiskLanes = predictiveLogistics.filter((lane) => lane.projectedRisk >= 70).length;

    if (criticalThreats > 0) recommendations.push(`Assign at least ${Math.max(1, criticalThreats)} command staff to focused intel net monitoring.`);
    if (maintenanceAssets > 0) recommendations.push(`Backfill ${maintenanceAssets} maintenance-bound assets with ready hulls before focused operations.`);
    if (highRiskLanes > 0) recommendations.push(`Pre-stage medical and repair kits across ${highRiskLanes} high-risk transit lanes.`);
    if (recommendations.length === 0) recommendations.push('Current threat posture is stable; continue normal patrol cadence.');
    return recommendations;
  }, [assets, threats, predictiveLogistics]);

  const formTags = useMemo(() => parseTags(form.tags), [form.tags]);
  const suggestedChannels = useMemo(
    () => channelSuggestions(form.threatLevel, form.threatType, formTags, channels),
    [form.threatLevel, form.threatType, formTags, channels]
  );

  const loadIntel = async () => {
    setLoading(true);
    try {
      const [incidentList, logList, eventList, reportList, channelList, assetList, inventoryList] = await Promise.all([
        base44.entities.Incident.list('-created_date', 250).catch(() => []),
        base44.entities.EventLog.list('-created_date', 400).catch(() => []),
        base44.entities.Event.list('-start_time', 150).catch(() => []),
        base44.entities.EventReport.list('-created_date', 250).catch(() => []),
        base44.entities.Channel.list('-created_date', 150).catch(() => []),
        base44.entities.FleetAsset.list('-updated_date', 250).catch(() => []),
        base44.entities.InventoryItem.list('-created_date', 350).catch(() => []),
      ]);
      setIncidents(incidentList || []);
      setEventLogs(logList || []);
      setEvents(eventList || []);
      setReports(reportList || []);
      setChannels(channelList || []);
      setAssets(assetList || []);
      setInventory(inventoryList || []);
    } catch (error) {
      console.error('IntelNexus load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load intel datasets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntel();
  }, []);

  const submitReport = async () => {
    if (!form.title.trim() || !form.summary.trim()) return;
    try {
      setSubmitting(true);
      const response = await invokeMemberFunction('submitIntelReport', {
        title: form.title.trim(),
        summary: form.summary.trim(),
        threatType: form.threatType,
        threatLevel: form.threatLevel,
        location: form.location.trim(),
        tags: formTags,
        countermeasures: form.countermeasures.trim(),
        createIncident: Boolean(form.createIncident),
        eventId: activeOp?.activeEventId || null,
      });
      const payload = response?.data || response;
      if (!payload?.success) {
        setBanner({ type: 'error', message: payload?.error || 'Intel report failed.' });
      } else {
        setBanner({
          type: 'success',
          message: `Intel report filed. Risk ${payload?.report?.riskScore ?? 'n/a'} · channels: ${(payload?.report?.recommendedChannels || []).join(', ') || 'none'}`,
        });
        setForm(DEFAULT_REPORT_FORM);
        await loadIntel();
      }
    } catch (error) {
      console.error('Intel report submit failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Intel report failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading Intel Nexus...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Intel Nexus</h1>
          <p className="text-zinc-400 text-sm">Threat tracking, assessment, intelligence reporting, predictive logistics, and operational history comparison</p>
          <div className="text-xs text-zinc-500 mt-2">
            Active operation: <span className="text-orange-300">{activeEvent?.title || 'None selected'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('MissionControl')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Operations</a>
          <a href={createPageUrl('CommsConsole')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Comms</a>
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
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Open Threats</div>
          <div className="text-lg font-bold text-orange-300">{metrics.openIncidents}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Intel Reports</div>
          <div className="text-lg font-bold text-cyan-300">{metrics.intelReports}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Critical Threats</div>
          <div className="text-lg font-bold text-red-300">{metrics.criticalThreats}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Average Risk</div>
          <div className="text-lg font-bold text-yellow-300">{metrics.avgRisk}</div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="threats">Threat Database</TabsTrigger>
          <TabsTrigger value="assessment">Threat Assessment</TabsTrigger>
          <TabsTrigger value="reports">Intel Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analysis Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Database className="w-3 h-3" />
                Tracked Threats
              </div>
              {threats.length === 0 ? (
                <div className="text-xs text-zinc-500">No threats recorded.</div>
              ) : (
                threats.slice(0, 30).map((threat) => (
                  <button
                    key={threat.id}
                    onClick={() => setSelectedThreatId(threat.id)}
                    className={`w-full text-left border rounded p-2 transition ${
                      selectedThreat?.id === threat.id ? 'border-orange-500/60 bg-orange-500/10' : 'border-zinc-700/70 bg-zinc-950/50'
                    }`}
                  >
                    <div className="text-xs text-white font-semibold">{threat.title}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{threat.level} · {threat.type} · {threat.source}</div>
                  </button>
                ))
              )}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              {!selectedThreat ? (
                <div className="text-zinc-500 text-sm">Select a threat to inspect.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl text-white font-black">{selectedThreat.title}</div>
                      <div className="text-xs text-zinc-500 uppercase">{selectedThreat.type} · {selectedThreat.source}</div>
                    </div>
                    <div className={`text-xs border rounded px-2 py-1 ${levelColor(selectedThreat.level)}`}>{selectedThreat.level}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Risk Score</div>
                      <div className="text-sm text-orange-300">{selectedThreat.riskScore || 0}</div>
                    </div>
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Location</div>
                      <div className="text-sm text-zinc-200">{selectedThreat.location || 'Unknown'}</div>
                    </div>
                    <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                      <div className="text-[10px] uppercase text-zinc-500">Observed</div>
                      <div className="text-sm text-zinc-200">{formatDate(selectedThreat.createdAt)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-300">{selectedThreat.summary || 'No summary provided.'}</div>
                  {selectedThreat.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedThreat.tags.map((tag) => (
                        <span key={`${selectedThreat.id}-${tag}`} className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Radio className="w-3 h-3" />
                      AI-Suggested Channel Routing
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selectedThreat.channels?.length ? selectedThreat.channels : channelSuggestions(selectedThreat.level, selectedThreat.type, selectedThreat.tags || [], channels)).map((channel) => (
                        <span key={`${selectedThreat.id}-chan-${channel}`} className="text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded uppercase">
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assessment" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" />
                Threat Assessment Matrix
              </div>
              {threats.length === 0 ? (
                <div className="text-xs text-zinc-500">No threat data available.</div>
              ) : (
                threats.slice(0, 10).map((threat) => (
                  <div key={`${threat.id}-matrix`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-white">{threat.title}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{threat.type} · {threat.level}</div>
                    </div>
                    <div className="text-sm font-semibold text-orange-300">{threat.riskScore || 0}</div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Predictive Logistics Model
              </div>
              {predictiveLogistics.length === 0 ? (
                <div className="text-xs text-zinc-500">Insufficient logistics/threat data.</div>
              ) : (
                predictiveLogistics.map((lane) => (
                  <div key={lane.location} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">{lane.location}</div>
                      <div className={`text-xs ${lane.projectedRisk >= 70 ? 'text-red-300' : lane.projectedRisk >= 50 ? 'text-orange-300' : 'text-green-300'}`}>
                        Projected risk {lane.projectedRisk}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase">Signals: {lane.threatCount}</div>
                    <div className="text-xs text-zinc-400">{lane.notes.slice(0, 2).join(' · ') || 'No additional signals'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Submit Intelligence Report</div>
              <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Report title" />
              <Textarea value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} className="min-h-[80px]" placeholder="Summary" />
              <select value={form.threatType} onChange={(event) => setForm((prev) => ({ ...prev, threatType: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                {THREAT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select value={form.threatLevel} onChange={(event) => setForm((prev) => ({ ...prev, threatLevel: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                {THREAT_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
              <Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Location" />
              <Input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
              <Textarea
                value={form.countermeasures}
                onChange={(event) => setForm((prev) => ({ ...prev, countermeasures: event.target.value }))}
                className="min-h-[70px]"
                placeholder="Countermeasures"
              />
              <label className="text-xs text-zinc-400 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.createIncident)}
                  onChange={(event) => setForm((prev) => ({ ...prev, createIncident: event.target.checked }))}
                />
                Create incident if high severity
              </label>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Route Preview</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {suggestedChannels.map((channel) => (
                    <span key={`form-route-${channel}`} className="text-[10px] border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded uppercase">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
              <Button onClick={submitReport} disabled={submitting || !form.title.trim() || !form.summary.trim()}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Recent Intelligence Reports</div>
              {parseIntelReportLogs(eventLogs).length === 0 ? (
                <div className="text-xs text-zinc-500">No intelligence reports yet.</div>
              ) : (
                parseIntelReportLogs(eventLogs).slice(0, 18).map((report) => (
                  <div key={report.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{report.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{report.type} · {report.location}</div>
                      </div>
                      <div className={`text-[10px] border rounded px-2 py-0.5 ${levelColor(report.level)}`}>{report.level}</div>
                    </div>
                    <div className="text-xs text-zinc-300">{report.summary}</div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Risk {report.riskScore || 0}</span>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Target className="w-3 h-3" />
                Similar Past Operations
              </div>
              {!activeEvent && <div className="text-xs text-zinc-500">Activate an operation to compare historical matches.</div>}
              {activeEvent && pastOperationComparisons.length === 0 && (
                <div className="text-xs text-zinc-500">No comparable operations found.</div>
              )}
              {pastOperationComparisons.map((entry) => (
                <div key={entry.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white">{entry.title}</div>
                    <div className="text-xs text-cyan-300">{entry.similarity}% match</div>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase">
                    {entry.status} · AAR reports {entry.aarCount} · {entry.startTime ? formatDate(entry.startTime) : 'unknown time'}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <LineChart className="w-3 h-3" />
                Historical Performance + Resource Recommendations
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="text-[10px] uppercase text-zinc-500">Completed Ops</div>
                  <div className="text-sm text-green-300">{events.filter((event) => String(event?.status || '').toLowerCase() === 'completed').length}</div>
                </div>
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="text-[10px] uppercase text-zinc-500">AAR Reports</div>
                  <div className="text-sm text-cyan-300">{reports.length}</div>
                </div>
              </div>
              <div className="space-y-2">
                {resourceRecommendations.map((recommendation, idx) => (
                  <div key={`rec-${idx}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs text-zinc-300 flex items-start gap-2">
                    <TrendingUp className="w-3 h-3 text-orange-300 mt-0.5" />
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-zinc-500">
                Analyst: {member?.display_callsign || member?.callsign || member?.id || 'anonymous'} · Updated {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-[10px] text-zinc-500 flex items-center gap-2">
        <BarChart3 className="w-3 h-3" />
        Predictive models are generated from current incident density, report severity, logistics stock levels, and historical operation metadata.
      </div>
    </div>
  );
}
