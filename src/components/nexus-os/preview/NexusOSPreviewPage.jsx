import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  BRIDGE_DEFAULT_PRESET,
  getBridgeThemeCssVars,
  CommsNetworkConsole,
  CqbCommandConsole,
  buildDevControlSignals,
  buildDevLocationEstimates,
  DEV_CQB_ROSTER,
  FittingForceDesignFocusApp,
  MobileArCompanionFocusApp,
  OperationFocusApp,
  ReportsFocusApp,
  NexusBadge,
  TacticalMapFocusApp,
  getNexusCssVars,
  NexusBootOverlay,
  NexusCommandDeck,
  NexusTaskbar,
  useNexusBackgroundPerformance,
  useNexusAppLifecycle,
  useNexusBootStateMachine,
  useNexusTrayNotifications,
  useNexusWorkspaceSession,
  useReducedMotion,
} from '../ui';
import CommsHub from '../ui/comms/CommsHub';
import VoiceCommsRail from '../ui/comms/VoiceCommsRail';
import TacticalSidePanel from '../ui/panels/TacticalSidePanel';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { getActiveChannelId } from '../services/channelContextService';
import { listStoredCqbEvents, storeCqbEvent, subscribeCqbEvents } from '../services/cqbEventService';
import { computeControlZones } from '../services/controlZoneService';
import { getFocusOperationId, listOperationsForUser, subscribeOperations } from '../services/operationService';
import { runNexusRegistryValidatorsDevOnly } from '../validators';
import {
  AlertTriangle,
  ClipboardList,
  Clock3,
  Compass,
  Crosshair,
  FileText,
  Radio,
  Radar,
  Search,
  Shield,
  Signal,
  Smartphone,
  Wrench,
} from 'lucide-react';
import '../ui/theme/nexus-shell.css';

const FOCUS_APP_CATALOG = [
  { id: 'cqb', label: 'Action', hotkey: 'Alt+1' },
  { id: 'comms', label: 'Comms', hotkey: 'Alt+2' },
  { id: 'map', label: 'Map', hotkey: 'Alt+3' },
  { id: 'mobile', label: 'Mobile', hotkey: 'Alt+4' },
  { id: 'ops', label: 'Ops', hotkey: 'Alt+5' },
  { id: 'force', label: 'Force', hotkey: 'Alt+6' },
  { id: 'reports', label: 'Reports', hotkey: 'Alt+7' },
];

const FOCUS_APP_IDS = new Set(FOCUS_APP_CATALOG.map((entry) => entry.id));
const FOCUS_APP_LABEL_BY_ID = Object.fromEntries(FOCUS_APP_CATALOG.map((entry) => [entry.id, entry.label]));
const FOCUS_APP_ICON_BY_ID = {
  cqb: Crosshair,
  comms: Radio,
  map: Compass,
  mobile: Smartphone,
  ops: ClipboardList,
  force: Wrench,
  reports: FileText,
};
const MOBILE_NAV_APP_IDS = ['cqb', 'comms', 'map', 'ops'];

function FocusShell({ mode, sharedPanelProps, forceDesignOpId, reportsOpId, onClose, reducedMotion }) {
  const [mountedModes, setMountedModes] = useState(() => mode ? { [mode]: true } : { cqb: true });

  useEffect(() => {
    if (!mode) return;
    setMountedModes((prev) => (prev[mode] ? prev : { ...prev, [mode]: true }));
  }, [mode]);

  const activeMode = mode || 'cqb';
  const modeComponent = {
    map: <TacticalMapFocusApp {...sharedPanelProps} onClose={onClose} />,
    mobile: <MobileArCompanionFocusApp {...sharedPanelProps} onClose={onClose} />,
    comms: <CommsNetworkConsole {...sharedPanelProps} onClose={onClose} />,
    ops: <OperationFocusApp {...sharedPanelProps} onClose={onClose} />,
    force: <FittingForceDesignFocusApp {...sharedPanelProps} initialOpId={forceDesignOpId} onClose={onClose} />,
    reports: <ReportsFocusApp {...sharedPanelProps} initialOpId={reportsOpId} onClose={onClose} />,
    cqb: <CqbCommandConsole {...sharedPanelProps} onClose={onClose} />,
  };

  return (
    <div className="h-full min-h-0 relative overflow-hidden">
      {Object.entries(modeComponent).map(([candidateMode, component]) => {
        if (!mountedModes[candidateMode]) return null;
        const active = candidateMode === activeMode;
        return (
          <div
            key={candidateMode}
            className="absolute inset-0 min-h-0"
            style={{
              opacity: active ? 1 : 0,
              pointerEvents: active ? 'auto' : 'none',
              transform: reducedMotion ? 'none' : active ? 'translateY(0px) scale(1)' : 'translateY(10px) scale(0.996)',
              transition: reducedMotion ? 'opacity 90ms linear' : 'opacity 220ms cubic-bezier(0.18, 0.67, 0.25, 1), transform 220ms cubic-bezier(0.18, 0.67, 0.25, 1)',
            }}
          >
            {component}
          </div>
        );
      })}
    </div>
  );
}

export default function NexusOSPreviewPage({ mode = 'dev' }) {
  const { user } = useAuth();
  const voiceNet = useVoiceNet();
  const vars = getNexusCssVars();
  const isWorkspaceMode = mode === 'workspace';
  const workspaceActorId = user?.member_profile_id || user?.id || 'workspace-operator';
  const workspaceDisplayCallsign = user?.member_profile_data?.display_callsign || user?.member_profile_data?.callsign || user?.callsign || 'Operator';
  const sessionScopeKey = `${isWorkspaceMode ? 'workspace-canvas-v2' : 'dev'}:${workspaceActorId || 'anon'}`;
  
  const { snapshot: osSession, hydrated, patchSnapshot } = useNexusWorkspaceSession(sessionScopeKey, {
    bridgeId: 'OPS',
    presetId: BRIDGE_DEFAULT_PRESET.OPS,
    variantId: 'CQB-01',
    opId: '',
    elementFilter: 'ALL',
    actorId: isWorkspaceMode ? workspaceActorId : DEV_CQB_ROSTER[0]?.id || 'ce-warden',
    focusMode: null,
    forceDesignOpId: '',
    reportsOpId: '',
    activePanelIds: [],
    workspaceOnboardingCompleted: true,
  });

  const bridgeId = osSession.bridgeId;
  const bridgeThemeVars = useMemo(() => getBridgeThemeCssVars(bridgeId), [bridgeId]);
  const presetId = osSession.presetId;
  const variantId = osSession.variantId;
  const opId = osSession.opId;
  const elementFilter = osSession.elementFilter;
  const actorId = osSession.actorId;
  const focusMode = osSession.focusMode;
  const forceDesignOpId = osSession.forceDesignOpId;
  const reportsOpId = osSession.reportsOpId;

  const [commandDeckOpen, setCommandDeckOpen] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());

  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 320;
    const stored = localStorage.getItem('nexus.leftPanelWidth');
    return stored ? parseInt(stored, 10) : 320;
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 320;
    const stored = localStorage.getItem('nexus.rightPanelWidth');
    return stored ? parseInt(stored, 10) : 320;
  });
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const [events, setEvents] = useState(() => listStoredCqbEvents({ includeStale: true }));
  const [opsVersion, setOpsVersion] = useState(0);
  
  const [metricHistory, setMetricHistory] = useState({
    Channels: Array.from({ length: 20 }, () => ({ value: 8 + Math.random() * 2 - 1 })),
    Unread: Array.from({ length: 20 }, () => ({ value: 4 + Math.random() * 3 - 1.5 })),
    Ping: Array.from({ length: 20 }, () => ({ value: 24 + Math.random() * 10 - 5 })),
    Nets: Array.from({ length: 20 }, () => ({ value: 3 + Math.random() * 0.5 - 0.25 })),
    Users: Array.from({ length: 20 }, () => ({ value: 12 + Math.random() * 4 - 2 })),
    Quality: Array.from({ length: 20 }, () => ({ value: 98 + Math.random() * 2 - 1 })),
  });

  const lifecycle = useNexusAppLifecycle(FOCUS_APP_CATALOG.map((entry) => entry.id));
  const reducedMotion = useReducedMotion();
  const [bootSessionUpdatedAt, setBootSessionUpdatedAt] = useState(null);
  const tray = useNexusTrayNotifications({ maxItems: 40 });

  const backgroundPerformance = useNexusBackgroundPerformance({
    entries: lifecycle.entries,
    enabled: import.meta.env.DEV,
    sampleLimit: 24,
    slowThresholdMs: reducedMotion ? 24 : 18,
  });
  const { profileSync } = backgroundPerformance;

  const bootState = useNexusBootStateMachine({
    enabled: true,
    hydrated,
    reducedMotion,
    lastSessionUpdatedAt: bootSessionUpdatedAt,
  });

  const setBridgeId = (nextBridgeId) => patchSnapshot({ bridgeId: nextBridgeId });
  const setPresetId = (nextPresetId) => patchSnapshot({ presetId: nextPresetId });
  const setForceDesignOpId = (nextOpId) => patchSnapshot({ forceDesignOpId: nextOpId });
  const setReportsOpId = (nextOpId) => patchSnapshot({ reportsOpId: nextOpId });

  const openFocusApp = (appId) => {
    if (!FOCUS_APP_IDS.has(appId)) return;
    const label = FOCUS_APP_LABEL_BY_ID[appId] || String(appId || '').toUpperCase();
    profileSync('focus.open', appId, () => {
      patchSnapshot({ focusMode: appId });
      lifecycle.markForeground(appId);
    });
    tray.pushNotification({
      title: `Opened ${label}`,
      detail: 'Focus app moved to foreground.',
      source: 'taskbar',
      level: 'info',
    });
  };

  const closeFocusApp = () => {
    if (focusMode && FOCUS_APP_IDS.has(focusMode)) {
      lifecycle.markBackground(focusMode);
    }
    patchSnapshot({ focusMode: null });
  };

  const suspendFocusApp = (appId = focusMode) => {
    if (!appId || !FOCUS_APP_IDS.has(appId)) return;
    lifecycle.markSuspended(appId);
    if (focusMode === appId) patchSnapshot({ focusMode: null });
  };

  useEffect(() => {
    runNexusRegistryValidatorsDevOnly();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCqbEvents((_event, allEvents) => setEvents(allEvents));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || bootSessionUpdatedAt !== null) return;
    setBootSessionUpdatedAt(osSession.updatedAt || null);
  }, [hydrated, bootSessionUpdatedAt, osSession.updatedAt]);

  useEffect(() => {
    const unsubscribe = subscribeOperations(() => setOpsVersion((prev) => prev + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!focusMode || !FOCUS_APP_IDS.has(focusMode)) return;
    lifecycle.markForeground(focusMode);
  }, [focusMode]);

  useEffect(() => {
    if (focusMode || lifecycle.foregroundAppId) return;
    lifecycle.markForeground('cqb');
  }, [focusMode, lifecycle.foregroundAppId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      const isCmd = event.ctrlKey || event.metaKey;
      if (isCmd && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCommandDeckOpen((prev) => !prev);
        return;
      }

      if (event.altKey && /^[1-7]$/.test(event.key)) {
        event.preventDefault();
        const index = Number(event.key) - 1;
        const appId = FOCUS_APP_CATALOG[index]?.id;
        if (appId) openFocusApp(appId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  const createMacroEvent = (eventType, payload = {}) => {
    const inferredChannelId = getActiveChannelId({ variantId });
    const channelIdFromPayload = typeof payload.channelId === 'string' ? payload.channelId : '';
    const channelId = channelIdFromPayload || inferredChannelId || undefined;
    const nextPayload = { ...payload };
    delete nextPayload.channelId;

    storeCqbEvent({
      variantId,
      opId: opId.trim() || undefined,
      authorId: actorId,
      eventType,
      channelId,
      confidence: 0.9,
      payload: nextPayload,
    });
  };

  const operations = useMemo(() => listOperationsForUser({ userId: actorId, includeArchived: false }), [actorId, opsVersion]);
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);
  const resolvedOpId = opId.trim() || focusOperationId || undefined;

  const activeRoster = useMemo(() => {
    if (!isWorkspaceMode) return DEV_CQB_ROSTER;

    const participantIds = new Set([workspaceActorId]);
    for (const event of events) {
      if (event.authorId) participantIds.add(event.authorId);
    }

    return [...participantIds].filter(Boolean).map((id) => ({
      id,
      callsign: id === workspaceActorId ? workspaceDisplayCallsign : id,
      element: id === workspaceActorId ? 'CE' : 'GCE',
      role: id === workspaceActorId ? 'Operator' : 'Roster TBD',
    }));
  }, [isWorkspaceMode, events, workspaceActorId, workspaceDisplayCallsign]);

  const locationEstimates = useMemo(
    () => isWorkspaceMode ? [] : buildDevLocationEstimates({ events, roster: activeRoster, opId: resolvedOpId }),
    [isWorkspaceMode, events, activeRoster, resolvedOpId]
  );

  const controlSignals = useMemo(
    () => isWorkspaceMode ? [] : buildDevControlSignals({ events, roster: activeRoster, opId: resolvedOpId, locationEstimates }),
    [isWorkspaceMode, events, activeRoster, resolvedOpId, locationEstimates]
  );
  
  const controlZones = useMemo(() => computeControlZones(controlSignals, Date.now()), [controlSignals]);

  const sharedPanelProps = {
    variantId,
    bridgeId,
    opId: resolvedOpId,
    elementFilter,
    roster: activeRoster,
    actorId,
    events,
    locationEstimates,
    controlSignals,
    controlZones,
    operations,
    focusOperationId,
    onCreateMacroEvent: createMacroEvent,
    onOpenCqbConsole: () => openFocusApp('cqb'),
    onOpenCommsNetwork: () => openFocusApp('comms'),
    onOpenMapFocus: () => openFocusApp('map'),
    onOpenMobileCompanion: () => openFocusApp('mobile'),
    onOpenOperationFocus: () => openFocusApp('ops'),
    onOpenForceDesign: (nextOpId) => {
      if (nextOpId) setForceDesignOpId(nextOpId);
      openFocusApp('force');
    },
    onOpenReports: (nextOpId) => {
      if (nextOpId) setReportsOpId(nextOpId);
      openFocusApp('reports');
    },
  };

  const workbenchFocusMode = focusMode || lifecycle.foregroundAppId || 'cqb';

  const fallbackVoiceNets = useMemo(() => {
    const opNets = operations.slice(0, 6).map((operation) => {
      const fallbackCode = String(operation.id || '').replace(/^op[_-]?/i, '').slice(0, 8).toUpperCase();
      const displayCode = String(operation.name || fallbackCode || 'OP')
        .replace(/[^A-Za-z0-9]+/g, '')
        .toUpperCase()
        .slice(0, 8);
      return {
        id: `net:${operation.id}`,
        code: displayCode || fallbackCode || 'OP',
        label: `${operation.status} · ${operation.name || 'Operation'}`,
      };
    });
    return [{ id: 'net:command', code: 'COMMAND', label: `${bridgeId} Command Net` }, ...opNets];
  }, [operations, bridgeId]);

  const fallbackActiveVoiceNetId = useMemo(() => {
    if (!fallbackVoiceNets.length) return '';
    const focusScoped = focusOperationId ? `net:${focusOperationId}` : '';
    return fallbackVoiceNets.some((entry) => entry.id === focusScoped) ? focusScoped : fallbackVoiceNets[0].id;
  }, [fallbackVoiceNets, focusOperationId]);

  const fallbackVoiceParticipants = useMemo(() => {
    const actorFirst = [...activeRoster].sort((a, b) => {
      if (a.id === actorId) return -1;
      if (b.id === actorId) return 1;
      return String(a.callsign || a.id).localeCompare(String(b.callsign || b.id));
    });
    return actorFirst.map((entry, index) => ({
      id: entry.id,
      callsign: entry.callsign || entry.id,
      element: entry.element || 'GCE',
      state: index < 5 ? 'READY' : 'MONITOR',
    }));
  }, [activeRoster, actorId]);

  const effectiveVoiceNets = useMemo(
    () => (Array.isArray(voiceNet.voiceNets) && voiceNet.voiceNets.length > 0 ? voiceNet.voiceNets : fallbackVoiceNets),
    [voiceNet.voiceNets, fallbackVoiceNets]
  );

  const activeVoiceNetId = useMemo(() => {
    const liveId = String(voiceNet.activeNetId || voiceNet.transmitNetId || '').trim();
    if (liveId) return liveId;
    return fallbackActiveVoiceNetId;
  }, [voiceNet.activeNetId, voiceNet.transmitNetId, fallbackActiveVoiceNetId]);

  const effectiveVoiceParticipants = useMemo(
    () => (Array.isArray(voiceNet.participants) && voiceNet.participants.length > 0 ? voiceNet.participants : fallbackVoiceParticipants),
    [voiceNet.participants, fallbackVoiceParticipants]
  );

  const voiceRuntimeUser = useMemo(() => {
    const profile = user?.member_profile_data || {};
    const id = profile.id || user?.member_profile_id || user?.id || actorId || workspaceActorId || '';
    if (!id) return null;
    const roles = Array.isArray(profile.roles)
      ? profile.roles
      : Array.isArray(user?.roles)
        ? user.roles
        : [];
    return {
      ...profile,
      id,
      callsign: profile.callsign || user?.callsign || workspaceDisplayCallsign || 'Operator',
      rank: profile.rank || user?.rank || '',
      roles,
      membership: profile.membership || profile.tier || 'MEMBER',
    };
  }, [user, actorId, workspaceActorId, workspaceDisplayCallsign]);

  const activeDisciplineMode = useMemo(() => {
    const currentNetId = String(voiceNet.transmitNetId || voiceNet.activeNetId || '').trim();
    if (!currentNetId) return 'PTT';
    return voiceNet.disciplineModeByNet?.[currentNetId] || 'PTT';
  }, [voiceNet.transmitNetId, voiceNet.activeNetId, voiceNet.disciplineModeByNet]);

  const withVoiceUser = useCallback(
    () => {
      if (voiceRuntimeUser?.id) return voiceRuntimeUser;
      setCommandFeedback('Voice identity unavailable.');
      return null;
    },
    [voiceRuntimeUser]
  );

  const joinVoiceNet = useCallback(
    async (netId, monitorOnly = false) => {
      if (!netId) return;
      const runtimeUser = withVoiceUser();
      if (!runtimeUser) return;
      try {
        const response = monitorOnly
          ? await (voiceNet.monitorNet?.(netId, runtimeUser) || voiceNet.joinNet?.(netId, runtimeUser, { monitorOnly: true }))
          : await voiceNet.joinNet?.(netId, runtimeUser);
        if (response?.requiresConfirmation) {
          setCommandFeedback('Focused net confirmation requested.');
          return;
        }
        if (!response?.success) {
          setCommandFeedback(response?.error || 'Voice join failed.');
          return;
        }
        setCommandFeedback(monitorOnly ? `Monitoring ${netId}` : `Joined ${netId}`);
      } catch (error) {
        setCommandFeedback(error?.message || 'Voice join failed.');
      }
    },
    [voiceNet, withVoiceUser]
  );

  const setTransmitVoiceNet = useCallback(
    async (netId) => {
      if (!netId) return;
      const runtimeUser = withVoiceUser();
      if (!runtimeUser) return;
      try {
        const response = await voiceNet.setTransmitNet?.(netId, runtimeUser);
        if (response?.success === false) {
          setCommandFeedback(response?.error || 'Unable to set transmit net.');
          return;
        }
        setCommandFeedback(`Transmit lane set: ${netId}`);
      } catch (error) {
        setCommandFeedback(error?.message || 'Unable to set transmit net.');
      }
    },
    [voiceNet, withVoiceUser]
  );

  const leaveVoiceNet = useCallback(
    async (netId) => {
      try {
        await voiceNet.leaveNet?.(netId);
        setCommandFeedback(netId ? `Left ${netId}` : 'Disconnected from voice nets.');
      } catch (error) {
        setCommandFeedback(error?.message || 'Unable to leave voice net.');
      }
    },
    [voiceNet]
  );

  const setVoiceDiscipline = useCallback(
    async (mode) => {
      try {
        const response = await voiceNet.setDisciplineMode?.(mode);
        if (response?.success === false) {
          setCommandFeedback('Unable to change voice discipline.');
          return;
        }
        setCommandFeedback(`Voice discipline: ${mode}`);
      } catch (error) {
        setCommandFeedback(error?.message || 'Unable to change voice discipline.');
      }
    },
    [voiceNet]
  );

  const requestVoiceTransmit = useCallback(
    async () => {
      try {
        const response = await voiceNet.requestToSpeak?.({ reason: 'NexusOS panel request' });
        if (response?.success === false) {
          setCommandFeedback('Request-to-speak denied.');
          return;
        }
        setCommandFeedback('Request-to-speak submitted.');
      } catch (error) {
        setCommandFeedback(error?.message || 'Request-to-speak failed.');
      }
    },
    [voiceNet]
  );

  const panelLogEntries = useMemo(() => {
    const levelForEvent = (eventTypeRaw) => {
      const eventType = String(eventTypeRaw || '').toUpperCase();
      if (eventType.includes('ERROR') || eventType.includes('ABORT')) return 'error';
      if (eventType.includes('WARN') || eventType.includes('HOLD') || eventType.includes('DEGRADE')) return 'warning';
      if (eventType.includes('ACK') || eventType.includes('COMPLETE') || eventType.includes('CONFIRM')) return 'success';
      return 'info';
    };

    const operationLogs = operations.slice(0, 6).map((operation) => ({
      timestamp: Date.parse(operation.updatedAt || operation.createdAt || '') || clockNowMs,
      level: operation.status === 'ACTIVE' ? 'success' : operation.status === 'WRAPPING' ? 'warning' : 'info',
      message: `${operation.name || 'Operation'} · ${operation.status}`,
    }));

    const eventLogs = events.slice(-18).map((event) => ({
      timestamp: Date.parse(event.createdAt || '') || clockNowMs,
      level: levelForEvent(event.eventType),
      message: `${String(event.eventType || 'EVENT').replace(/_/g, ' ')} · ${event.authorId || 'unknown'}`,
    }));

    const connectionLog = {
      timestamp: clockNowMs,
      level: online ? 'success' : 'warning',
      message: online ? `${bridgeId} uplink stable` : `${bridgeId} uplink degraded`,
    };

    return [connectionLog, ...eventLogs, ...operationLogs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 28);
  }, [events, operations, online, bridgeId, clockNowMs]);

  const leftPanelMetrics = useMemo(() => {
    const recentUnread = events.filter((event) => {
      const ageMs = clockNowMs - (Date.parse(event.createdAt || '') || 0);
      return ageMs <= 10 * 60 * 1000 && event.authorId !== actorId;
    }).length;
    const channelCount = 6 + Math.min(6, operations.length);
    const pingMs = online ? Math.max(18, 20 + Math.min(65, Math.round(events.length / 2))) : 0;
    return [
      { label: 'Channels', value: String(channelCount) },
      { label: 'Unread', value: String(recentUnread) },
      { label: 'Ping', value: online ? `${pingMs}ms` : '--' },
    ];
  }, [operations.length, events, clockNowMs, actorId, online]);

  const rightPanelMetrics = useMemo(() => {
    const qualityPct = online ? Math.max(74, 100 - Math.min(24, Math.round(events.length / 3))) : 0;
    return [
      { label: 'Nets', value: String(effectiveVoiceNets.length) },
      { label: 'Users', value: String(effectiveVoiceParticipants.length) },
      { label: 'Quality', value: online ? `${qualityPct}%` : '--' },
    ];
  }, [effectiveVoiceNets.length, effectiveVoiceParticipants.length, online, events.length]);

  const runNexusCommand = (rawCommand) => {
    const input = String(rawCommand || '').trim();
    if (!input) return 'No command provided.';
    const [command, ...rest] = input.split(/\s+/);
    const keyword = command.toLowerCase();
    const arg = rest.join(' ').trim();

    if (keyword === 'open') {
      const appId = FOCUS_APP_IDS.has(arg) ? arg : null;
      if (!appId) return `Unknown app "${arg}".`;
      openFocusApp(appId);
      return `Opened ${FOCUS_APP_LABEL_BY_ID[appId] || appId.toUpperCase()}.`;
    }

    if (keyword === 'bridge') {
      const nextBridge = arg.toUpperCase();
      if (!BRIDGE_DEFAULT_PRESET[nextBridge]) return `Unknown bridge "${arg}".`;
      setBridgeId(nextBridge);
      setPresetId(BRIDGE_DEFAULT_PRESET[nextBridge] || presetId);
      return `Bridge switched to ${nextBridge}.`;
    }

    if (keyword === 'close') {
      closeFocusApp();
      return 'Focus app returned to standby.';
    }

    return `Unknown command "${input}".`;
  };

  const pulseCount = events.filter((event) => Date.now() - new Date(event.createdAt).getTime() <= 20000).length;

  useEffect(() => {
    if (!commandFeedback) return undefined;
    const timerId = window.setTimeout(() => setCommandFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [commandFeedback]);

  useEffect(() => {
    const timerId = window.setInterval(() => setClockNowMs(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetricHistory((prev) => {
        const updated = {};
        Object.keys(prev).forEach((key) => {
          const history = [...prev[key]];
          const lastValue = history[history.length - 1]?.value || 0;
          const newValue = lastValue + (Math.random() * 2 - 1);
          history.push({ value: Math.max(0, newValue) });
          if (history.length > 20) history.shift();
          updated[key] = history;
        });
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nexus.leftPanelWidth', String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nexus.rightPanelWidth', String(rightPanelWidth));
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!isResizingLeft) return;
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(280, Math.min(600, e.clientX));
      setLeftPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => setIsResizingLeft(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft]);

  useEffect(() => {
    if (!isResizingRight) return;
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(280, Math.min(600, window.innerWidth - e.clientX));
      setRightPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => setIsResizingRight(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight]);

  const systemTimeLabel = useMemo(
    () => new Date(clockNowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [clockNowMs]
  );

  return (
    <div
      className="nexus-shell-root nexus-layout-quiet nx-app-shell fixed inset-0 flex flex-col"
      data-bridge-id={bridgeId}
      style={{ ...vars, ...bridgeThemeVars, backgroundColor: 'var(--nx-shell-bg)' }}
    >
      <div className="nexus-shell-sweep" />
      <div className="nexus-shell-grid" />
      <div className="nexus-shell-vignette" />

      <header className="nx-shell-topbar nexus-top-rail nexus-panel-glow flex-shrink-0">
        <div className="nx-topbar-left">
          <div className="nx-topbar-mark">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="nx-topbar-kicker">Redscar Nomads Command Intranet</div>
            <h1 className="nx-topbar-title">{isWorkspaceMode ? 'NexusOS Tactical Workspace' : 'NexusOS Gameplay Sandbox'}</h1>
          </div>
        </div>
        <button
          type="button"
          className="nx-command-entry"
          onClick={() => setCommandDeckOpen(true)}
          title="Open command palette (Ctrl+Shift+P)"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Command Palette</span>
          <span className="nx-hotkey">Ctrl+Shift+P</span>
        </button>
        <div className="nx-topbar-right">
          {isWorkspaceMode ? <NexusBadge tone="active">WORKSPACE</NexusBadge> : <NexusBadge tone="warning">DEV</NexusBadge>}
          <NexusBadge tone={online ? 'ok' : 'danger'}>
            <Signal className="w-3 h-3 mr-1" />
            {online ? 'LINK' : 'DEGRADED'}
          </NexusBadge>
          <NexusBadge tone={tray.unreadCount > 0 ? 'warning' : 'neutral'}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            {tray.unreadCount > 0 ? `${tray.unreadCount} ALERTS` : 'CLEAR'}
          </NexusBadge>
          <NexusBadge tone="neutral">{workspaceDisplayCallsign}</NexusBadge>
          <div className="nx-topbar-time">
            <Clock3 className="w-3.5 h-3.5" />
            <span>{systemTimeLabel}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <TacticalSidePanel
          side="left"
          width={leftPanelWidth}
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          onResize={() => setIsResizingLeft(true)}
          isResizing={isResizingLeft}
          title="Text Comms"
          icon={Radio}
          statusMetrics={leftPanelMetrics}
          metricHistory={metricHistory}
          logEntries={panelLogEntries}
          onMaximize={() => setLeftPanelWidth(600)}
          onMinimize={() => setLeftPanelWidth(280)}
        >
          <CommsHub
            operations={operations}
            focusOperationId={focusOperationId}
            activeAppId="comms"
            online={online}
            bridgeId={bridgeId}
            isExpanded={!leftPanelCollapsed}
            onToggleExpand={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          />
        </TacticalSidePanel>

        <main className="flex-1 overflow-hidden flex flex-col px-3">
          {commandFeedback && (
            <section aria-live="polite" className="nx-inline-feedback nexus-console-text">
              {commandFeedback}
            </section>
          )}
          <div className="flex-1 overflow-hidden nx-workbench-wrap nexus-panel-glow">
            <FocusShell
              mode={workbenchFocusMode}
              sharedPanelProps={sharedPanelProps}
              forceDesignOpId={forceDesignOpId}
              reportsOpId={reportsOpId}
              onClose={closeFocusApp}
              reducedMotion={reducedMotion}
            />
          </div>
        </main>

        <TacticalSidePanel
          side="right"
          width={rightPanelWidth}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          onResize={() => setIsResizingRight(true)}
          isResizing={isResizingRight}
          title="Voice Comms"
          icon={Signal}
          statusMetrics={rightPanelMetrics}
          metricHistory={metricHistory}
          logEntries={panelLogEntries}
          onMaximize={() => setRightPanelWidth(600)}
          onMinimize={() => setRightPanelWidth(280)}
        >
          <VoiceCommsRail
            voiceNets={effectiveVoiceNets}
            activeNetId={activeVoiceNetId}
            transmitNetId={voiceNet.transmitNetId || activeVoiceNetId}
            monitoredNetIds={voiceNet.monitoredNetIds || []}
            participants={effectiveVoiceParticipants}
            connectionState={voiceNet.connectionState || 'IDLE'}
            micEnabled={voiceNet.micEnabled !== false}
            pttActive={Boolean(voiceNet.pttActive)}
            disciplineMode={activeDisciplineMode}
            onJoinNet={(netId) => joinVoiceNet(netId, false)}
            onMonitorNet={(netId) => joinVoiceNet(netId, true)}
            onSetTransmitNet={setTransmitVoiceNet}
            onLeaveNet={leaveVoiceNet}
            onSetMicEnabled={(enabled) => voiceNet.setMicEnabled?.(enabled)}
            onStartPTT={() => voiceNet.startPTT?.()}
            onStopPTT={() => voiceNet.stopPTT?.()}
            onSetDisciplineMode={setVoiceDiscipline}
            onRequestToSpeak={requestVoiceTransmit}
            isExpanded={!rightPanelCollapsed}
            onToggleExpand={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          />
        </TacticalSidePanel>
      </div>

      <footer className="nx-shell-bottom flex-shrink-0">
        <NexusTaskbar
          bridgeId={bridgeId}
          activeAppId={workbenchFocusMode}
          appEntries={lifecycle.entries}
          appCatalog={FOCUS_APP_CATALOG}
          online={online}
          eventPulseCount={pulseCount}
          notifications={tray.notifications}
          unreadNotifications={tray.unreadCount}
          onActivateApp={openFocusApp}
          onSuspendApp={suspendFocusApp}
          onOpenCommandDeck={() => setCommandDeckOpen(true)}
          onMarkNotificationRead={tray.markNotificationRead}
          onMarkAllNotificationsRead={tray.markAllNotificationsRead}
          onClearNotifications={tray.clearNotifications}
        />
        <nav className="nx-mobile-nav">
          {MOBILE_NAV_APP_IDS.map((appId) => {
            const entry = FOCUS_APP_CATALOG.find((candidate) => candidate.id === appId);
            if (!entry) return null;
            const Icon = FOCUS_APP_ICON_BY_ID[entry.id] || Radar;
            const active = workbenchFocusMode === appId;
            return (
              <button
                key={`mobile:${entry.id}`}
                type="button"
                className={`nx-mobile-nav-button ${active ? 'is-active' : ''}`}
                onClick={() => openFocusApp(entry.id)}
                aria-label={entry.label}
              >
                <Icon className="w-4 h-4" />
                <span>{entry.label}</span>
              </button>
            );
          })}
          <button type="button" className="nx-mobile-nav-button" onClick={() => setCommandDeckOpen(true)}>
            <Search className="w-4 h-4" />
            <span>More</span>
          </button>
        </nav>
      </footer>

      <NexusCommandDeck
        open={commandDeckOpen}
        onClose={() => setCommandDeckOpen(false)}
        onRunCommand={(command) => {
          const result = runNexusCommand(command);
          setCommandFeedback(result);
          return result;
        }}
      />

      <NexusBootOverlay
        visible={bootState.visible}
        mode={bootState.mode}
        phaseLabel={bootState.label}
        progress={bootState.progress}
      />
    </div>
  );
}
