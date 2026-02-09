import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Polygon, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useNotification } from '@/components/providers/NotificationContext';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { createPageUrl, isAdminUser } from '@/utils';
import { computeFleetPlanningMetrics } from '@/components/tactical/operationFleetReadiness';
import {
  Crosshair,
  Layers,
  LocateFixed,
  MapPin,
  Link2,
  Radio,
  Route,
  Square,
  Zap,
  Navigation,
  Users,
  RefreshCw,
  Volume2,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
  Target,
  Megaphone,
  Download,
  Activity,
} from 'lucide-react';

const MAP_LEVELS = [
  { id: 'system', label: 'System', bounds: [[0, 0], [400, 400]], zoom: -0.5 },
  { id: 'planet', label: 'Planet', bounds: [[0, 0], [200, 200]], zoom: 0 },
  { id: 'local', label: 'Local', bounds: [[0, 0], [100, 100]], zoom: 0.5 },
];

const TOOL_DEFS = [
  { id: 'pan', label: 'Navigate', icon: Navigation },
  { id: 'marker', label: 'Marker', icon: MapPin },
  { id: 'route', label: 'Route', icon: Route },
  { id: 'zone', label: 'Zone', icon: Square },
  { id: 'ping', label: 'Ping', icon: Zap },
  { id: 'report', label: 'Report', icon: LocateFixed },
];

const DEFAULT_MARKER = {
  label: '',
  type: 'rally',
  color: '#f97316',
  description: '',
};

const DEFAULT_REPORT = {
  status: 'READY',
  role: 'PILOT',
  notes: '',
};

const MARKER_TYPES = [
  { id: 'rally', label: 'Rally' },
  { id: 'objective', label: 'Objective' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'extraction', label: 'Extraction' },
  { id: 'support', label: 'Support' },
  { id: 'route', label: 'Route' },
  { id: 'zone', label: 'Zone' },
  { id: 'ping', label: 'Ping' },
];

const STATUS_COLORS = {
  READY: '#22c55e',
  ENGAGED: '#f97316',
  DISTRESS: '#ef4444',
  DOWN: '#a1a1aa',
  OFFLINE: '#52525b',
};

const COMMS_FILTERS = [
  { id: 'all', label: 'All Nets' },
  { id: 'operation', label: 'Operation' },
  { id: 'hangout', label: 'Hangout' },
  { id: 'contract', label: 'Contract' },
];

const COMMS_PRIORITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  STANDARD: '#38bdf8',
};

const HISTORY_WINDOWS = [
  { id: 0, label: 'All' },
  { id: 15, label: '15m' },
  { id: 30, label: '30m' },
  { id: 60, label: '1h' },
  { id: 180, label: '3h' },
  { id: 360, label: '6h' },
];

const TIMELINE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'command', label: 'Commands' },
  { id: 'incident', label: 'Incidents' },
  { id: 'callout', label: 'Callouts' },
  { id: 'status', label: 'Status' },
  { id: 'map', label: 'Map' },
];

const TIMELINE_TYPE_STYLES = {
  command: 'text-cyan-300 border-cyan-500/40',
  incident: 'text-red-300 border-red-500/40',
  callout: 'text-orange-300 border-orange-500/40',
  status: 'text-emerald-300 border-emerald-500/40',
  map: 'text-zinc-300 border-zinc-600/40',
};

const TACTICAL_MACROS = [
  {
    id: 'contact',
    label: 'Declare Contact',
    commandType: 'CONTACT',
    priority: 'HIGH',
    markerType: 'hazard',
    markerColor: '#ef4444',
    markerLabel: 'Enemy Contact',
    commandMessage: 'Contact reported. Hold, mark, and relay composition.',
    incidentType: null,
  },
  {
    id: 'cas',
    label: 'Request CAS',
    commandType: 'SUPPORT',
    priority: 'CRITICAL',
    markerType: 'objective',
    markerColor: '#f97316',
    markerLabel: 'CAS Requested',
    commandMessage: 'Close air support requested. Mark friendlies and clear approach corridor.',
    incidentType: 'combat',
  },
  {
    id: 'lz',
    label: 'Mark LZ',
    commandType: 'LOGISTICS',
    priority: 'STANDARD',
    markerType: 'extraction',
    markerColor: '#38bdf8',
    markerLabel: 'Landing Zone',
    commandMessage: 'Landing zone designated. Secure perimeter and guide approach.',
    incidentType: null,
  },
  {
    id: 'medevac',
    label: 'Medevac',
    commandType: 'RESCUE',
    priority: 'CRITICAL',
    markerType: 'support',
    markerColor: '#22c55e',
    markerLabel: 'Medevac Needed',
    commandMessage: 'Medical evacuation requested. Stabilize patient and secure extraction path.',
    incidentType: 'medical',
  },
  {
    id: 'broadcast',
    label: 'Broadcast Priority',
    commandType: 'ORDER',
    priority: 'HIGH',
    markerType: 'rally',
    markerColor: '#a855f7',
    markerLabel: 'Priority Broadcast',
    commandMessage: 'Priority broadcast in effect. Confirm receipt and execute current order.',
    incidentType: null,
  },
];

const OPERATION_TEMPLATES = [
  {
    id: 'strike_package',
    label: 'Strike Package',
    operationType: 'combat',
    pace: 'focused',
    objectivePrimary: 'Neutralize target and secure objective zone.',
    phases: [
      { name: 'Muster', objective: 'Assemble strike wing and validate loadouts.', durationMinutes: 12, trigger: 'Comms green' },
      { name: 'Ingress', objective: 'Enter objective lane and clear outer threats.', durationMinutes: 18, trigger: 'Command go' },
      { name: 'Strike', objective: 'Execute primary strike with escort cover.', durationMinutes: 20, trigger: 'Target marked' },
      { name: 'Extract', objective: 'Rally and depart through fallback lane.', durationMinutes: 14, trigger: 'Package complete' },
    ],
    assets: { fighters: 6, escorts: 2, haulers: 0, medevac: 1, support: 1 },
  },
  {
    id: 'cargo_corridor',
    label: 'Cargo Corridor',
    operationType: 'logistics',
    pace: 'casual',
    objectivePrimary: 'Move cargo chain across contested sectors safely.',
    phases: [
      { name: 'Staging', objective: 'Load cargo and assign route owners.', durationMinutes: 20, trigger: 'Contracts accepted' },
      { name: 'Convoy', objective: 'Transit lanes with escort and check-ins.', durationMinutes: 35, trigger: 'All ships ready' },
      { name: 'Handoff', objective: 'Unload and reconcile contract deliveries.', durationMinutes: 18, trigger: 'Dock clear' },
    ],
    assets: { fighters: 2, escorts: 2, haulers: 4, medevac: 1, support: 2 },
  },
  {
    id: 'rescue_net',
    label: 'Rescue Net',
    operationType: 'rescue',
    pace: 'focused',
    objectivePrimary: 'Recover distressed pilots and preserve assets.',
    phases: [
      { name: 'Triage', objective: 'Collect distress signals and severity.', durationMinutes: 10, trigger: 'Beacon lock' },
      { name: 'Insertion', objective: 'Push rescue team into hot zone.', durationMinutes: 16, trigger: 'Escort positioned' },
      { name: 'Recovery', objective: 'Extract patients and critical cargo.', durationMinutes: 18, trigger: 'Medevac clear' },
      { name: 'Stabilize', objective: 'Transfer to safe station and report.', durationMinutes: 12, trigger: 'Dock authority granted' },
    ],
    assets: { fighters: 3, escorts: 2, haulers: 1, medevac: 2, support: 1 },
  },
  {
    id: 'contract_surge',
    label: 'Contract Surge',
    operationType: 'contract',
    pace: 'casual',
    objectivePrimary: 'Run parallel contracts with shared support lanes.',
    phases: [
      { name: 'Board Sweep', objective: 'Claim high-value contracts and assign owners.', durationMinutes: 12, trigger: 'Board refresh' },
      { name: 'Parallel Runs', objective: 'Execute batches with shared escorts and refuel.', durationMinutes: 40, trigger: 'Assignments locked' },
      { name: 'Settlement', objective: 'Confirm payouts and reputation gains.', durationMinutes: 15, trigger: 'Contract closures' },
    ],
    assets: { fighters: 2, escorts: 1, haulers: 3, medevac: 1, support: 2 },
  },
];

const PHASE_STYLE_COLORS = ['#f97316', '#38bdf8', '#22c55e', '#a855f7', '#ef4444'];

const CONTINGENCY_TRIGGER_TYPES = ['intel', 'contact', 'comms', 'contract', 'time', 'command'];
const CONTINGENCY_ACTIONS = ['pivot', 'fallback', 'abort', 'split'];
const CONTINGENCY_URGENCY = ['standard', 'high', 'critical'];
const CONTINGENCY_STATES = ['armed', 'used', 'disabled'];
const CONTINGENCY_URGENCY_WEIGHTS = { standard: 30, high: 60, critical: 90 };
const CONTINGENCY_ACTION_WEIGHTS = { split: 8, pivot: 16, fallback: 22, abort: 28 };

const STUDIO_MODE_LABELS = {
  plan: { label: 'Briefing', subtitle: 'Design the operation plan' },
  execute: { label: 'Command', subtitle: 'Conduct and adapt live phases' },
  wrap: { label: 'Debrief', subtitle: 'Capture outcomes and lessons learned' },
};

function toText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toLower(value) {
  return toText(value).toLowerCase();
}

function classifyNet(net) {
  const discipline = toLower(net?.discipline);
  const code = toLower(net?.code);
  const label = toLower(net?.label || net?.name);
  if (code.includes('hang') || label.includes('hang') || label.includes('lounge') || label.includes('general')) return 'hangout';
  if (code.includes('contract') || code.includes('trade') || code.includes('job') || label.includes('contract') || label.includes('trade')) return 'contract';
  if (discipline === 'focused' || Boolean(net?.event_id || net?.eventId)) return 'operation';
  return 'all';
}

function getNetColor(netType, isFocused) {
  if (netType === 'hangout') return '#22c55e';
  if (netType === 'contract') return '#38bdf8';
  if (isFocused) return '#f97316';
  return '#a855f7';
}

function centroidFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const lat = points.reduce((acc, point) => acc + point[0], 0) / points.length;
  const lng = points.reduce((acc, point) => acc + point[1], 0) / points.length;
  return [lat, lng];
}

function fallbackNetPosition(index, total, bounds) {
  const maxLat = bounds?.[1]?.[0] || 100;
  const maxLng = bounds?.[1]?.[1] || 100;
  const centerLat = maxLat / 2;
  const centerLng = maxLng / 2;
  const radius = Math.min(maxLat, maxLng) * 0.23;
  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  return [
    centerLat + (Math.sin(angle) * radius),
    centerLng + (Math.cos(angle) * radius),
  ];
}

function formatRelativeTime(value) {
  const ts = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(ts)) return 'now';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function toTimestampMs(value) {
  const raw = toText(value);
  if (!raw) return null;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecordTimestamp(record) {
  return (
    record?.created_date ||
    record?.createdDate ||
    record?.updated_date ||
    record?.updatedDate ||
    record?.created_at ||
    record?.timestamp ||
    null
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreToLabel(score) {
  if (score >= 80) return 'CLEAR';
  if (score >= 60) return 'DEGRADED';
  return 'CONTESTED';
}

function scoreToColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function laneMatchesNet(callout, netNode) {
  const calloutNetId = toText(callout?.net_id);
  if (calloutNetId && calloutNetId === toText(netNode?.id)) return true;
  const lane = toLower(callout?.lane);
  const code = toLower(netNode?.code);
  const label = toLower(netNode?.label);
  if (!lane) return false;
  return code.includes(lane) || label.includes(lane) || lane.includes(code);
}

function createStudioPhase(phase = {}, index = 0) {
  return {
    id: toText(phase.id, `phase_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`),
    name: toText(phase.name, `Phase ${index + 1}`),
    objective: toText(phase.objective),
    trigger: toText(phase.trigger, 'Command go'),
    durationMinutes: Number(phase.durationMinutes || 15),
    fallback: toText(phase.fallback, 'Fallback to command rally'),
  };
}

function createStudioContingency(contingency = {}, phases = [], index = 0) {
  const fromPhase = phases[index] || phases[0] || null;
  const toPhase = phases[Math.min(index + 1, phases.length - 1)] || phases[0] || null;
  const status = toLower(contingency?.status);
  return {
    id: toText(contingency?.id, `branch_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`),
    label: toText(contingency?.label, `Branch ${index + 1}`),
    from_phase_id: toText(contingency?.from_phase_id || contingency?.fromPhaseId, fromPhase?.id || ''),
    to_phase_id: toText(contingency?.to_phase_id || contingency?.toPhaseId, toPhase?.id || ''),
    trigger_type: CONTINGENCY_TRIGGER_TYPES.includes(toLower(contingency?.trigger_type || contingency?.triggerType))
      ? toLower(contingency?.trigger_type || contingency?.triggerType)
      : 'command',
    trigger_condition: toText(contingency?.trigger_condition || contingency?.triggerCondition, 'Command decides branch trigger'),
    branch_action: CONTINGENCY_ACTIONS.includes(toLower(contingency?.branch_action || contingency?.branchAction))
      ? toLower(contingency?.branch_action || contingency?.branchAction)
      : 'pivot',
    urgency: CONTINGENCY_URGENCY.includes(toLower(contingency?.urgency))
      ? toLower(contingency?.urgency)
      : 'standard',
    status: CONTINGENCY_STATES.includes(status) ? status : 'armed',
    notes: toText(contingency?.notes),
    activation_count: Number(contingency?.activation_count || contingency?.activationCount || 0),
    last_activated_at: contingency?.last_activated_at || contingency?.lastActivatedAt || null,
    auto_enabled: Boolean(contingency?.auto_enabled ?? contingency?.autoEnabled ?? false),
    auto_threshold_comms_score: Math.max(0, Number(contingency?.auto_threshold_comms_score ?? contingency?.autoThresholdCommsScore ?? 55)),
    auto_threshold_critical_incidents: Math.max(0, Number(contingency?.auto_threshold_critical_incidents ?? contingency?.autoThresholdCriticalIncidents ?? 1)),
    auto_threshold_elapsed_minutes: Math.max(1, Number(contingency?.auto_threshold_elapsed_minutes ?? contingency?.autoThresholdElapsedMinutes ?? 20)),
    cooldown_minutes: Math.max(1, Number(contingency?.cooldown_minutes ?? contingency?.cooldownMinutes ?? 5)),
    last_auto_triggered_at: contingency?.last_auto_triggered_at || contingency?.lastAutoTriggeredAt || null,
  };
}

function normalizeContingencies(contingencies, phases) {
  if (!Array.isArray(contingencies) || contingencies.length === 0) return [];
  const phaseIds = new Set((phases || []).map((phase) => toText(phase?.id)).filter(Boolean));
  return contingencies.map((entry, index) => {
    const normalized = createStudioContingency(entry, phases, index);
    if (normalized.from_phase_id && !phaseIds.has(normalized.from_phase_id)) {
      normalized.from_phase_id = phases?.[0]?.id || '';
    }
    if (normalized.to_phase_id && !phaseIds.has(normalized.to_phase_id)) {
      normalized.to_phase_id = phases?.[Math.min(index + 1, Math.max((phases?.length || 1) - 1, 0))]?.id || phases?.[0]?.id || '';
    }
    return normalized;
  });
}

function buildOperationProfile(templateId, eventId = null) {
  const template = OPERATION_TEMPLATES.find((entry) => entry.id === templateId) || OPERATION_TEMPLATES[0];
  const phases = (template.phases || []).map((phase, index) => createStudioPhase(phase, index));
  const contingencies = normalizeContingencies([
    {
      label: 'Escalation Pivot',
      trigger_type: 'contact',
      trigger_condition: 'Unexpected resistance or hostile reinforcements.',
      branch_action: 'pivot',
      urgency: 'high',
      status: 'armed',
      auto_enabled: true,
      auto_threshold_critical_incidents: 1,
      cooldown_minutes: 5,
    },
    {
      label: 'Comms Fallback',
      trigger_type: 'comms',
      trigger_condition: 'Command lane degraded below safe threshold.',
      branch_action: 'fallback',
      urgency: 'critical',
      status: 'armed',
      auto_enabled: true,
      auto_threshold_comms_score: 55,
      cooldown_minutes: 4,
    },
  ], phases);

  return {
    template_id: template.id,
    event_id: eventId || null,
    name: template.label,
    operationType: template.operationType,
    pace: template.pace,
    objectivePrimary: template.objectivePrimary,
    objectiveSecondary: '',
    contractMode: template.operationType === 'contract' ? 'embedded' : 'support',
    contractVisibility: 'allies',
    comms: {
      requireOperationVoice: true,
      hangoutBridge: true,
      discipline: template.pace === 'focused' ? 'strict' : 'adaptive',
      priorityLane: 'COMMAND',
    },
    assets: {
      fighters: Number(template.assets?.fighters || 0),
      escorts: Number(template.assets?.escorts || 0),
      haulers: Number(template.assets?.haulers || 0),
      medevac: Number(template.assets?.medevac || 0),
      support: Number(template.assets?.support || 0),
    },
    phases,
    contingencies,
    notes: '',
    updated_at: new Date().toISOString(),
  };
}

const createMarkerIcon = (color = '#f97316') =>
  L.divIcon({
    className: 'tactical-marker-icon',
    html: `
      <div style="width: 14px; height: 14px; border-radius: 999px; background: ${color}; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 0 10px ${color}66;"></div>
    `,
  });

const getCoordinate = (record) => {
  const coord = record?.coordinates || record?.position || record?.location;
  if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
    return [coord.lat, coord.lng];
  }
  if (typeof record?.lat === 'number' && typeof record?.lng === 'number') {
    return [record.lat, record.lng];
  }
  return null;
};

const getMapLevel = (record) => {
  return (record?.map_level || record?.mapLevel || record?.layer_level || 'system').toString().toLowerCase();
};

function TacticalMapEvents({ activeTool, onMapClick }) {
  useMapEvents({
    click(event) {
      if (!activeTool || activeTool === 'pan') return;
      onMapClick?.(event);
    },
  });
  return null;
}

export default function TacticalMap({ eventId = null, activeEvent = null, compact = false }) {
  const { user: authUser } = useAuth();
  const member = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const { addNotification } = useNotification();

  const [mapLevel, setMapLevel] = useState('system');
  const [activeTool, setActiveTool] = useState('pan');
  const [markers, setMarkers] = useState([]);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [commands, setCommands] = useState([]);
  const [fleetAssets, setFleetAssets] = useState([]);
  const [commsTopology, setCommsTopology] = useState({
    nets: [],
    memberships: [],
    bridges: [],
    callouts: [],
    captions: [],
    moderation: [],
    netLoad: [],
  });
  const [commsFilter, setCommsFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [historyWindowMinutes, setHistoryWindowMinutes] = useState(0);
  const [replayOffsetMinutes, setReplayOffsetMinutes] = useState(0);
  const [studioMode, setStudioMode] = useState('plan');
  const [studioProfileLoaded, setStudioProfileLoaded] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activePhaseStartedAt, setActivePhaseStartedAt] = useState(() => Date.now());
  const [operationProfile, setOperationProfile] = useState(() => buildOperationProfile(OPERATION_TEMPLATES[0].id, eventId));
  const [loading, setLoading] = useState(true);

  const [draftPoints, setDraftPoints] = useState([]);
  const [markerDraft, setMarkerDraft] = useState(null);
  const [reportDraft, setReportDraft] = useState(null);
  const [markerForm, setMarkerForm] = useState(DEFAULT_MARKER);
  const [reportForm, setReportForm] = useState(DEFAULT_REPORT);

  const [layerVisibility, setLayerVisibility] = useState({
    markers: true,
    routes: true,
    zones: true,
    pings: true,
    statuses: true,
    incidents: true,
    commands: true,
    comms: true,
  });

  const [creating, setCreating] = useState(false);
  const [macroBusy, setMacroBusy] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [flowPhase, setFlowPhase] = useState(0);
  const mapRef = useRef(null);
  const autoBranchLockRef = useRef(false);

  const markerIds = useMemo(() => markers.map((m) => m.issued_by_member_profile_id || m.created_by_member_profile_id).filter(Boolean), [markers]);
  const statusIds = useMemo(() => playerStatuses.map((s) => s.member_profile_id).filter(Boolean), [playerStatuses]);
  const commandIds = useMemo(() => commands.map((c) => c.issued_by_member_profile_id).filter(Boolean), [commands]);
  const commsMemberIds = useMemo(
    () => [
      ...(commsTopology?.memberships || []).map((entry) => entry?.member_profile_id).filter(Boolean),
      ...(commsTopology?.callouts || []).map((entry) => entry?.issued_by_member_profile_id).filter(Boolean),
      ...(commsTopology?.moderation || []).map((entry) => entry?.target_member_profile_id).filter(Boolean),
    ],
    [commsTopology]
  );
  const { memberMap } = useMemberProfileMap(Array.from(new Set([...markerIds, ...statusIds, ...commandIds, ...commsMemberIds])));

  const mapConfig = useMemo(() => MAP_LEVELS.find((lvl) => lvl.id === mapLevel) || MAP_LEVELS[0], [mapLevel]);
  const studioStorageKey = useMemo(() => `nomadnexus.operationStudio.${eventId || 'global'}`, [eventId]);
  const replayEndMs = useMemo(
    () => Date.now() - (Math.max(0, replayOffsetMinutes) * 60 * 1000),
    [replayOffsetMinutes, loading, markers.length, playerStatuses.length, incidents.length, commands.length, commsTopology?.callouts?.length]
  );

  const isInTimeWindow = useCallback((timestampValue) => {
    const ts = toTimestampMs(timestampValue);
    if (ts == null) return true;
    if (ts > replayEndMs) return false;
    if (!historyWindowMinutes || historyWindowMinutes <= 0) return true;
    return ts >= replayEndMs - (historyWindowMinutes * 60 * 1000);
  }, [historyWindowMinutes, replayEndMs]);

  const notify = useCallback((title, message, type = 'info') => {
    addNotification?.({ title, message, type, duration: 5000 });
  }, [addNotification]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(studioStorageKey);
      if (!raw) {
        setOperationProfile(buildOperationProfile(OPERATION_TEMPLATES[0].id, eventId));
        setStudioProfileLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const templateId = toText(parsed?.template_id, OPERATION_TEMPLATES[0].id);
      const base = buildOperationProfile(templateId, eventId);
      const mergedPhases = Array.isArray(parsed?.phases) && parsed.phases.length > 0
        ? parsed.phases.map((phase, index) => createStudioPhase(phase, index))
        : base.phases;
      const merged = {
        ...base,
        ...parsed,
        event_id: eventId || null,
        comms: {
          ...base.comms,
          ...(parsed?.comms || {}),
        },
        assets: {
          ...base.assets,
          ...(parsed?.assets || {}),
        },
        phases: mergedPhases,
        contingencies: normalizeContingencies(parsed?.contingencies || base.contingencies, mergedPhases),
      };
      setOperationProfile(merged);
    } catch (error) {
      console.error('Operation profile load failed:', error);
      setOperationProfile(buildOperationProfile(OPERATION_TEMPLATES[0].id, eventId));
    } finally {
      setStudioProfileLoaded(true);
    }
  }, [eventId, studioStorageKey]);

  useEffect(() => {
    if (!studioProfileLoaded || !operationProfile) return;
    try {
      window.localStorage.setItem(studioStorageKey, JSON.stringify({
        ...operationProfile,
        updated_at: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Operation profile persist failed:', error);
    }
  }, [operationProfile, studioProfileLoaded, studioStorageKey]);

  useEffect(() => {
    const phaseCount = Array.isArray(operationProfile?.phases) ? operationProfile.phases.length : 0;
    if (phaseCount === 0) {
      setActivePhaseIndex(0);
      return;
    }
    if (activePhaseIndex > phaseCount - 1) {
      setActivePhaseIndex(phaseCount - 1);
    }
  }, [activePhaseIndex, operationProfile?.phases]);

  useEffect(() => {
    setOperationProfile((prev) => {
      if (!prev) return prev;
      const phases = Array.isArray(prev.phases) ? prev.phases : [];
      const normalized = normalizeContingencies(prev.contingencies || [], phases);
      const previous = JSON.stringify(prev.contingencies || []);
      const next = JSON.stringify(normalized);
      if (previous === next) return prev;
      return { ...prev, contingencies: normalized };
    });
  }, [operationProfile?.phases]);

  const splitMarkers = useMemo(() => {
    const activeMarkers = markers.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now());
    return {
      markers: activeMarkers.filter((m) => !['route', 'zone', 'ping'].includes(m.type)),
      routes: activeMarkers.filter((m) => m.type === 'route'),
      zones: activeMarkers.filter((m) => m.type === 'zone'),
      pings: activeMarkers.filter((m) => m.type === 'ping'),
    };
  }, [markers]);

  const filteredMarkers = useMemo(() => {
    return {
      markers: splitMarkers.markers.filter((m) => getMapLevel(m) === mapLevel && isInTimeWindow(getRecordTimestamp(m))),
      routes: splitMarkers.routes.filter((m) => getMapLevel(m) === mapLevel && isInTimeWindow(getRecordTimestamp(m))),
      zones: splitMarkers.zones.filter((m) => getMapLevel(m) === mapLevel && isInTimeWindow(getRecordTimestamp(m))),
      pings: splitMarkers.pings.filter((m) => getMapLevel(m) === mapLevel && isInTimeWindow(getRecordTimestamp(m))),
    };
  }, [splitMarkers, mapLevel, isInTimeWindow]);

  const filteredStatuses = useMemo(() => {
    return playerStatuses.filter((s) => {
      const level = getMapLevel(s);
      return (level === mapLevel || !level) && isInTimeWindow(getRecordTimestamp(s));
    });
  }, [playerStatuses, mapLevel, isInTimeWindow]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => (getMapLevel(i) === mapLevel || !getMapLevel(i)) && isInTimeWindow(getRecordTimestamp(i)));
  }, [incidents, mapLevel, isInTimeWindow]);

  const filteredCommands = useMemo(() => {
    return commands.filter((c) => (getMapLevel(c) === mapLevel || !getMapLevel(c)) && isInTimeWindow(getRecordTimestamp(c)));
  }, [commands, mapLevel, isInTimeWindow]);

  const filteredCommsNets = useMemo(() => {
    const nets = Array.isArray(commsTopology?.nets) ? commsTopology.nets : [];
    return nets.filter((net) => {
      const netLevel = toLower(net?.map_level || net?.mapLevel);
      if (netLevel && netLevel !== mapLevel) return false;
      if (commsFilter === 'all') return true;
      return classifyNet(net) === commsFilter;
    });
  }, [commsFilter, commsTopology?.nets, mapLevel]);

  const memberStatusCoords = useMemo(() => {
    const map = new Map();
    for (const status of filteredStatuses) {
      const coord = getCoordinate(status);
      if (!coord) continue;
      const id = toText(status?.member_profile_id);
      if (!id) continue;
      map.set(id, coord);
    }
    return map;
  }, [filteredStatuses]);

  const commsGraph = useMemo(() => {
    const nets = filteredCommsNets;
    const memberships = Array.isArray(commsTopology?.memberships)
      ? commsTopology.memberships.filter((entry) => nets.some((net) => toText(net?.id) === toText(entry?.net_id)))
      : [];
    const bridges = Array.isArray(commsTopology?.bridges) ? commsTopology.bridges : [];
    const callouts = Array.isArray(commsTopology?.callouts)
      ? commsTopology.callouts.filter((entry) => isInTimeWindow(entry?.created_date || entry?.createdDate))
      : [];
    const captions = Array.isArray(commsTopology?.captions)
      ? commsTopology.captions.filter((entry) => isInTimeWindow(entry?.created_date || entry?.createdDate))
      : [];
    const netLoad = Array.isArray(commsTopology?.netLoad) ? commsTopology.netLoad : [];

    const netNodes = nets.map((net, index) => {
      const netId = toText(net?.id);
      const membersOnNet = memberships.filter((entry) => toText(entry?.net_id) === netId);
      const points = membersOnNet
        .map((entry) => memberStatusCoords.get(toText(entry?.member_profile_id)))
        .filter(Boolean);
      const centroid = centroidFromPoints(points);
      const fallback = fallbackNetPosition(index, Math.max(nets.length, 1), mapConfig.bounds);
      const netType = classifyNet(net);
      const load = netLoad.find((entry) => toText(entry?.net_id) === netId);
      return {
        id: netId,
        code: toText(net?.code),
        label: toText(net?.label || net?.name || net?.code, netId),
        discipline: toLower(net?.discipline),
        netType,
        color: getNetColor(netType, toLower(net?.discipline) === 'focused'),
        position: centroid || fallback,
        participants: membersOnNet.length,
        trafficScore: Number(load?.traffic_score || 0),
      };
    });

    const netNodeById = new Map(netNodes.map((node) => [node.id, node]));
    const memberLinks = memberships
      .map((entry) => {
        const memberId = toText(entry?.member_profile_id);
        const netId = toText(entry?.net_id);
        const memberCoord = memberStatusCoords.get(memberId);
        const netNode = netNodeById.get(netId);
        if (!memberCoord || !netNode?.position) return null;
        return {
          id: `${memberId}-${netId}`,
          memberId,
          netId,
          speaking: Boolean(entry?.speaking),
          muted: Boolean(entry?.muted),
          points: [memberCoord, netNode.position],
        };
      })
      .filter(Boolean);

    const bridgeLinks = bridges
      .map((bridge, index) => {
        const leftKey = toText(bridge?.left_net_id || bridge?.left_room_id || bridge?.left_room || bridge?.left_code);
        const rightKey = toText(bridge?.right_net_id || bridge?.right_room_id || bridge?.right_room || bridge?.right_code);
        const left = netNodes.find((node) => node.id === leftKey || node.code === leftKey || node.label === leftKey);
        const right = netNodes.find((node) => node.id === rightKey || node.code === rightKey || node.label === rightKey);
        if (!left?.position || !right?.position) return null;
        return {
          id: toText(bridge?.id, `bridge-${index}`),
          leftNetId: left.id,
          rightNetId: right.id,
          points: [left.position, right.position],
          status: toLower(bridge?.status || 'active'),
        };
      })
      .filter(Boolean);

    const calloutNodes = callouts
      .slice(0, 18)
      .map((callout, index) => {
        const issuer = toText(callout?.issued_by_member_profile_id);
        const issuerCoord = memberStatusCoords.get(issuer);
        const lane = toText(callout?.lane);
        const laneNode = netNodes.find((node) => toLower(node.code).includes(toLower(lane)) || toLower(node.label).includes(toLower(lane)));
        const fallback = fallbackNetPosition(index, Math.max(callouts.length, 1), mapConfig.bounds);
        return {
          id: toText(callout?.id, `callout-${index}`),
          message: toText(callout?.message),
          priority: toText(callout?.priority, 'STANDARD').toUpperCase(),
          position: issuerCoord || laneNode?.position || fallback,
          createdDate: callout?.created_date || null,
        };
      });

    const activeSpeakers = new Set(
      captions
        .filter((entry) => toText(entry?.created_date))
        .slice(0, 10)
        .map((entry) => toLower(entry?.speaker))
        .filter(Boolean)
    );

    return { netNodes, memberLinks, bridgeLinks, calloutNodes, activeSpeakers };
  }, [filteredCommsNets, commsTopology, memberStatusCoords, mapConfig.bounds, isInTimeWindow]);

  const commsSummary = useMemo(() => {
    const participantIds = new Set(commsGraph.memberLinks.map((entry) => entry.memberId));
    const speakingCount = commsGraph.memberLinks.filter((entry) => entry.speaking && !entry.muted).length;
    const mutedCount = commsGraph.memberLinks.filter((entry) => entry.muted).length;
    const criticalCount = commsGraph.calloutNodes.filter((entry) => entry.priority === 'CRITICAL').length;
    return {
      netCount: commsGraph.netNodes.length,
      participantCount: participantIds.size,
      bridgeCount: commsGraph.bridgeLinks.length,
      speakingCount,
      mutedCount,
      criticalCount,
    };
  }, [commsGraph]);

  const replayAnchorLabel = useMemo(() => {
    if (!replayOffsetMinutes) return 'Live';
    return `${replayOffsetMinutes}m behind live`;
  }, [replayOffsetMinutes]);

  const commsNetHealth = useMemo(() => {
    const moderationRows = Array.isArray(commsTopology?.moderation)
      ? commsTopology.moderation.filter((entry) => isInTimeWindow(entry?.created_date || entry?.createdDate))
      : [];
    const calloutRows = Array.isArray(commsTopology?.callouts)
      ? commsTopology.callouts.filter((entry) => isInTimeWindow(entry?.created_date || entry?.createdDate))
      : [];

    return commsGraph.netNodes
      .map((node) => {
        const speaking = commsGraph.memberLinks.filter((entry) => entry.netId === node.id && entry.speaking && !entry.muted).length;
        const muted = commsGraph.memberLinks.filter((entry) => entry.netId === node.id && entry.muted).length;
        const bridges = commsGraph.bridgeLinks.filter((entry) => entry.leftNetId === node.id || entry.rightNetId === node.id).length;
        const degradedBridges = commsGraph.bridgeLinks.filter(
          (entry) => (entry.leftNetId === node.id || entry.rightNetId === node.id) && entry.status === 'degraded'
        ).length;
        const criticalCallouts = calloutRows.filter(
          (entry) => toText(entry?.priority).toUpperCase() === 'CRITICAL' && laneMatchesNet(entry, node)
        ).length;
        const moderationEvents = moderationRows.filter((entry) => {
          const channel = toLower(entry?.channel_id);
          if (!channel) return false;
          const code = toLower(node.code);
          const label = toLower(node.label);
          return channel.includes(code) || channel.includes(label) || code.includes(channel);
        }).length;

        const score = clamp(
          100
          - Math.min(35, node.trafficScore * 2)
          - Math.min(20, Math.max(0, muted - speaking) * 4)
          - (criticalCallouts * 12)
          - (moderationEvents * 8)
          - (degradedBridges * 7)
          - (node.participants === 0 ? 20 : 0)
          - (node.participants > 0 && speaking === 0 ? 8 : 0),
          0,
          100
        );

        const congestion = score < 45 ? 'SEVERE' : score < 70 ? 'ELEVATED' : 'NOMINAL';
        return {
          netId: node.id,
          label: node.label,
          score,
          quality: scoreToLabel(score),
          color: scoreToColor(score),
          congestion,
          participants: node.participants,
          speaking,
          muted,
          bridges,
          criticalCallouts,
          moderationEvents,
          trafficScore: node.trafficScore,
        };
      })
      .sort((a, b) => a.score - b.score);
  }, [commsGraph, commsTopology?.callouts, commsTopology?.moderation, isInTimeWindow]);

  const timelineEvents = useMemo(() => {
    const rows = [];
    const allMarkers = [
      ...filteredMarkers.markers,
      ...filteredMarkers.pings,
      ...filteredMarkers.routes,
      ...filteredMarkers.zones,
    ];

    for (const marker of allMarkers) {
      const createdDate = getRecordTimestamp(marker);
      const tsMs = toTimestampMs(createdDate);
      rows.push({
        id: `marker-${marker.id}`,
        type: 'map',
        title: marker.label || marker.type || 'Map marker',
        detail: marker.description || toText(marker.type).toUpperCase(),
        coord: getCoordinate(marker),
        createdDate,
        tsMs: tsMs || 0,
      });
    }

    for (const status of filteredStatuses) {
      const createdDate = getRecordTimestamp(status);
      const tsMs = toTimestampMs(createdDate);
      const label = memberMap[status.member_profile_id]?.label || status.callsign || status.member_profile_id || 'Member';
      rows.push({
        id: `status-${status.id}`,
        type: 'status',
        title: `${label} status`,
        detail: `${toText(status.status, 'READY')} ${status.role ? `| ${status.role}` : ''}`.trim(),
        coord: getCoordinate(status),
        createdDate,
        tsMs: tsMs || 0,
      });
    }

    for (const incident of filteredIncidents) {
      const createdDate = getRecordTimestamp(incident);
      const tsMs = toTimestampMs(createdDate);
      rows.push({
        id: `incident-${incident.id}`,
        type: 'incident',
        title: incident.title || 'Incident',
        detail: toText(incident.severity || incident.status || ''),
        coord: getCoordinate(incident),
        createdDate,
        tsMs: tsMs || 0,
      });
    }

    for (const command of filteredCommands) {
      const createdDate = getRecordTimestamp(command);
      const tsMs = toTimestampMs(createdDate);
      rows.push({
        id: `command-${command.id}`,
        type: 'command',
        title: command.command_type || 'Command',
        detail: command.message || 'Tactical order issued',
        coord: getCoordinate(command),
        createdDate,
        tsMs: tsMs || 0,
      });
    }

    for (const callout of commsGraph.calloutNodes) {
      const createdDate = callout.createdDate;
      const tsMs = toTimestampMs(createdDate);
      rows.push({
        id: `callout-${callout.id}`,
        type: 'callout',
        title: `${callout.priority} callout`,
        detail: callout.message || 'Priority comms callout',
        coord: callout.position,
        createdDate,
        tsMs: tsMs || 0,
      });
    }

    const timeline = rows
      .sort((a, b) => b.tsMs - a.tsMs)
      .filter((entry) => timelineFilter === 'all' || entry.type === timelineFilter);

    return timeline.slice(0, 40);
  }, [filteredMarkers, filteredStatuses, filteredIncidents, filteredCommands, commsGraph.calloutNodes, timelineFilter, memberMap]);

  const exportTimeline = useCallback((format) => {
    try {
      const rows = timelineEvents.map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        detail: entry.detail,
        created_at: entry.createdDate || null,
        relative_time: formatRelativeTime(entry.createdDate),
        lat: Array.isArray(entry.coord) ? entry.coord[0] : null,
        lng: Array.isArray(entry.coord) ? entry.coord[1] : null,
      }));
      const baseName = `tactical_timeline_${eventId || 'global'}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      let content = '';
      let mime = 'application/json';
      let extension = 'json';

      if (format === 'csv') {
        const headers = ['id', 'type', 'title', 'detail', 'created_at', 'relative_time', 'lat', 'lng'];
        const escapeCsv = (value) => {
          const normalized = String(value ?? '');
          return `"${normalized.replace(/"/g, '""')}"`;
        };
        const lines = [
          headers.join(','),
          ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
        ];
        content = lines.join('\n');
        mime = 'text/csv;charset=utf-8;';
        extension = 'csv';
      } else {
        content = JSON.stringify({
          generated_at: new Date().toISOString(),
          event_id: eventId || null,
          map_level: mapLevel,
          replay_offset_minutes: replayOffsetMinutes,
          window_minutes: historyWindowMinutes,
          timeline_filter: timelineFilter,
          rows,
        }, null, 2);
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('Timeline Export', `Exported ${rows.length} timeline rows as ${extension.toUpperCase()}.`, 'success');
    } catch (error) {
      console.error('Timeline export failed:', error);
      notify('Timeline Export', 'Failed to export timeline.', 'error');
    }
  }, [eventId, historyWindowMinutes, mapLevel, notify, replayOffsetMinutes, timelineEvents, timelineFilter]);

  const focusMapOnCoordinate = useCallback((coord) => {
    if (!coord || !mapRef.current) return;
    const map = mapRef.current;
    const normalized = Array.isArray(coord)
      ? coord
      : (typeof coord?.lat === 'number' && typeof coord?.lng === 'number')
        ? [coord.lat, coord.lng]
        : null;
    if (!normalized) return;
    const targetZoom = Math.max(map.getZoom?.() || mapConfig.zoom, mapConfig.zoom + 0.5);
    map.setView(normalized, targetZoom, { animate: true, duration: 0.5 });
  }, [mapConfig.zoom]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const markerFilter = eventId ? { event_id: eventId } : {};
      const statusFilter = eventId ? { event_id: eventId } : {};
      const incidentFilter = eventId ? { event_id: eventId } : {};
      const commandFilter = eventId ? { event_id: eventId } : {};

      const [markerList, statusList, incidentList, commandList, fleetAssetList, commsSnapshot] = await Promise.all([
        base44.entities.MapMarker.filter(markerFilter, '-created_date', 500).catch(() => []),
        base44.entities.PlayerStatus.filter(statusFilter, '-created_date', 200).catch(() => []),
        base44.entities.Incident.filter(incidentFilter, '-created_date', 100).catch(() => []),
        base44.entities.TacticalCommand.filter(commandFilter, '-created_date', 100).catch(() => []),
        base44.entities.FleetAsset.list('-updated_date', 250).catch(() => []),
        invokeMemberFunction('updateCommsConsole', {
          action: 'get_comms_topology_snapshot',
          eventId: eventId || undefined,
          includeGlobal: true,
          limit: 120,
        }).catch(() => null),
      ]);

      setMarkers(markerList || []);
      setPlayerStatuses(statusList || []);
      setIncidents(incidentList || []);
      setCommands(commandList || []);
      setFleetAssets(fleetAssetList || []);
      const topology = commsSnapshot?.data?.topology;
      if (topology && typeof topology === 'object') {
        setCommsTopology({
          nets: Array.isArray(topology.nets) ? topology.nets : [],
          memberships: Array.isArray(topology.memberships) ? topology.memberships : [],
          bridges: Array.isArray(topology.bridges) ? topology.bridges : [],
          callouts: Array.isArray(topology.callouts) ? topology.callouts : [],
          captions: Array.isArray(topology.captions) ? topology.captions : [],
          moderation: Array.isArray(topology.moderation) ? topology.moderation : [],
          netLoad: Array.isArray(topology.netLoad) ? topology.netLoad : [],
        });
      } else {
        setCommsTopology({
          nets: [],
          memberships: [],
          bridges: [],
          callouts: [],
          captions: [],
          moderation: [],
          netLoad: [],
        });
      }
    } catch (error) {
      console.error('Tactical map load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 20000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFlowPhase((prev) => (prev + 2) % 36);
    }, 260);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribes = [];
    const matchesEvent = (data) => {
      if (!eventId) return true;
      const payloadEventId = data?.event_id || data?.eventId;
      return payloadEventId === eventId;
    };

    const addSubscription = (entity, handler) => {
      if (!entity?.subscribe) return;
      const unsubscribe = entity.subscribe(handler);
      if (typeof unsubscribe === 'function') {
        unsubscribes.push(unsubscribe);
      }
    };

    addSubscription(base44.entities.MapMarker, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setMarkers((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.PlayerStatus, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setPlayerStatuses((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.Incident, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setIncidents((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.TacticalCommand, (event) => {
      if (event?.data && !matchesEvent(event.data)) return;
      setCommands((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((m) => (m.id === event.id ? event.data : m));
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        return prev;
      });
    });

    addSubscription(base44.entities.FleetAsset, (event) => {
      setFleetAssets((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((asset) => (asset.id === event.id ? event.data : asset));
        if (event.type === 'delete') return prev.filter((asset) => asset.id !== event.id);
        return prev;
      });
    });

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, []);

  const resolveMacroCoordinate = useCallback(() => {
    const ownLatestStatus = [...playerStatuses]
      .filter((entry) => toText(entry?.member_profile_id) === toText(member?.id))
      .sort((a, b) => {
        const aMs = toTimestampMs(getRecordTimestamp(a)) || 0;
        const bMs = toTimestampMs(getRecordTimestamp(b)) || 0;
        return bMs - aMs;
      })[0];

    const ownCoord = getCoordinate(ownLatestStatus);
    if (ownCoord) {
      return { lat: ownCoord[0], lng: ownCoord[1] };
    }

    const mapCenter = mapRef.current?.getCenter?.();
    if (mapCenter && Number.isFinite(mapCenter.lat) && Number.isFinite(mapCenter.lng)) {
      return { lat: mapCenter.lat, lng: mapCenter.lng };
    }

    return {
      lat: mapConfig.bounds[1][0] / 2,
      lng: mapConfig.bounds[1][1] / 2,
    };
  }, [mapConfig.bounds, member?.id, playerStatuses]);

  const runTacticalMacro = useCallback(async (macroId) => {
    const macro = TACTICAL_MACROS.find((entry) => entry.id === macroId);
    if (!macro) return;

    const coords = resolveMacroCoordinate();
    const actorId = member?.id || null;
    const severity = macro.priority === 'CRITICAL' ? 'CRITICAL' : macro.priority === 'HIGH' ? 'HIGH' : 'MEDIUM';

    setMacroBusy(true);
    try {
      const actions = [
        base44.entities.MapMarker.create({
          event_id: eventId || null,
          type: macro.markerType,
          label: macro.markerLabel,
          color: macro.markerColor,
          description: macro.commandMessage,
          coordinates: coords,
          map_level: mapLevel,
          issued_by_member_profile_id: actorId,
          created_by_member_profile_id: actorId,
          metadata: {
            macro_id: macro.id,
            source: 'tactical_map_macro',
          },
        }),
        base44.entities.TacticalCommand.create({
          event_id: eventId || null,
          message: macro.commandMessage,
          command_type: macro.commandType,
          priority: macro.priority,
          status: 'ISSUED',
          coordinates: coords,
          map_level: mapLevel,
          issued_by_member_profile_id: actorId,
          metadata: {
            macro_id: macro.id,
            source: 'tactical_map_macro',
          },
        }),
      ];

      if (macro.incidentType) {
        actions.push(
          base44.entities.Incident.create({
            event_id: eventId || null,
            title: macro.markerLabel,
            description: macro.commandMessage,
            severity,
            status: 'active',
            incident_type: macro.incidentType,
            coordinates: coords,
          })
        );
      }

      const results = await Promise.allSettled(actions);
      const successCount = results.filter((entry) => entry.status === 'fulfilled').length;
      const totalCount = results.length;

      if (!successCount) {
        throw new Error('All macro writes failed');
      }

      notify(
        'Tactical Macro',
        `${macro.label} executed (${successCount}/${totalCount} updates).`,
        successCount === totalCount ? 'success' : 'warning'
      );
      await loadData();
    } catch (error) {
      console.error('Macro execution failed:', error);
      notify('Tactical Macro', `Failed to execute ${macro.label}.`, 'error');
    } finally {
      setMacroBusy(false);
    }
  }, [eventId, mapLevel, member?.id, resolveMacroCoordinate, notify, loadData]);

  const setProfileField = useCallback((field, value) => {
    setOperationProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setProfileCommsField = useCallback((field, value) => {
    setOperationProfile((prev) => ({
      ...prev,
      comms: {
        ...(prev?.comms || {}),
        [field]: value,
      },
    }));
  }, []);

  const setProfileAssetField = useCallback((field, value) => {
    setOperationProfile((prev) => ({
      ...prev,
      assets: {
        ...(prev?.assets || {}),
        [field]: Number.isFinite(Number(value)) ? Number(value) : 0,
      },
    }));
  }, []);

  const updatePhase = useCallback((phaseIndex, field, value) => {
    setOperationProfile((prev) => {
      const phases = Array.isArray(prev?.phases) ? [...prev.phases] : [];
      if (!phases[phaseIndex]) return prev;
      phases[phaseIndex] = {
        ...phases[phaseIndex],
        [field]: field === 'durationMinutes'
          ? Math.max(1, Number(value || 1))
          : value,
      };
      return { ...prev, phases };
    });
  }, []);

  const addPhase = useCallback(() => {
    setOperationProfile((prev) => {
      const phases = Array.isArray(prev?.phases) ? [...prev.phases] : [];
      phases.push(createStudioPhase({}, phases.length));
      return { ...prev, phases };
    });
  }, []);

  const removePhase = useCallback((phaseIndex) => {
    setOperationProfile((prev) => {
      const phases = Array.isArray(prev?.phases) ? [...prev.phases] : [];
      if (phases.length <= 1) return prev;
      phases.splice(phaseIndex, 1);
      return { ...prev, phases };
    });
    setActivePhaseIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const updateContingency = useCallback((branchIndex, field, value) => {
    setOperationProfile((prev) => {
      const contingencies = Array.isArray(prev?.contingencies) ? [...prev.contingencies] : [];
      if (!contingencies[branchIndex]) return prev;
      contingencies[branchIndex] = {
        ...contingencies[branchIndex],
        [field]: value,
      };
      return {
        ...prev,
        contingencies: normalizeContingencies(contingencies, prev?.phases || []),
      };
    });
  }, []);

  const addContingency = useCallback(() => {
    setOperationProfile((prev) => {
      const phases = Array.isArray(prev?.phases) ? prev.phases : [];
      const contingencies = Array.isArray(prev?.contingencies) ? [...prev.contingencies] : [];
      contingencies.push(createStudioContingency({}, phases, contingencies.length));
      return {
        ...prev,
        contingencies: normalizeContingencies(contingencies, phases),
      };
    });
  }, []);

  const removeContingency = useCallback((branchIndex) => {
    setOperationProfile((prev) => {
      const contingencies = Array.isArray(prev?.contingencies) ? [...prev.contingencies] : [];
      if (!contingencies[branchIndex]) return prev;
      contingencies.splice(branchIndex, 1);
      return {
        ...prev,
        contingencies: normalizeContingencies(contingencies, prev?.phases || []),
      };
    });
  }, []);

  const applyTemplate = useCallback((templateId) => {
    const templateProfile = buildOperationProfile(templateId, eventId);
    setOperationProfile((prev) => ({
      ...templateProfile,
      name: toText(prev?.name, templateProfile.name),
      notes: prev?.notes || '',
    }));
    setActivePhaseIndex(0);
    notify('Operation Studio', `Template applied: ${OPERATION_TEMPLATES.find((entry) => entry.id === templateId)?.label || templateId}.`, 'success');
  }, [eventId, notify]);

  const phaseList = useMemo(() => (
    Array.isArray(operationProfile?.phases) ? operationProfile.phases : []
  ), [operationProfile?.phases]);

  const contingencyList = useMemo(() => (
    Array.isArray(operationProfile?.contingencies) ? operationProfile.contingencies : []
  ), [operationProfile?.contingencies]);

  const activePhase = useMemo(() => (
    phaseList[activePhaseIndex] || null
  ), [phaseList, activePhaseIndex]);

  const contingenciesForActivePhase = useMemo(() => {
    if (!activePhase) return contingencyList;
    return contingencyList.filter((entry) => {
      const fromId = toText(entry?.from_phase_id || entry?.fromPhaseId);
      return !fromId || fromId === toText(activePhase.id);
    });
  }, [activePhase, contingencyList]);

  useEffect(() => {
    setActivePhaseStartedAt(Date.now());
  }, [activePhase?.id]);

  const phaseElapsedMinutes = useMemo(() => {
    const diff = Date.now() - Number(activePhaseStartedAt || Date.now());
    return Math.max(0, Math.floor(diff / 60000));
  }, [activePhaseStartedAt, flowPhase]);

  const fleetPlanningMetrics = useMemo(() => {
    const eventAssetIds = Array.isArray(activeEvent?.assigned_asset_ids)
      ? activeEvent.assigned_asset_ids
      : [];
    return computeFleetPlanningMetrics({
      fleetAssets,
      eventAssetIds,
      plannedAssets: operationProfile?.assets || {},
    });
  }, [activeEvent?.assigned_asset_ids, fleetAssets, operationProfile?.assets]);

  const readinessMetrics = useMemo(() => {
    const memberCount = filteredStatuses.length;
    const readyCount = filteredStatuses.filter((status) => {
      const code = toText(status?.status).toUpperCase();
      return code === 'READY' || code === 'ENGAGED';
    }).length;
    const readinessPercent = memberCount > 0 ? Math.round((readyCount / memberCount) * 100) : 0;
    const avgComms = commsNetHealth.length
      ? Math.round(commsNetHealth.reduce((sum, net) => sum + net.score, 0) / commsNetHealth.length)
      : 0;
    const criticalIncidents = filteredIncidents.filter((incident) => toText(incident?.severity).toUpperCase() === 'CRITICAL').length;
    const assets = operationProfile?.assets || {};
    const supportCount = Number(assets.support || 0) + Number(assets.medevac || 0);
    const phaseCoverage = Array.isArray(operationProfile?.phases)
      ? operationProfile.phases.filter((phase) => toText(phase?.objective)).length
      : 0;
    const contingencies = Array.isArray(operationProfile?.contingencies) ? operationProfile.contingencies : [];
    const armedContingencies = contingencies.filter((entry) => toLower(entry?.status) === 'armed').length;

    return {
      memberCount,
      readinessPercent,
      avgComms,
      criticalIncidents,
      supportCount,
      phaseCoverage,
      totalPhases: Array.isArray(operationProfile?.phases) ? operationProfile.phases.length : 0,
      contingencyCount: contingencies.length,
      armedContingencies,
    };
  }, [filteredStatuses, commsNetHealth, filteredIncidents, operationProfile]);

  const readinessGates = useMemo(() => ([
    {
      id: 'personnel',
      label: 'Personnel readiness',
      value: `${readinessMetrics.readinessPercent}%`,
      pass: readinessMetrics.memberCount > 0 && readinessMetrics.readinessPercent >= 70,
      recommendation: 'Collect status reports and fill missing roles before launch.',
    },
    {
      id: 'comms',
      label: 'Comms network',
      value: `${readinessMetrics.avgComms}/100`,
      pass: readinessMetrics.avgComms >= 65,
      recommendation: 'Rebalance voice lanes and bridge off congested nets.',
    },
    {
      id: 'fleet_coverage',
      label: 'Fleet allocation',
      value: `${fleetPlanningMetrics.totalAssets}/${fleetPlanningMetrics.requiredAssets || 0} assigned`,
      pass: fleetPlanningMetrics.requiredAssets <= 0 || fleetPlanningMetrics.totalAssets >= fleetPlanningMetrics.requiredAssets,
      recommendation: 'Assign additional fleet assets in Fleet Command or reduce planned asset requirements.',
    },
    {
      id: 'fleet_operational',
      label: 'Fleet operational',
      value: `${fleetPlanningMetrics.operationalPercent}%`,
      pass: fleetPlanningMetrics.totalAssets > 0 && fleetPlanningMetrics.operationalPercent >= 60,
      recommendation: 'Recover or replace maintenance/destroyed hulls before launch.',
    },
    {
      id: 'loadout_alignment',
      label: 'Loadout alignment',
      value: `${fleetPlanningMetrics.loadoutCoveragePercent}% active`,
      pass: fleetPlanningMetrics.totalAssets > 0 && fleetPlanningMetrics.loadoutCoveragePercent >= 60,
      recommendation: 'Apply active loadouts to operation hulls and confirm role fit.',
    },
    {
      id: 'engineering_backlog',
      label: 'Engineering pressure',
      value: `${fleetPlanningMetrics.engineeringCriticalOpen} critical / ${fleetPlanningMetrics.engineeringOpen} open`,
      pass: fleetPlanningMetrics.engineeringCriticalOpen === 0,
      recommendation: 'Clear critical engineering tasks before go-order.',
    },
    {
      id: 'support',
      label: 'Support posture',
      value: `${readinessMetrics.supportCount} support assets`,
      pass: readinessMetrics.supportCount >= 1,
      recommendation: 'Assign at least one medevac/support ship.',
    },
    {
      id: 'phase',
      label: 'Phase definition',
      value: `${readinessMetrics.phaseCoverage}/${readinessMetrics.totalPhases}`,
      pass: readinessMetrics.totalPhases > 0 && readinessMetrics.phaseCoverage === readinessMetrics.totalPhases,
      recommendation: 'Ensure every phase has a clear objective and trigger.',
    },
    {
      id: 'incident',
      label: 'Critical pressure',
      value: `${readinessMetrics.criticalIncidents} active`,
      pass: readinessMetrics.criticalIncidents <= 1,
      recommendation: 'Resolve or isolate critical incidents before go-order.',
    },
    {
      id: 'branching',
      label: 'Contingency coverage',
      value: `${readinessMetrics.armedContingencies}/${readinessMetrics.contingencyCount} armed`,
      pass: readinessMetrics.contingencyCount > 0 && readinessMetrics.armedContingencies >= 1,
      recommendation: 'Arm at least one branch path for escalation or fallback.',
    },
  ]), [fleetPlanningMetrics, readinessMetrics]);

  const wrapSummary = useMemo(() => {
    const commandsIssued = timelineEvents.filter((entry) => entry.type === 'command').length;
    const incidentsLogged = timelineEvents.filter((entry) => entry.type === 'incident').length;
    const calloutsLogged = timelineEvents.filter((entry) => entry.type === 'callout').length;
    const statusReports = timelineEvents.filter((entry) => entry.type === 'status').length;
    const mapActions = timelineEvents.filter((entry) => entry.type === 'map').length;
    const commsRiskNets = commsNetHealth.filter((entry) => entry.score < 60).length;
    const contingencies = Array.isArray(operationProfile?.contingencies) ? operationProfile.contingencies : [];
    const branchesUsed = contingencies.filter((entry) => Number(entry?.activation_count || 0) > 0).length;
    const autoBranchesUsed = contingencies.filter((entry) => toText(entry?.last_auto_triggered_at)).length;
    return {
      commandsIssued,
      incidentsLogged,
      calloutsLogged,
      statusReports,
      mapActions,
      commsRiskNets,
      branchesUsed,
      autoBranchesUsed,
    };
  }, [timelineEvents, commsNetHealth, operationProfile?.contingencies]);

  const persistOperationSnapshot = useCallback(async (snapshotType = 'plan') => {
    if (!eventId) {
      notify('Operation Studio', 'Snapshot saved locally. Activate an operation to publish shared logs.', 'info');
      return;
    }
    setStudioBusy(true);
    try {
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: snapshotType === 'wrap' ? 'OPERATION_WRAP' : 'OPERATION_BLUEPRINT',
        severity: snapshotType === 'wrap' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: member?.id || null,
        summary: snapshotType === 'wrap'
          ? `Operation wrap: ${operationProfile?.name || 'Operation'}`
          : `Operation blueprint updated: ${operationProfile?.name || 'Operation'}`,
        details: {
          snapshot_type: snapshotType,
          operation_profile: operationProfile,
          readiness_gates: readinessGates,
          wrap_summary: wrapSummary,
        },
      });
      notify('Operation Studio', snapshotType === 'wrap' ? 'Wrap snapshot recorded.' : 'Blueprint snapshot recorded.', 'success');
    } catch (error) {
      console.error('Operation snapshot failed:', error);
      notify('Operation Studio', 'Failed to record operation snapshot.', 'error');
    } finally {
      setStudioBusy(false);
    }
  }, [eventId, member?.id, notify, operationProfile, readinessGates, wrapSummary]);

  const deployPhaseScaffold = useCallback(async () => {
    const phases = Array.isArray(operationProfile?.phases) ? operationProfile.phases : [];
    if (phases.length === 0) {
      notify('Operation Studio', 'Add at least one phase before deploying scaffold.', 'warning');
      return;
    }
    setStudioBusy(true);
    try {
      const start = resolveMacroCoordinate();
      const writes = phases.map((phase, index) => {
        const lat = start.lat + (index * 4);
        const lng = start.lng + ((index % 2 === 0 ? 1 : -1) * 3);
        return base44.entities.MapMarker.create({
          event_id: eventId || null,
          type: 'objective',
          label: `${index + 1}. ${phase.name}`,
          color: PHASE_STYLE_COLORS[index % PHASE_STYLE_COLORS.length],
          description: `${phase.objective}${phase.trigger ? ` | Trigger: ${phase.trigger}` : ''}`,
          coordinates: { lat, lng },
          map_level: mapLevel,
          issued_by_member_profile_id: member?.id || null,
          created_by_member_profile_id: member?.id || null,
          metadata: {
            source: 'operation_studio',
            phase_id: phase.id,
            duration_minutes: phase.durationMinutes,
          },
        });
      });

      const firstPhase = phases[0];
      writes.push(
        base44.entities.TacticalCommand.create({
          event_id: eventId || null,
          message: `Phase 1 ready: ${firstPhase.name}. ${firstPhase.objective}`,
          command_type: 'PLAN',
          priority: operationProfile?.pace === 'focused' ? 'HIGH' : 'STANDARD',
          status: 'ISSUED',
          coordinates: start,
          map_level: mapLevel,
          issued_by_member_profile_id: member?.id || null,
          metadata: {
            source: 'operation_studio',
            phase_id: firstPhase.id,
          },
        })
      );

      const result = await Promise.allSettled(writes);
      const successCount = result.filter((entry) => entry.status === 'fulfilled').length;
      notify('Operation Studio', `Deployed phase scaffold (${successCount}/${writes.length} updates).`, successCount === writes.length ? 'success' : 'warning');
      await loadData();
    } catch (error) {
      console.error('Phase scaffold deploy failed:', error);
      notify('Operation Studio', 'Failed to deploy phase scaffold.', 'error');
    } finally {
      setStudioBusy(false);
    }
  }, [operationProfile, notify, resolveMacroCoordinate, eventId, mapLevel, member?.id, loadData]);

  const issuePhaseCommand = useCallback(async () => {
    const phase = phaseList[activePhaseIndex];
    if (!phase) return;
    setStudioBusy(true);
    try {
      const coords = resolveMacroCoordinate();
      await base44.entities.TacticalCommand.create({
        event_id: eventId || null,
        message: `${phase.name}: ${phase.objective}`,
        command_type: 'PHASE',
        priority: operationProfile?.pace === 'focused' ? 'HIGH' : 'STANDARD',
        status: 'ISSUED',
        coordinates: coords,
        map_level: mapLevel,
        issued_by_member_profile_id: member?.id || null,
        metadata: {
          source: 'operation_studio',
          phase_id: phase.id,
          phase_trigger: phase.trigger,
          phase_fallback: phase.fallback,
        },
      });
      notify('Operation Studio', `Issued command for ${phase.name}.`, 'success');
      await loadData();
    } catch (error) {
      console.error('Issue phase command failed:', error);
      notify('Operation Studio', 'Failed to issue phase command.', 'error');
    } finally {
      setStudioBusy(false);
    }
  }, [activePhaseIndex, eventId, loadData, mapLevel, member?.id, notify, operationProfile, phaseList, resolveMacroCoordinate]);

  const activateContingency = useCallback(async (branchId, options = {}) => {
    const origin = toLower(options?.origin || 'manual');
    const autoReason = toText(options?.reason);
    const branch = contingencyList.find((entry) => toText(entry?.id) === toText(branchId));
    if (!branch) return;
    const status = toLower(branch?.status);
    if (status === 'disabled') {
      notify('Operation Studio', 'This contingency is disabled.', 'warning');
      return;
    }

    const toPhaseId = toText(branch?.to_phase_id || branch?.toPhaseId);
    const toPhaseIndex = phaseList.findIndex((phase) => toText(phase?.id) === toPhaseId);
    const targetPhase = toPhaseIndex >= 0 ? phaseList[toPhaseIndex] : null;
    const coords = resolveMacroCoordinate();
    const urgency = toLower(branch?.urgency);
    const priority = urgency === 'critical' ? 'CRITICAL' : urgency === 'high' ? 'HIGH' : 'STANDARD';

    setStudioBusy(true);
    try {
      const commandMessage = [
        `Contingency: ${toText(branch?.label, 'Branch')}`,
        toText(branch?.trigger_condition || branch?.triggerCondition),
        targetPhase?.name ? `Transition to ${targetPhase.name}` : '',
        origin === 'auto' && autoReason ? `Auto trigger: ${autoReason}` : '',
      ].filter(Boolean).join(' | ');

      await Promise.all([
        base44.entities.TacticalCommand.create({
          event_id: eventId || null,
          message: commandMessage,
          command_type: 'BRANCH',
          priority,
          status: 'ISSUED',
          coordinates: coords,
          map_level: mapLevel,
          issued_by_member_profile_id: member?.id || null,
          metadata: {
            source: 'operation_studio',
            branch_id: branch.id,
            branch_action: branch.branch_action,
            trigger_type: branch.trigger_type,
          },
        }),
        base44.entities.MapMarker.create({
          event_id: eventId || null,
          type: 'route',
          label: `Branch: ${toText(branch?.label, 'Branch')}`,
          color: urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f97316' : '#38bdf8',
          description: commandMessage,
          coordinates: coords,
          map_level: mapLevel,
          issued_by_member_profile_id: member?.id || null,
          created_by_member_profile_id: member?.id || null,
          metadata: {
            source: 'operation_studio',
            branch_id: branch.id,
            branch_action: branch.branch_action,
          },
        }),
      ]);

      if (toPhaseIndex >= 0 && toPhaseIndex !== activePhaseIndex) {
        setActivePhaseIndex(toPhaseIndex);
      }

      setOperationProfile((prev) => {
        const contingencies = Array.isArray(prev?.contingencies) ? [...prev.contingencies] : [];
        const index = contingencies.findIndex((entry) => toText(entry?.id) === toText(branch.id));
        if (index < 0) return prev;
        contingencies[index] = {
          ...contingencies[index],
          status: 'used',
          activation_count: Number(contingencies[index]?.activation_count || 0) + 1,
          last_activated_at: new Date().toISOString(),
          last_auto_triggered_at: origin === 'auto'
            ? new Date().toISOString()
            : contingencies[index]?.last_auto_triggered_at || null,
        };
        return {
          ...prev,
          contingencies: normalizeContingencies(contingencies, prev?.phases || []),
        };
      });

      notify(
        'Operation Studio',
        `Contingency ${origin === 'auto' ? 'auto-activated' : 'activated'}: ${toText(branch?.label, 'Branch')}.`,
        'success'
      );
      await loadData();
    } catch (error) {
      console.error('Contingency activation failed:', error);
      notify('Operation Studio', 'Failed to activate contingency branch.', 'error');
    } finally {
      setStudioBusy(false);
    }
  }, [activePhaseIndex, contingencyList, eventId, loadData, mapLevel, member?.id, notify, phaseList, resolveMacroCoordinate]);

  const autoTriggerEvaluation = useMemo(() => {
    if (studioMode !== 'execute') return null;
    if (replayOffsetMinutes > 0) return null;
    if (!activePhase) return null;

    const now = Date.now();
    const candidates = [];
    for (const branch of contingenciesForActivePhase) {
      if (!branch?.auto_enabled) continue;
      if (toLower(branch?.status) !== 'armed') continue;
      const triggerType = toLower(branch?.trigger_type);
      if (triggerType === 'command') continue;

      const cooldownMinutes = Math.max(1, Number(branch?.cooldown_minutes || 5));
      const lastAutoMs = toTimestampMs(branch?.last_auto_triggered_at || branch?.last_activated_at);
      if (lastAutoMs != null && (now - lastAutoMs) < (cooldownMinutes * 60000)) continue;

      const commsThreshold = Math.max(0, Number(branch?.auto_threshold_comms_score || 55));
      const incidentThreshold = Math.max(0, Number(branch?.auto_threshold_critical_incidents || 1));
      const elapsedThreshold = Math.max(1, Number(branch?.auto_threshold_elapsed_minutes || activePhase?.durationMinutes || 15));
      const urgencyKey = CONTINGENCY_URGENCY.includes(toLower(branch?.urgency)) ? toLower(branch?.urgency) : 'standard';
      const actionKey = CONTINGENCY_ACTIONS.includes(toLower(branch?.branch_action)) ? toLower(branch?.branch_action) : 'pivot';
      const urgencyWeight = CONTINGENCY_URGENCY_WEIGHTS[urgencyKey] || CONTINGENCY_URGENCY_WEIGHTS.standard;
      const actionWeight = CONTINGENCY_ACTION_WEIGHTS[actionKey] || CONTINGENCY_ACTION_WEIGHTS.pivot;
      let reason = '';
      let confidence = 0;

      if (triggerType === 'comms' && readinessMetrics.avgComms <= commsThreshold) {
        const delta = commsThreshold - readinessMetrics.avgComms;
        reason = `comms ${readinessMetrics.avgComms} <= ${commsThreshold}`;
        confidence = clamp(56 + (delta * 3), 0, 100);
      }

      if ((triggerType === 'contact' || triggerType === 'intel') && readinessMetrics.criticalIncidents >= incidentThreshold) {
        const delta = readinessMetrics.criticalIncidents - incidentThreshold;
        reason = `critical incidents ${readinessMetrics.criticalIncidents} >= ${incidentThreshold}`;
        confidence = clamp(60 + (delta * 14), 0, 100);
      }

      if (triggerType === 'contract' && (
        readinessMetrics.criticalIncidents >= incidentThreshold ||
        wrapSummary.commsRiskNets > 0 ||
        fleetPlanningMetrics.engineeringCriticalOpen > 0 ||
        fleetPlanningMetrics.loadoutCoveragePercent < 60
      )) {
        const incidentDelta = Math.max(0, readinessMetrics.criticalIncidents - incidentThreshold);
        const commsPressure = Math.max(0, wrapSummary.commsRiskNets);
        const engineeringPressure = Math.max(0, fleetPlanningMetrics.engineeringCriticalOpen);
        const loadoutPressure = Math.max(0, 60 - fleetPlanningMetrics.loadoutCoveragePercent);
        reason = 'contract pressure detected (incidents/comms/fleet readiness)';
        confidence = clamp(
          54 + (incidentDelta * 10) + (commsPressure * 6) + (engineeringPressure * 9) + Math.floor(loadoutPressure / 4),
          0,
          100
        );
      }

      if (triggerType === 'time' && phaseElapsedMinutes >= elapsedThreshold) {
        const delta = phaseElapsedMinutes - elapsedThreshold;
        reason = `phase runtime ${phaseElapsedMinutes}m >= ${elapsedThreshold}m`;
        confidence = clamp(52 + (delta * 4), 0, 100);
      }

      if (!reason || confidence <= 0) {
        continue;
      }

      candidates.push({
        id: branch.id,
        label: toText(branch?.label, 'Branch'),
        triggerType,
        reason,
        confidence,
        urgency: urgencyKey,
        action: actionKey,
        score: urgencyWeight + actionWeight + confidence,
      });
    }
    if (candidates.length === 0) {
      return {
        selected: null,
        candidates: [],
      };
    }
    candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.confidence !== left.confidence) return right.confidence - left.confidence;
      return toText(left.label).localeCompare(toText(right.label));
    });

    return {
      selected: candidates[0],
      candidates,
    };
  }, [
    studioMode,
    replayOffsetMinutes,
    activePhase,
    contingenciesForActivePhase,
    readinessMetrics.avgComms,
    readinessMetrics.criticalIncidents,
    wrapSummary.commsRiskNets,
    fleetPlanningMetrics.engineeringCriticalOpen,
    fleetPlanningMetrics.loadoutCoveragePercent,
    phaseElapsedMinutes,
  ]);

  const autoTriggerCandidate = autoTriggerEvaluation?.selected || null;
  const autoTriggerRankings = autoTriggerEvaluation?.candidates || [];
  const autoTriggerMap = useMemo(
    () => new Map(autoTriggerRankings.map((entry) => [toText(entry?.id), entry])),
    [autoTriggerRankings]
  );

  useEffect(() => {
    if (!autoTriggerCandidate) return;
    if (studioBusy || loading || autoBranchLockRef.current) return;
    autoBranchLockRef.current = true;
    activateContingency(autoTriggerCandidate.id, {
      origin: 'auto',
      reason: autoTriggerCandidate.reason,
    }).finally(() => {
      setTimeout(() => {
        autoBranchLockRef.current = false;
      }, 750);
    });
  }, [autoTriggerCandidate, studioBusy, loading, activateContingency]);

  const handleMapClick = useCallback((event) => {
    const coords = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (activeTool === 'marker') {
      setMarkerDraft(coords);
      setMarkerForm(DEFAULT_MARKER);
      return;
    }
    if (activeTool === 'route' || activeTool === 'zone') {
      setDraftPoints((prev) => [...prev, coords]);
      return;
    }
    if (activeTool === 'ping') {
      createMarker({
        ...DEFAULT_MARKER,
        type: 'ping',
        label: 'Ping',
      }, coords, { expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() });
      return;
    }
    if (activeTool === 'report') {
      setReportDraft(coords);
      setReportForm(DEFAULT_REPORT);
    }
  }, [activeTool]);

  const createMarker = async (form, coords, extra = {}) => {
    if (!coords) return;
    setCreating(true);
    try {
      await base44.entities.MapMarker.create({
        event_id: eventId || null,
        type: form.type,
        label: form.label || 'Marker',
        color: form.color || '#f97316',
        description: form.description || '',
        coordinates: coords,
        map_level: mapLevel,
        issued_by_member_profile_id: member?.id || null,
        created_by_member_profile_id: member?.id || null,
        metadata: extra.metadata || undefined,
        expires_at: extra.expires_at || undefined,
      });
      notify('Tactical Map', 'Marker created.', 'success');
    } catch (error) {
      console.error('Marker create failed:', error);
      notify('Tactical Map', 'Failed to create marker.', 'error');
    } finally {
      setCreating(false);
      setMarkerDraft(null);
      setMarkerForm(DEFAULT_MARKER);
    }
  };

  const submitRoute = async (type) => {
    if (draftPoints.length < (type === 'route' ? 2 : 3)) return;
    setCreating(true);
    try {
      await base44.entities.MapMarker.create({
        event_id: eventId || null,
        type,
        label: type === 'route' ? 'Route Plan' : 'Zone',
        color: '#38bdf8',
        description: type === 'route' ? 'Planned route' : 'Operational zone',
        coordinates: draftPoints[0],
        map_level: mapLevel,
        issued_by_member_profile_id: member?.id || null,
        created_by_member_profile_id: member?.id || null,
        metadata: { points: draftPoints },
      });
      notify('Tactical Map', `${type === 'route' ? 'Route' : 'Zone'} saved.`, 'success');
    } catch (error) {
      console.error('Route/Zone create failed:', error);
      notify('Tactical Map', 'Failed to save route/zone.', 'error');
    } finally {
      setCreating(false);
      setDraftPoints([]);
    }
  };

  const submitReport = async () => {
    if (!reportDraft || !member?.id) return;
    setCreating(true);
    try {
      const existing = await base44.entities.PlayerStatus.filter({
        member_profile_id: member.id,
        ...(eventId ? { event_id: eventId } : {}),
      });

      const payload = {
        member_profile_id: member.id,
        event_id: eventId || null,
        status: reportForm.status,
        role: reportForm.role,
        coordinates: reportDraft,
        notes: reportForm.notes,
        map_level: mapLevel,
      };

      if (existing?.[0]) {
        await base44.entities.PlayerStatus.update(existing[0].id, payload);
      } else {
        await base44.entities.PlayerStatus.create(payload);
      }

      notify('Status Reported', 'Your position has been updated.', 'success');
    } catch (error) {
      console.error('Status report failed:', error);
      notify('Status Report', 'Unable to update status.', 'error');
    } finally {
      setCreating(false);
      setReportDraft(null);
      setReportForm(DEFAULT_REPORT);
    }
  };

  const handleSeedDemo = async () => {
    if (!eventId) {
      notify('Seed Map', 'Activate an operation to seed tactical data.', 'warning');
      return;
    }
    try {
      await invokeMemberFunction('seedTacticalMap', { eventId });
      notify('Seed Map', 'Scenario seeded.', 'success');
    } catch (error) {
      console.error('Seed map failed:', error);
      notify('Seed Map', 'Failed to seed scenario.', 'error');
    }
  };

  const removeMarker = async (markerId) => {
    if (!markerId) return;
    try {
      await base44.entities.MapMarker.delete(markerId);
    } catch (error) {
      console.error('Failed to delete marker:', error);
      notify('Tactical Map', 'Failed to remove marker.', 'error');
    }
  };

  const routePreview = draftPoints.map((p) => [p.lat, p.lng]);
  const levelBounds = mapConfig.bounds;

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-4'}`}>
      {!compact && (
      <div className="col-span-1 space-y-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Map Level</div>
            {activeEvent && (
              <div className="text-[10px] text-orange-400 uppercase">{activeEvent.title}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MAP_LEVELS.map((level) => (
              <Button
                key={level.id}
                size="sm"
                variant={mapLevel === level.id ? 'default' : 'outline'}
                onClick={() => setMapLevel(level.id)}
                className="text-xs"
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <div className="inline-flex items-center gap-2">
              <History className="w-3 h-3" />
              Time Machine
            </div>
            <div className="text-[10px] text-orange-300">{replayAnchorLabel}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={historyWindowMinutes}
              onChange={(e) => setHistoryWindowMinutes(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              aria-label="Select timeline window"
            >
              {HISTORY_WINDOWS.map((window) => (
                <option key={window.id} value={window.id}>{window.label}</option>
              ))}
            </select>
            <div className="text-[10px] text-zinc-400 rounded border border-zinc-800 px-2 py-1 flex items-center justify-center">
              End: {replayOffsetMinutes ? formatRelativeTime(new Date(replayEndMs).toISOString()) : 'Now'}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={replayOffsetMinutes}
            aria-label="Replay offset in minutes"
            onChange={(e) => setReplayOffsetMinutes(Math.max(0, Math.min(360, Number(e.target.value) || 0)))}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-[10px]" onClick={() => setReplayOffsetMinutes(0)}>
              Live
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px]"
              onClick={() => setReplayOffsetMinutes((prev) => Math.max(0, prev - 5))}
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              5m
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px]"
              onClick={() => setReplayOffsetMinutes((prev) => Math.min(360, prev + 5))}
            >
              <ChevronRight className="w-3 h-3 mr-1" />
              5m
            </Button>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <div className="inline-flex items-center gap-2">
              <Target className="w-3 h-3" />
              Operation Studio
            </div>
            <div className="text-[10px] text-zinc-400">Inspired by in-fleet.space</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['plan', 'execute', 'wrap'].map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={studioMode === mode ? 'default' : 'outline'}
                className="text-[10px] uppercase"
                onClick={() => setStudioMode(mode)}
              >
                {STUDIO_MODE_LABELS[mode]?.label || mode}
              </Button>
            ))}
          </div>
          <div className="text-[11px] text-zinc-400">
            {STUDIO_MODE_LABELS[studioMode]?.subtitle}
          </div>

          {studioMode === 'plan' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={operationProfile?.template_id || OPERATION_TEMPLATES[0].id}
                  onChange={(event) => setProfileField('template_id', event.target.value)}
                  className="col-span-2 w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Select operation template"
                >
                  {OPERATION_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>{template.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px]"
                  onClick={() => applyTemplate(operationProfile?.template_id || OPERATION_TEMPLATES[0].id)}
                >
                  Apply
                </Button>
              </div>

              <Input
                value={operationProfile?.name || ''}
                onChange={(event) => setProfileField('name', event.target.value)}
                placeholder="Operation name"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={operationProfile?.operationType || 'combat'}
                  onChange={(event) => setProfileField('operationType', event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Operation type"
                >
                  <option value="combat">Combat</option>
                  <option value="logistics">Logistics</option>
                  <option value="rescue">Rescue</option>
                  <option value="contract">Contract</option>
                  <option value="exploration">Exploration</option>
                  <option value="custom">Custom</option>
                </select>
                <select
                  value={operationProfile?.pace || 'focused'}
                  onChange={(event) => setProfileField('pace', event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Operation tempo"
                >
                  <option value="focused">Focused</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <Textarea
                value={operationProfile?.objectivePrimary || ''}
                onChange={(event) => setProfileField('objectivePrimary', event.target.value)}
                placeholder="Primary objective"
                className="min-h-[70px]"
              />
              <Textarea
                value={operationProfile?.objectiveSecondary || ''}
                onChange={(event) => setProfileField('objectiveSecondary', event.target.value)}
                placeholder="Secondary objective / contingency"
                className="min-h-[60px]"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={operationProfile?.contractMode || 'support'}
                  onChange={(event) => setProfileField('contractMode', event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Contract integration mode"
                >
                  <option value="none">No contracts</option>
                  <option value="support">Support contracts</option>
                  <option value="embedded">Embedded contracts</option>
                  <option value="primary">Contract-first op</option>
                </select>
                <select
                  value={operationProfile?.contractVisibility || 'allies'}
                  onChange={(event) => setProfileField('contractVisibility', event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Contract visibility"
                >
                  <option value="private">Private</option>
                  <option value="allies">Org + allies</option>
                  <option value="public">Public board</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Comms Doctrine</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={operationProfile?.comms?.discipline || 'adaptive'}
                    onChange={(event) => setProfileCommsField('discipline', event.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                    aria-label="Comms discipline"
                  >
                    <option value="strict">Strict</option>
                    <option value="adaptive">Adaptive</option>
                    <option value="open">Open</option>
                  </select>
                  <select
                    value={operationProfile?.comms?.priorityLane || 'COMMAND'}
                    onChange={(event) => setProfileCommsField('priorityLane', event.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                    aria-label="Priority lane"
                  >
                    <option value="COMMAND">Command</option>
                    <option value="STRIKE">Strike</option>
                    <option value="LOGISTICS">Logistics</option>
                    <option value="RESCUE">Rescue</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <label className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Require operation voice nets</span>
                  <input
                    type="checkbox"
                    checked={Boolean(operationProfile?.comms?.requireOperationVoice)}
                    onChange={(event) => setProfileCommsField('requireOperationVoice', event.target.checked)}
                    aria-label="Require operation voice nets"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Bridge to hangout lane</span>
                  <input
                    type="checkbox"
                    checked={Boolean(operationProfile?.comms?.hangoutBridge)}
                    onChange={(event) => setProfileCommsField('hangoutBridge', event.target.checked)}
                    aria-label="Enable hangout bridge"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Asset Mix</div>
                <div className="grid grid-cols-5 gap-2">
                  {['fighters', 'escorts', 'haulers', 'medevac', 'support'].map((assetKey) => (
                    <div key={assetKey} className="space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase">{assetKey.slice(0, 3)}</div>
                      <Input
                        type="number"
                        min={0}
                        value={operationProfile?.assets?.[assetKey] ?? 0}
                        onChange={(event) => setProfileAssetField(assetKey, event.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Fleet Readiness</div>
                  <a
                    href={createPageUrl('FleetCommand')}
                    className="text-[10px] text-orange-300 hover:text-orange-200 underline"
                  >
                    Open Fleet Command
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-zinc-800 px-2 py-1">
                    <div className="text-zinc-500 uppercase">Assigned</div>
                    <div className="text-zinc-200">
                      {fleetPlanningMetrics.totalAssets}/{fleetPlanningMetrics.requiredAssets || 0}
                    </div>
                  </div>
                  <div className="rounded border border-zinc-800 px-2 py-1">
                    <div className="text-zinc-500 uppercase">Operational</div>
                    <div className={fleetPlanningMetrics.operationalPercent >= 60 ? 'text-emerald-300' : 'text-orange-300'}>
                      {fleetPlanningMetrics.operationalPercent}% ({fleetPlanningMetrics.operationalCount})
                    </div>
                  </div>
                  <div className="rounded border border-zinc-800 px-2 py-1">
                    <div className="text-zinc-500 uppercase">Telemetry</div>
                    <div className={fleetPlanningMetrics.telemetryReadyPercent >= 70 ? 'text-emerald-300' : 'text-orange-300'}>
                      {fleetPlanningMetrics.telemetryReadyPercent}% ready
                    </div>
                  </div>
                  <div className="rounded border border-zinc-800 px-2 py-1">
                    <div className="text-zinc-500 uppercase">Loadouts</div>
                    <div className={fleetPlanningMetrics.loadoutCoveragePercent >= 60 ? 'text-emerald-300' : 'text-orange-300'}>
                      {fleetPlanningMetrics.loadoutCoveragePercent}% active
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Engineering open: {fleetPlanningMetrics.engineeringOpen} (critical {fleetPlanningMetrics.engineeringCriticalOpen}) | Reservations: focused {fleetPlanningMetrics.reservationsFocused}, casual {fleetPlanningMetrics.reservationsCasual}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Phases</div>
                  <Button size="sm" variant="outline" className="text-[10px]" onClick={addPhase}>Add Phase</Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(operationProfile?.phases || []).map((phase, phaseIndex) => (
                    <div key={phase.id} className="rounded border border-zinc-800 bg-zinc-950/50 p-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Phase {phaseIndex + 1}</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => removePhase(phaseIndex)}
                          disabled={(operationProfile?.phases || []).length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <Input
                        value={phase.name}
                        onChange={(event) => updatePhase(phaseIndex, 'name', event.target.value)}
                        placeholder="Phase name"
                        className="h-8 text-xs"
                      />
                      <Textarea
                        value={phase.objective}
                        onChange={(event) => updatePhase(phaseIndex, 'objective', event.target.value)}
                        placeholder="Phase objective"
                        className="min-h-[54px] text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={phase.trigger}
                          onChange={(event) => updatePhase(phaseIndex, 'trigger', event.target.value)}
                          placeholder="Trigger"
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={phase.durationMinutes}
                          onChange={(event) => updatePhase(phaseIndex, 'durationMinutes', event.target.value)}
                          placeholder="Duration min"
                          className="h-8 text-xs"
                        />
                      </div>
                      <Input
                        value={phase.fallback}
                        onChange={(event) => updatePhase(phaseIndex, 'fallback', event.target.value)}
                        placeholder="Fallback action"
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Branch Tree</div>
                  <Button size="sm" variant="outline" className="text-[10px]" onClick={addContingency}>Add Branch</Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(contingencyList || []).map((branch, branchIndex) => (
                    <div key={branch.id} className="rounded border border-zinc-800 bg-zinc-950/50 p-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Branch {branchIndex + 1}</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => removeContingency(branchIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                      <Input
                        value={branch.label}
                        onChange={(event) => updateContingency(branchIndex, 'label', event.target.value)}
                        placeholder="Branch label"
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={branch.from_phase_id}
                          onChange={(event) => updateContingency(branchIndex, 'from_phase_id', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch from phase"
                        >
                          {phaseList.map((phase, phaseIndex) => (
                            <option key={phase.id} value={phase.id}>{phaseIndex + 1}. {phase.name}</option>
                          ))}
                        </select>
                        <select
                          value={branch.to_phase_id}
                          onChange={(event) => updateContingency(branchIndex, 'to_phase_id', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch to phase"
                        >
                          {phaseList.map((phase, phaseIndex) => (
                            <option key={phase.id} value={phase.id}>{phaseIndex + 1}. {phase.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={branch.trigger_type}
                          onChange={(event) => updateContingency(branchIndex, 'trigger_type', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch trigger type"
                        >
                          {CONTINGENCY_TRIGGER_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <select
                          value={branch.branch_action}
                          onChange={(event) => updateContingency(branchIndex, 'branch_action', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch action"
                        >
                          {CONTINGENCY_ACTIONS.map((action) => (
                            <option key={action} value={action}>{action}</option>
                          ))}
                        </select>
                        <select
                          value={branch.urgency}
                          onChange={(event) => updateContingency(branchIndex, 'urgency', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch urgency"
                        >
                          {CONTINGENCY_URGENCY.map((urgency) => (
                            <option key={urgency} value={urgency}>{urgency}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        value={branch.trigger_condition}
                        onChange={(event) => updateContingency(branchIndex, 'trigger_condition', event.target.value)}
                        placeholder="Trigger condition"
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={branch.notes || ''}
                          onChange={(event) => updateContingency(branchIndex, 'notes', event.target.value)}
                          placeholder="Branch notes"
                          className="h-8 text-xs"
                        />
                        <select
                          value={branch.status}
                          onChange={(event) => updateContingency(branchIndex, 'status', event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label="Branch status"
                        >
                          {CONTINGENCY_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2 space-y-2">
                        <label className="flex items-center justify-between text-xs text-zinc-400">
                          <span>Auto trigger</span>
                          <input
                            type="checkbox"
                            checked={Boolean(branch.auto_enabled)}
                            onChange={(event) => updateContingency(branchIndex, 'auto_enabled', event.target.checked)}
                            aria-label="Enable auto trigger for branch"
                          />
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase">Comms &lt;=</div>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={branch.auto_threshold_comms_score}
                              onChange={(event) => updateContingency(branchIndex, 'auto_threshold_comms_score', Number(event.target.value || 0))}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase">Crit Inc &gt;=</div>
                            <Input
                              type="number"
                              min={0}
                              value={branch.auto_threshold_critical_incidents}
                              onChange={(event) => updateContingency(branchIndex, 'auto_threshold_critical_incidents', Number(event.target.value || 0))}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase">Elapsed &gt;=</div>
                            <Input
                              type="number"
                              min={1}
                              value={branch.auto_threshold_elapsed_minutes}
                              onChange={(event) => updateContingency(branchIndex, 'auto_threshold_elapsed_minutes', Number(event.target.value || 1))}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase">Cooldown</div>
                            <Input
                              type="number"
                              min={1}
                              value={branch.cooldown_minutes}
                              onChange={(event) => updateContingency(branchIndex, 'cooldown_minutes', Number(event.target.value || 1))}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {contingencyList.length === 0 && (
                    <div className="text-xs text-zinc-500">No branches defined yet.</div>
                  )}
                </div>
              </div>

              <Textarea
                value={operationProfile?.notes || ''}
                onChange={(event) => setProfileField('notes', event.target.value)}
                placeholder="Planner notes, caveats, contract assumptions"
                className="min-h-[64px]"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => persistOperationSnapshot('plan')}
                  disabled={studioBusy}
                >
                  Save Blueprint
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={deployPhaseScaffold}
                  disabled={studioBusy}
                >
                  Deploy Scaffold
                </Button>
              </div>
            </div>
          )}

          {studioMode === 'execute' && (
            <div className="space-y-3">
              <div className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Current Phase</div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setActivePhaseIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <select
                    value={activePhaseIndex}
                    onChange={(event) => setActivePhaseIndex(Number(event.target.value))}
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                    aria-label="Select active phase"
                  >
                    {(operationProfile?.phases || []).map((phase, phaseIndex) => (
                      <option key={phase.id} value={phaseIndex}>
                        {phaseIndex + 1}. {phase.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setActivePhaseIndex((prev) => Math.min((operationProfile?.phases || []).length - 1, prev + 1))}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              {(operationProfile?.phases || [])[activePhaseIndex] && (
                  <div className="mt-2 text-xs text-zinc-300">
                    {(operationProfile?.phases || [])[activePhaseIndex]?.objective}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Active Branch Options</div>
                  <div className={`text-[10px] ${autoTriggerCandidate ? 'text-orange-300' : 'text-zinc-500'}`}>
                    {autoTriggerCandidate ? `Auto pending: ${autoTriggerCandidate.reason}` : 'Auto watch nominal'}
                  </div>
                </div>
                {autoTriggerRankings.length > 0 && (
                  <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2 space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Auto Arbitration</div>
                    {autoTriggerRankings.slice(0, 3).map((candidate, index) => (
                      <div key={candidate.id} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-zinc-300 truncate">
                          {index + 1}. {candidate.label}
                        </span>
                        <span className={index === 0 ? 'text-orange-300' : 'text-zinc-400'}>
                          score {Math.round(candidate.score)} | conf {Math.round(candidate.confidence)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {contingenciesForActivePhase.map((branch) => {
                    const branchIndex = contingencyList.findIndex((entry) => toText(entry?.id) === toText(branch?.id));
                    const status = toLower(branch?.status);
                    const candidate = autoTriggerMap.get(toText(branch?.id));
                    const urgencyClass = status === 'disabled'
                      ? 'text-zinc-500'
                      : branch.urgency === 'critical'
                        ? 'text-red-300'
                        : branch.urgency === 'high'
                          ? 'text-orange-300'
                          : 'text-emerald-300';
                    return (
                      <div key={branch.id} className="rounded border border-zinc-800 bg-zinc-950/60 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-zinc-200">{branch.label}</div>
                          <div className={`text-[10px] uppercase ${urgencyClass}`}>{branch.urgency}</div>
                        </div>
                        <div className="text-[10px] text-zinc-400">{branch.trigger_condition}</div>
                        <div className="text-[10px] text-zinc-500">
                          Action: {branch.branch_action} | State: {branch.status}
                          {branch.last_activated_at ? ` | Last: ${formatRelativeTime(branch.last_activated_at)}` : ''}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Auto: {branch.auto_enabled ? 'ON' : 'OFF'}
                          {branch.auto_enabled ? ` | Cooldown ${branch.cooldown_minutes}m` : ''}
                          {branch.last_auto_triggered_at ? ` | Auto last ${formatRelativeTime(branch.last_auto_triggered_at)}` : ''}
                        </div>
                        {candidate && (
                          <div className="text-[10px] text-orange-300">
                            Auto score {Math.round(candidate.score)} | Confidence {Math.round(candidate.confidence)} | {candidate.reason}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="text-[10px]"
                            onClick={() => activateContingency(branch.id)}
                            disabled={studioBusy || status === 'disabled'}
                          >
                            Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px]"
                            onClick={() => updateContingency(branchIndex, 'status', status === 'disabled' ? 'armed' : 'disabled')}
                            disabled={branchIndex < 0}
                          >
                            {status === 'disabled' ? 'Arm' : 'Disable'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {contingenciesForActivePhase.length === 0 && (
                    <div className="text-xs text-zinc-500">No branch options linked to this phase.</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded border border-zinc-800 bg-zinc-950/60 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Fleet Posture</div>
                    <div className="text-[10px] text-zinc-400">Telemetry {fleetPlanningMetrics.telemetryAverage}%</div>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Operational {fleetPlanningMetrics.operationalCount}/{fleetPlanningMetrics.totalAssets} | Loadouts {fleetPlanningMetrics.activeLoadoutCount}/{fleetPlanningMetrics.totalAssets}
                  </div>
                  <div className={fleetPlanningMetrics.engineeringCriticalOpen > 0 ? 'text-[10px] text-orange-300' : 'text-[10px] text-emerald-300'}>
                    Engineering critical: {fleetPlanningMetrics.engineeringCriticalOpen}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Go / No-Go Gates</div>
                {readinessGates.map((gate) => (
                  <div key={gate.id} className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-zinc-200">{gate.label}</div>
                      <div className={`text-[10px] uppercase ${gate.pass ? 'text-emerald-300' : 'text-red-300'}`}>
                        {gate.pass ? 'Pass' : 'Fail'}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400">{gate.value}</div>
                    {!gate.pass && (
                      <div className="text-[10px] text-orange-300 mt-1">{gate.recommendation}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="text-xs" onClick={issuePhaseCommand} disabled={studioBusy}>
                  Issue Phase
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => runTacticalMacro('broadcast')} disabled={studioBusy || macroBusy}>
                  Broadcast
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => persistOperationSnapshot('execute')}
                disabled={studioBusy}
              >
                Capture Execution Snapshot
              </Button>
            </div>
          )}

          {studioMode === 'wrap' && (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-[10px]">
                <div className="rounded border border-zinc-700 px-2 py-1">
                  <div className="text-zinc-500 uppercase">Commands</div>
                  <div className="text-sm text-white">{wrapSummary.commandsIssued}</div>
                </div>
                <div className="rounded border border-zinc-700 px-2 py-1">
                  <div className="text-zinc-500 uppercase">Incidents</div>
                  <div className="text-sm text-white">{wrapSummary.incidentsLogged}</div>
                </div>
                <div className="rounded border border-zinc-700 px-2 py-1">
                  <div className="text-zinc-500 uppercase">Callouts</div>
                  <div className="text-sm text-white">{wrapSummary.calloutsLogged}</div>
                </div>
                <div className="rounded border border-zinc-700 px-2 py-1">
                  <div className="text-zinc-500 uppercase">Branches</div>
                  <div className="text-sm text-white">{wrapSummary.branchesUsed}</div>
                </div>
                <div className="rounded border border-zinc-700 px-2 py-1">
                  <div className="text-zinc-500 uppercase">Auto</div>
                  <div className="text-sm text-white">{wrapSummary.autoBranchesUsed}</div>
                </div>
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/50 p-2 text-xs text-zinc-300">
                <div>Status reports: {wrapSummary.statusReports}</div>
                <div>Map actions: {wrapSummary.mapActions}</div>
                <div className={wrapSummary.commsRiskNets > 0 ? 'text-orange-300' : 'text-emerald-300'}>
                  Comms risk nets: {wrapSummary.commsRiskNets}
                </div>
              </div>
              <Textarea
                value={operationProfile?.notes || ''}
                onChange={(event) => setProfileField('notes', event.target.value)}
                placeholder="Wrap notes: lessons learned, contract outcomes, adjustments"
                className="min-h-[70px]"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => persistOperationSnapshot('wrap')}
                  disabled={studioBusy}
                >
                  Capture Wrap
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => exportTimeline('json')}>
                  Export AAR
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Crosshair className="w-3 h-3" />
            Tools
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TOOL_DEFS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={activeTool === tool.id ? 'default' : 'outline'}
                  onClick={() => setActiveTool(tool.id)}
                  className="text-xs justify-start gap-2"
                >
                  <Icon className="w-3 h-3" />
                  {tool.label}
                </Button>
              );
            })}
          </div>
          {(activeTool === 'route' || activeTool === 'zone') && draftPoints.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400">Draft points: {draftPoints.length}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submitRoute(activeTool)} disabled={creating}>
                  Save {activeTool === 'route' ? 'Route' : 'Zone'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDraftPoints([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleSeedDemo} className="w-full text-xs">
              <Zap className="w-3 h-3 mr-2" />
              Seed Demo Scenario
            </Button>
          )}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Target className="w-3 h-3" />
            Tactical Macros
          </div>
          <div className="grid grid-cols-1 gap-2">
            {TACTICAL_MACROS.map((macro) => (
              <Button
                key={macro.id}
                size="sm"
                variant="outline"
                onClick={() => runTacticalMacro(macro.id)}
                disabled={macroBusy || creating}
                className="text-xs justify-start gap-2"
              >
                <Megaphone className="w-3 h-3" />
                {macro.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Layers className="w-3 h-3" />
            Layers
          </div>
          {Object.entries(layerVisibility).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase">{key}</span>
              <input
                type="checkbox"
                checked={value}
                aria-label={`Toggle ${key} layer`}
                onChange={() => setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
            </label>
          ))}
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3" />
              Comms Network
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadData}
              className="h-6 px-2 text-[10px]"
              aria-label="Refresh comms topology"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
          <select
            value={commsFilter}
            onChange={(e) => setCommsFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            aria-label="Filter comms network by net type"
          >
            {COMMS_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">
              <div className="text-zinc-500 uppercase">Nets</div>
              <div className="text-sm text-white">{commsSummary.netCount}</div>
            </div>
            <div className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">
              <div className="text-zinc-500 uppercase">Links</div>
              <div className="text-sm text-white">{commsSummary.participantCount}</div>
            </div>
            <div className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">
              <div className="text-zinc-500 uppercase">Bridges</div>
              <div className="text-sm text-white">{commsSummary.bridgeCount}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="inline-flex items-center gap-1"><Volume2 className="w-3 h-3" />Speaking {commsSummary.speakingCount}</span>
            <span>Muted {commsSummary.mutedCount}</span>
            <span className="text-red-300">Critical {commsSummary.criticalCount}</span>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 inline-flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Net Health
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {commsNetHealth.slice(0, 4).map((net) => (
                <div key={net.netId} className="rounded border border-zinc-800 bg-zinc-950/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-200 truncate">{net.label}</div>
                    <div className="text-[10px] uppercase" style={{ color: net.color }}>{net.quality}</div>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div className="h-full" style={{ width: `${net.score}%`, backgroundColor: net.color }} />
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>{net.congestion}</span>
                    <span>P{net.participants} S{net.speaking} M{net.muted}</span>
                  </div>
                </div>
              ))}
              {commsNetHealth.length === 0 && (
                <div className="text-xs text-zinc-500">No active nets in current window.</div>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {commsGraph.calloutNodes.slice(0, 5).map((callout) => (
              <div key={callout.id} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: COMMS_PRIORITY_COLORS[callout.priority] || COMMS_PRIORITY_COLORS.STANDARD }}
                  >
                    {callout.priority}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatRelativeTime(callout.createdDate)}</span>
                </div>
                <div className="text-xs text-zinc-300 line-clamp-2">{callout.message || 'Priority callout'}</div>
              </div>
            ))}
            {commsGraph.calloutNodes.length === 0 && (
              <div className="text-xs text-zinc-500">No recent comms callouts.</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Users className="w-3 h-3" />
            Status Feed
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredStatuses.slice(0, 6).map((status) => (
              <div key={status.id} className="text-xs text-zinc-400 flex items-center justify-between">
                <span className="truncate">
                  {memberMap[status.member_profile_id]?.label || status.callsign || status.member_profile_id}
                </span>
                <span className="text-[10px] text-orange-300">{status.status}</span>
              </div>
            ))}
            {filteredStatuses.length === 0 && (
              <div className="text-xs text-zinc-500">No status reports yet.</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <div className="inline-flex items-center gap-2">
              <History className="w-3 h-3" />
              Command Timeline
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => exportTimeline('json')}
                aria-label="Export timeline as JSON"
              >
                <Download className="w-3 h-3 mr-1" />
                JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => exportTimeline('csv')}
                aria-label="Export timeline as CSV"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-[10px] text-white px-2 py-1 rounded"
                aria-label="Filter timeline event type"
              >
                {TIMELINE_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {timelineEvents.slice(0, 12).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => focusMapOnCoordinate(entry.coord)}
                className="w-full text-left rounded border border-zinc-800 bg-zinc-950/60 p-2 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${TIMELINE_TYPE_STYLES[entry.type] || TIMELINE_TYPE_STYLES.map}`}>
                    {entry.type}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatRelativeTime(entry.createdDate)}</span>
                </div>
                <div className="text-xs text-zinc-200 mt-1 line-clamp-1">{entry.title}</div>
                <div className="text-[10px] text-zinc-400 line-clamp-2">{entry.detail}</div>
              </button>
            ))}
            {timelineEvents.length === 0 && (
              <div className="text-xs text-zinc-500">No timeline events in selected window.</div>
            )}
          </div>
        </div>
      </div>
      )}

      <div className={`${compact ? 'col-span-1' : 'col-span-3'} bg-zinc-900/40 border border-zinc-800 rounded overflow-hidden relative`}>
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 text-zinc-300">
            {mapLevel} grid
          </div>
          {loading && (
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 text-orange-300 flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Sync
            </div>
          )}
          {replayOffsetMinutes > 0 && (
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest bg-red-950/70 border border-red-700 text-red-200">
              Replay {replayOffsetMinutes}m
            </div>
          )}
        </div>
        {layerVisibility.comms && (
          <div className="absolute top-3 right-3 z-[400] px-3 py-2 text-[10px] uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 text-zinc-200 space-y-1">
            <div className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Comms Overlay
            </div>
            <div>Nets {commsSummary.netCount} | Bridges {commsSummary.bridgeCount}</div>
            <div>Speakers {commsSummary.speakingCount} | Critical {commsSummary.criticalCount}</div>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40" />
        <MapContainer
          ref={mapRef}
          crs={L.CRS.Simple}
          center={[mapConfig.bounds[1][0] / 2, mapConfig.bounds[1][1] / 2]}
          zoom={mapConfig.zoom}
          minZoom={-1}
          maxZoom={3}
          maxBounds={levelBounds}
          style={{ height: '620px', width: '100%', background: 'transparent' }}
          className="tactical-map"
        >
          <TacticalMapEvents activeTool={activeTool} onMapClick={handleMapClick} />

          {layerVisibility.markers &&
            filteredMarkers.markers.map((marker) => {
              const coord = getCoordinate(marker);
              if (!coord) return null;
              const label = marker.label || marker.type;
              return (
                <Marker
                  key={marker.id}
                  position={coord}
                  icon={createMarkerIcon(marker.color)}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-orange-200">{label}</div>
                    {marker.description && <div className="text-[10px] text-zinc-400">{marker.description}</div>}
                    {(isAdmin || marker.created_by_member_profile_id === member?.id) && (
                      <button
                        type="button"
                        onClick={() => removeMarker(marker.id)}
                        className="text-[10px] text-red-400 mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </Tooltip>
                </Marker>
              );
            })}

          {layerVisibility.routes &&
            filteredMarkers.routes.map((route) => {
              const points = route?.metadata?.points || [];
              if (!Array.isArray(points) || points.length < 2) return null;
              return (
                <Polyline
                  key={route.id}
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: route.color || '#38bdf8', weight: 2 }}
                />
              );
            })}

          {layerVisibility.zones &&
            filteredMarkers.zones.map((zone) => {
              const points = zone?.metadata?.points || [];
              if (!Array.isArray(points) || points.length < 3) return null;
              return (
                <Polygon
                  key={zone.id}
                  positions={points.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: zone.color || '#a855f7', fillOpacity: 0.2 }}
                />
              );
            })}

          {layerVisibility.pings &&
            filteredMarkers.pings.map((ping) => {
              const coord = getCoordinate(ping);
              if (!coord) return null;
              return (
                <CircleMarker
                  key={ping.id}
                  center={coord}
                  radius={8}
                  pathOptions={{ color: ping.color || '#facc15', fillColor: ping.color || '#facc15' }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-orange-200">{ping.label || 'Ping'}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {layerVisibility.statuses &&
            filteredStatuses.map((status) => {
              const coord = getCoordinate(status);
              if (!coord) return null;
              const label = memberMap[status.member_profile_id]?.label || status.callsign || status.member_profile_id || 'Unknown';
              const color = STATUS_COLORS[status.status] || '#38bdf8';
              return (
                <CircleMarker
                  key={status.id}
                  center={coord}
                  radius={6}
                  pathOptions={{ color, fillColor: color }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <div className="text-[10px] text-zinc-300">{status.status}</div>
                    {status.notes && <div className="text-[10px] text-zinc-400">{status.notes}</div>}
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {layerVisibility.incidents &&
            filteredIncidents.map((incident) => {
              const coord = getCoordinate(incident);
              if (!coord) return null;
              return (
                <Marker
                  key={incident.id}
                  position={coord}
                  icon={createMarkerIcon('#ef4444')}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-red-300">{incident.title}</div>
                    <div className="text-[10px] text-zinc-400">{incident.description}</div>
                  </Tooltip>
                </Marker>
              );
            })}

          {layerVisibility.commands &&
            filteredCommands.map((command) => {
              const coord = getCoordinate(command);
              if (!coord) return null;
              return (
                <Marker
                  key={command.id}
                  position={coord}
                  icon={createMarkerIcon('#0ea5e9')}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-cyan-300">Command</div>
                    <div className="text-[10px] text-zinc-300">{command.message}</div>
                  </Tooltip>
                </Marker>
              );
            })}

          {layerVisibility.comms && commsGraph.memberLinks.map((link) => (
            <Polyline
              key={`member-link-${link.id}`}
              positions={link.points}
              pathOptions={{
                color: link.speaking ? '#f97316' : '#71717a',
                weight: link.speaking ? 2.5 : 1.2,
                opacity: link.muted ? 0.28 : (link.speaking ? 0.95 : 0.55),
                dashArray: link.muted ? '4 6' : (link.speaking ? '9 7' : undefined),
                dashOffset: link.muted
                  ? `${flowPhase}px`
                  : (link.speaking ? `${-flowPhase}px` : undefined),
              }}
            />
          ))}

          {layerVisibility.comms && commsGraph.bridgeLinks.map((bridge) => (
            <Polyline
              key={`bridge-link-${bridge.id}`}
              positions={bridge.points}
              pathOptions={{
                color: bridge.status === 'degraded' ? '#f97316' : '#22d3ee',
                weight: 2,
                opacity: 0.8,
                dashArray: '10 6',
                dashOffset: `${-flowPhase}px`,
              }}
            />
          ))}

          {layerVisibility.comms &&
            commsGraph.netNodes.map((node) => {
              const speakersOnNet = commsGraph.memberLinks.filter((entry) => entry.netId === node.id && entry.speaking && !entry.muted).length;
              const mutedOnNet = commsGraph.memberLinks.filter((entry) => entry.netId === node.id && entry.muted).length;
              return (
                <CircleMarker
                  key={`net-node-${node.id}`}
                  center={node.position}
                  radius={Math.max(7, Math.min(14, 6 + node.participants))}
                  pathOptions={{
                    color: node.color,
                    fillColor: node.color,
                    fillOpacity: 0.28,
                    weight: speakersOnNet > 0 ? 3 : 2,
                    opacity: speakersOnNet > 0 ? 1 : 0.75,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold text-white">{node.label}</div>
                    <div className="text-[10px] text-zinc-300 uppercase">{node.netType}</div>
                    <div className="text-[10px] text-zinc-300">Participants: {node.participants}</div>
                    <div className="text-[10px] text-zinc-400">Live speakers: {speakersOnNet} | Muted: {mutedOnNet}</div>
                    <div className="text-[10px] text-zinc-500">Traffic score: {node.trafficScore}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {layerVisibility.comms &&
            commsGraph.calloutNodes.map((callout) => {
              const color = COMMS_PRIORITY_COLORS[callout.priority] || COMMS_PRIORITY_COLORS.STANDARD;
              const radius = callout.priority === 'CRITICAL' ? 8 : callout.priority === 'HIGH' ? 7 : 6;
              return (
                <CircleMarker
                  key={`callout-node-${callout.id}`}
                  center={callout.position}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.4,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-xs font-semibold inline-flex items-center gap-1" style={{ color }}>
                      <AlertTriangle className="w-3 h-3" />
                      {callout.priority}
                    </div>
                    <div className="text-[10px] text-zinc-300">{callout.message || 'Priority callout'}</div>
                    <div className="text-[10px] text-zinc-500">{formatRelativeTime(callout.createdDate)}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {(activeTool === 'route' || activeTool === 'zone') && draftPoints.length > 0 && (
            activeTool === 'route' ? (
              <Polyline positions={routePreview} pathOptions={{ color: '#38bdf8', dashArray: '4 6' }} />
            ) : (
              <Polygon positions={routePreview} pathOptions={{ color: '#a855f7', dashArray: '4 6', fillOpacity: 0.1 }} />
            )
          )}
        </MapContainer>
      </div>

      <Dialog open={!!markerDraft} onOpenChange={(open) => !open && setMarkerDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Marker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={markerForm.label}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Marker label"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={markerForm.type}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {MARKER_TYPES.filter((t) => !['route', 'zone'].includes(t.id)).map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
              <Input
                value={markerForm.color}
                onChange={(e) => setMarkerForm((prev) => ({ ...prev, color: e.target.value }))}
                placeholder="#f97316"
              />
            </div>
            <Textarea
              value={markerForm.description}
              onChange={(e) => setMarkerForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkerDraft(null)}>Cancel</Button>
            <Button onClick={() => createMarker(markerForm, markerDraft)} disabled={creating}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportDraft} onOpenChange={(open) => !open && setReportDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              value={reportForm.status}
              onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              {Object.keys(STATUS_COLORS).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Input
              value={reportForm.role}
              onChange={(e) => setReportForm((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="Role (Pilot, Medic, etc.)"
            />
            <Textarea
              value={reportForm.notes}
              onChange={(e) => setReportForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
            {reportDraft && (
              <div className="text-[11px] text-zinc-500">
                Coordinates: {reportDraft.lat.toFixed(2)}, {reportDraft.lng.toFixed(2)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDraft(null)}>Cancel</Button>
            <Button onClick={submitReport} disabled={creating || !member?.id}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
