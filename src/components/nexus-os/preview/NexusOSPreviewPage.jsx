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
  useReducedMotion } from
'../ui';
import NexusSettingsPanel from '../ui/os/NexusSettingsPanel';
import CommsHub from '../ui/comms/CommsHub';
import VoiceCommsRail from '../ui/comms/VoiceCommsRail';
import TacticalSidePanel from '../ui/panels/TacticalSidePanel';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import useNexusSidePanelRuntime from './useNexusSidePanelRuntime';
import { getActiveChannelId } from '../services/channelContextService';
import { listStoredCqbEvents, storeCqbEvent, subscribeCqbEvents } from '../services/cqbEventService';
import { computeControlZones } from '../services/controlZoneService';
import { getFocusOperationId, listOperationsForUser, subscribeOperations } from '../services/operationService';
import { runNexusRegistryValidatorsDevOnly } from '../validators';
import {
  ClipboardList,
  Clock3,
  Compass,
  Radio,
  Radar,
  Search,
  Settings,
  Shield,
  Signal } from
'lucide-react';
import '../ui/theme/nexus-shell.css';

const FOCUS_APP_CATALOG = [
{ id: 'map', label: 'Map', hotkey: 'Alt+1' },
{ id: 'ops', label: 'Ops', hotkey: 'Alt+2' },
{ id: 'comms', label: 'Comms', hotkey: 'Alt+3' }];


const FOCUS_APP_IDS = new Set(FOCUS_APP_CATALOG.map((entry) => entry.id));
const FOCUS_APP_LABEL_BY_ID = Object.fromEntries(FOCUS_APP_CATALOG.map((entry) => [entry.id, entry.label]));
const FOCUS_APP_ICON_BY_ID = {
  map: Compass,
  ops: ClipboardList,
  comms: Radio
};
const FOCUS_APP_ALIASES = {
  map: 'map',
  maps: 'map',
  tactical: 'map',
  ops: 'ops',
  op: 'ops',
  operation: 'ops',
  operations: 'ops',
  comms: 'comms',
  comm: 'comms',
  communications: 'comms',
  voice: 'comms'
};
const MOBILE_NAV_APP_IDS = ['map', 'ops', 'comms'];

function FocusShell({ mode, sharedPanelProps, onClose, reducedMotion }) {
  const [mountedModes, setMountedModes] = useState(() => mode ? { [mode]: true } : { map: true });

  useEffect(() => {
    if (!mode) return;
    setMountedModes((prev) => prev[mode] ? prev : { ...prev, [mode]: true });
  }, [mode]);

  const activeMode = mode || 'map';
  const modeComponent = {
    map: <TacticalMapFocusApp {...sharedPanelProps} onClose={onClose} />,
    comms: <CommsNetworkConsole {...sharedPanelProps} onClose={onClose} />,
    ops: <OperationFocusApp {...sharedPanelProps} onClose={onClose} />
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
              transition: reducedMotion ? 'opacity 90ms linear' : 'opacity 220ms cubic-bezier(0.18, 0.67, 0.25, 1), transform 220ms cubic-bezier(0.18, 0.67, 0.25, 1)'
            }}>

            {component}
          </div>);

      })}
    </div>);

}

export default function NexusOSPreviewPage({ mode = 'dev', forceFocusMode = '' }) {
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
    focusMode: 'comms',
    forceDesignOpId: '',
    reportsOpId: '',
    activePanelIds: [],
    workspaceOnboardingCompleted: true
  });

  const bridgeId = osSession.bridgeId;
  const bridgeThemeVars = useMemo(() => getBridgeThemeCssVars(bridgeId), [bridgeId]);
  const presetId = osSession.presetId;
  const variantId = osSession.variantId;
  const opId = osSession.opId;
  const elementFilter = osSession.elementFilter;
  const actorId = osSession.actorId;
  const focusMode = osSession.focusMode;
  const lockedFocusMode = FOCUS_APP_IDS.has(forceFocusMode) ? forceFocusMode : '';
  const forceDesignOpId = osSession.forceDesignOpId;
  const reportsOpId = osSession.reportsOpId;

  const [commandDeckOpen, setCommandDeckOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
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

  const lifecycle = useNexusAppLifecycle(FOCUS_APP_CATALOG.map((entry) => entry.id));
  const reducedMotion = useReducedMotion();
  const [bootSessionUpdatedAt, setBootSessionUpdatedAt] = useState(null);
  const tray = useNexusTrayNotifications({ maxItems: 40 });

  const backgroundPerformance = useNexusBackgroundPerformance({
    entries: lifecycle.entries,
    enabled: import.meta.env.DEV,
    sampleLimit: 24,
    slowThresholdMs: reducedMotion ? 24 : 18
  });
  const { profileSync } = backgroundPerformance;

  const bootState = useNexusBootStateMachine({
    enabled: true,
    hydrated,
    reducedMotion,
    lastSessionUpdatedAt: bootSessionUpdatedAt
  });

  const setBridgeId = (nextBridgeId) => patchSnapshot({ bridgeId: nextBridgeId });
  const setPresetId = (nextPresetId) => patchSnapshot({ presetId: nextPresetId });
  const setForceDesignOpId = (nextOpId) => patchSnapshot({ forceDesignOpId: nextOpId });
  const setReportsOpId = (nextOpId) => patchSnapshot({ reportsOpId: nextOpId });

  const openFocusApp = (appId) => {
    if (lockedFocusMode) return;
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
      level: 'info'
    });
  };

  const closeFocusApp = () => {
    if (lockedFocusMode) return;
    if (focusMode && FOCUS_APP_IDS.has(focusMode)) {
      lifecycle.markBackground(focusMode);
    }
    patchSnapshot({ focusMode: null });
  };

  const suspendFocusApp = (appId = focusMode) => {
    if (lockedFocusMode) return;
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
    if (!lockedFocusMode) return;
    if (focusMode === lockedFocusMode) return;
    patchSnapshot({ focusMode: lockedFocusMode });
  }, [lockedFocusMode, focusMode, patchSnapshot]);

  useEffect(() => {
    if (!focusMode || !FOCUS_APP_IDS.has(focusMode)) return;
    lifecycle.markForeground(focusMode);
  }, [focusMode]);

  useEffect(() => {
    if (focusMode || lifecycle.foregroundAppId) return;
    lifecycle.markForeground('comms');
  }, [focusMode, lifecycle.foregroundAppId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLElement && target.isContentEditable)
      return;

      const isCmd = event.ctrlKey || event.metaKey;
      if (isCmd && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCommandDeckOpen((prev) => !prev);
        return;
      }

      if (event.altKey && /^[1-3]$/.test(event.key)) {
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
      payload: nextPayload
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
      role: id === workspaceActorId ? 'Operator' : 'Roster TBD'
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
    onOpenCommsNetwork: () => openFocusApp('comms'),
    onOpenMapFocus: () => openFocusApp('map'),
    onOpenOperationFocus: () => openFocusApp('ops')
  };

  const workbenchFocusMode = lockedFocusMode || focusMode || lifecycle.foregroundAppId || 'map';

  const fallbackVoiceNets = useMemo(() => {
    const opNets = operations.slice(0, 6).map((operation) => {
      const fallbackCode = String(operation.id || '').replace(/^op[_-]?/i, '').slice(0, 8).toUpperCase();
      const displayCode = String(operation.name || fallbackCode || 'OP').
      replace(/[^A-Za-z0-9]+/g, '').
      toUpperCase().
      slice(0, 8);
      return {
        id: `net:${operation.id}`,
        code: displayCode || fallbackCode || 'OP',
        label: `${operation.status} · ${operation.name || 'Operation'}`
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
      state: index < 5 ? 'READY' : 'MONITOR'
    }));
  }, [activeRoster, actorId]);

  const effectiveVoiceNets = useMemo(
    () => Array.isArray(voiceNet.voiceNets) && voiceNet.voiceNets.length > 0 ? voiceNet.voiceNets : fallbackVoiceNets,
    [voiceNet.voiceNets, fallbackVoiceNets]
  );

  const activeVoiceNetId = useMemo(() => {
    const liveId = String(voiceNet.activeNetId || voiceNet.transmitNetId || '').trim();
    if (liveId) return liveId;
    return fallbackActiveVoiceNetId;
  }, [voiceNet.activeNetId, voiceNet.transmitNetId, fallbackActiveVoiceNetId]);

  const effectiveVoiceParticipants = useMemo(
    () => Array.isArray(voiceNet.participants) && voiceNet.participants.length > 0 ? voiceNet.participants : fallbackVoiceParticipants,
    [voiceNet.participants, fallbackVoiceParticipants]
  );

  const voiceRuntimeUser = useMemo(() => {
    const profile = user?.member_profile_data || {};
    const id = profile.id || user?.member_profile_id || user?.id || actorId || workspaceActorId || '';
    if (!id) return null;
    const roles = Array.isArray(profile.roles) ?
    profile.roles :
    Array.isArray(user?.roles) ?
    user.roles :
    [];
    return {
      ...profile,
      id,
      callsign: profile.callsign || user?.callsign || workspaceDisplayCallsign || 'Operator',
      rank: profile.rank || user?.rank || '',
      roles,
      membership: profile.membership || profile.tier || 'MEMBER'
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
        const response = monitorOnly ?
        await (voiceNet.monitorNet?.(netId, runtimeUser) || voiceNet.joinNet?.(netId, runtimeUser, { monitorOnly: true })) :
        await voiceNet.joinNet?.(netId, runtimeUser);
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

  const channelVoiceMap = useMemo(() => {
    const map = {};
    const findByMatch = (matcher) => effectiveVoiceNets.find((net) => matcher(String(net?.id || ''), String(net?.code || ''), String(net?.label || net?.name || ''), String(net?.event_id || net?.eventId || '')));

    const commandNet = findByMatch((id, code, label) => {
      const inspect = `${id} ${code} ${label}`.toLowerCase();
      return inspect.includes('command') || inspect.includes('-cmd');
    });
    if (commandNet?.id) map.command = commandNet.id;

    const squadNet = findByMatch((_id, code, label) => `${code} ${label}`.toLowerCase().includes('squad') || code.toLowerCase().includes('-sq'));
    if (squadNet?.id) map['alpha-squad'] = squadNet.id;

    const logisticsNet = findByMatch((_id, code, label) => `${code} ${label}`.toLowerCase().includes('logistics') || code.toLowerCase().includes('-log'));
    if (logisticsNet?.id) map.logistics = logisticsNet.id;

    operations.forEach((operation) => {
      const opId = String(operation.id || '').trim();
      if (!opId) return;
      const opNet = effectiveVoiceNets.find((net) => {
        const netId = String(net?.id || '');
        const eventId = String(net?.event_id || net?.eventId || '');
        return eventId === opId || netId === `net:${opId}`;
      });
      if (opNet?.id) map[`op-${opId}`] = opNet.id;
    });

    if (!map.command && activeVoiceNetId) map.command = activeVoiceNetId;
    return map;
  }, [effectiveVoiceNets, operations, activeVoiceNetId]);

  const routeVoiceForChannel = useCallback(
    async (channelId) => {
      const netId = channelVoiceMap[channelId];
      if (!netId) {
        setCommandFeedback('No mapped voice lane for selected text channel.');
        return;
      }
      await setTransmitVoiceNet(netId);
    },
    [channelVoiceMap, setTransmitVoiceNet]
  );

  const sidePanelRuntime = useNexusSidePanelRuntime({
    events,
    operations,
    online,
    bridgeId,
    clockNowMs,
    actorId,
    effectiveVoiceNets,
    effectiveVoiceParticipants,
    voiceNet,
    roster: activeRoster
  });

  const availableBridgeIds = useMemo(() => Object.keys(BRIDGE_DEFAULT_PRESET), []);

  const runNexusCommand = (rawCommand) => {
    const input = String(rawCommand || '').trim();
    if (!input) return 'No command provided.';
    const [command, ...rest] = input.split(/\s+/);
    const keyword = command.toLowerCase();
    const arg = rest.join(' ').trim();
    const normalizedArg = arg.toLowerCase();

    if (keyword === 'help' || keyword === '?') {
      return 'Commands: help, tutorial, status, open <map|ops|comms>, bridge <id|next|prev>, close.';
    }

    if (keyword === 'tutorial' || keyword === 'tutorials') {
      return 'Opening tutorials...';
    }

    if (keyword === 'status') {
      const focusLabel = workbenchFocusMode ? FOCUS_APP_LABEL_BY_ID[workbenchFocusMode] || workbenchFocusMode : 'Standby';
      return `Link ${online ? 'UP' : 'DOWN'} · Bridge ${bridgeId} · Focus ${focusLabel} · Alerts ${tray.unreadCount}.`;
    }

    if (keyword === 'open' || keyword === 'focus') {
      const appId = FOCUS_APP_ALIASES[normalizedArg] || (FOCUS_APP_IDS.has(normalizedArg) ? normalizedArg : null);
      if (!appId) return `Unknown app "${arg}". Use: map, ops, comms.`;
      openFocusApp(appId);
      return `Opened ${FOCUS_APP_LABEL_BY_ID[appId] || appId.toUpperCase()}.`;
    }

    if (keyword === 'bridge') {
      if (!arg) return `Bridge ${bridgeId}. Available: ${availableBridgeIds.join(', ')}.`;

      if (normalizedArg === 'next' || normalizedArg === 'prev') {
        const currentIndex = Math.max(0, availableBridgeIds.indexOf(bridgeId));
        const delta = normalizedArg === 'next' ? 1 : -1;
        const nextIndex = (currentIndex + delta + availableBridgeIds.length) % availableBridgeIds.length;
        const nextBridge = availableBridgeIds[nextIndex];
        setBridgeId(nextBridge);
        setPresetId(BRIDGE_DEFAULT_PRESET[nextBridge] || presetId);
        return `Bridge switched to ${nextBridge}.`;
      }

      const nextBridge = arg.toUpperCase();
      if (!BRIDGE_DEFAULT_PRESET[nextBridge]) return `Unknown bridge "${arg}". Available: ${availableBridgeIds.join(', ')}.`;
      setBridgeId(nextBridge);
      setPresetId(BRIDGE_DEFAULT_PRESET[nextBridge] || presetId);
      return `Bridge switched to ${nextBridge}.`;
    }

    if (keyword === 'close' || keyword === 'standby') {
      closeFocusApp();
      return 'Focus app returned to standby.';
    }

    return `Unknown command "${input}". Use "help" for supported commands.`;
  };

  const commandCatalog = useMemo(
    () => [
    { id: 'cmd-help', label: 'Help', command: 'help', detail: 'Show supported command syntax.' },
    { id: 'cmd-tutorial', label: 'Tutorials', command: 'tutorial', detail: 'Open interactive training modules.' },
    { id: 'cmd-status', label: 'System Status', command: 'status', detail: 'Report live bridge/link/focus state.' },
    { id: 'cmd-open-map', label: 'Focus Map', command: 'open map', detail: 'Bring tactical map to foreground.' },
    { id: 'cmd-open-ops', label: 'Focus Ops', command: 'open ops', detail: 'Bring operations workspace to foreground.' },
    { id: 'cmd-open-comms', label: 'Focus Comms', command: 'open comms', detail: 'Bring comms workspace to foreground.' },
    { id: 'cmd-bridge-next', label: 'Bridge Next', command: 'bridge next', detail: `Cycle bridge (current ${bridgeId}).` },
    { id: 'cmd-bridge-current', label: 'Bridge Info', command: 'bridge', detail: 'Display current and available bridge IDs.' },
    { id: 'cmd-close', label: 'Standby Focus', command: 'close', detail: 'Return focus workspace to standby.' }],

    [bridgeId]
  );

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

  const systemTimeLabel = useMemo(() => {
    const now = new Date(clockNowMs);
    const local = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const utc = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
    return `${local} · ${utc}Z`;
  }, [clockNowMs]);
  const focusStatusLabel = workbenchFocusMode ? FOCUS_APP_LABEL_BY_ID[workbenchFocusMode] || workbenchFocusMode : 'Standby';
  const alertStatusLabel = tray.unreadCount > 0 ? `${tray.unreadCount} Alerts` : 'Alerts Clear';

  const handleUpdateSetting = (key, value) => {
    console.log('[NexusOS] Setting updated:', key, value);
    setCommandFeedback(`Setting updated: ${key}`);
  };

  return (
    <div
      className="nexus-shell-root nexus-layout-quiet nx-app-shell fixed inset-0 flex flex-col"
      data-bridge-id={bridgeId}
      style={{ ...vars, ...bridgeThemeVars, backgroundColor: 'var(--nx-shell-bg)' }}>

      <div className="nexus-shell-sweep" />
      <div className="nexus-shell-grid" />
      <div className="nexus-shell-vignette" />

      <header className="nx-shell-topbar nexus-top-rail nexus-panel-glow flex-shrink-0" role="banner">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-orange-500/20 bg-orange-500/5">
            <Shield className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[10px] font-black uppercase tracking-[0.15em] text-white leading-none">
                NexusOS
              </h1>
              <div className="text-[8px] text-zinc-400 uppercase tracking-[0.2em] leading-none mt-0.5">
                Command Surface
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <div className="h-3 w-px bg-zinc-700/50" />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-700/30 bg-zinc-900/30">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-200">{workspaceDisplayCallsign}</span>
              <span className="text-[8px] text-zinc-600">•</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-300">{bridgeId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5">



            <div className="h-3 w-px bg-zinc-700/50" />
          </div>

          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <NexusBadge tone={online ? 'ok' : 'danger'} className="text-[9px] font-semibold">
              {online ? 'Link Ready' : 'Link Down'}
            </NexusBadge>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all group"
            onClick={() => setCommandDeckOpen(true)}
            title="Open command deck"
            aria-label="Open command deck (Ctrl+Shift+P)"
            aria-keyshortcuts="Control+Shift+P">

            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-400 transition-colors" />
            <span className="hidden sm:inline text-[10px] font-semibold text-zinc-200 group-hover:text-white transition-colors uppercase tracking-wide">
              Deck
            </span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/50">
              <span>⌃</span>
              <span>⇧</span>
              <span>P</span>
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div
            className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all group cursor-default"
            title="System Time: Local and UTC">

            <Clock3 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 transition-colors flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-semibold leading-none">Local</span>
                <span className="text-[10px] font-mono text-zinc-300 group-hover:text-zinc-100 transition-colors leading-none">
                  {new Date(clockNowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[8px] uppercase tracking-wider text-zinc-700 font-semibold leading-none">UTC</span>
                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors leading-none">
                  {new Date(clockNowMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' })}Z
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700/40 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all group"
            onClick={() => setSettingsPanelOpen(true)}
            title="Open settings console"
            aria-label="Open settings console">

            <Settings className="w-5 h-5 text-zinc-400 group-hover:text-orange-400 transition-colors" />
          </button>
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
          statusMetrics={sidePanelRuntime.leftPanelMetrics}
          metricHistory={sidePanelRuntime.metricHistory}
          logEntries={sidePanelRuntime.panelLogEntries}
          headerStatusLabel={sidePanelRuntime.leftPanelHeader.label}
          headerStatusTone={sidePanelRuntime.leftPanelHeader.tone}
          headerSignalValue={sidePanelRuntime.leftPanelHeader.signal}
          headerSignalTone={sidePanelRuntime.leftPanelHeader.signalTone}
          onMaximize={() => setLeftPanelWidth(600)}
          onMinimize={() => setLeftPanelWidth(280)}>

          <CommsHub
            operations={operations}
            focusOperationId={focusOperationId}
            activeAppId="comms"
            online={online}
            bridgeId={bridgeId}
            actorId={actorId}
            eventMessagesByChannel={sidePanelRuntime.eventMessagesByChannel}
            unreadByChannel={sidePanelRuntime.unreadByChannel}
            channelVoiceMap={channelVoiceMap}
            voiceState={sidePanelRuntime.voiceState}
            onRouteVoiceNet={routeVoiceForChannel}
            onIssueCommsOrder={(eventType, payload = {}) => createMacroEvent(eventType, payload)}
            focusMode={workbenchFocusMode}
            isExpanded={!leftPanelCollapsed}
            onToggleExpand={() => setLeftPanelCollapsed(!leftPanelCollapsed)} />

        </TacticalSidePanel>

        <main className="flex-1 overflow-hidden flex flex-col px-3 py-3">
          {commandFeedback &&
          <section aria-live="polite" className="nx-inline-feedback nexus-console-text mb-2">
              {commandFeedback}
            </section>
          }
          <div className="flex-1 overflow-hidden nx-workbench-wrap nexus-panel-glow rounded-lg border border-zinc-700/40">
            <FocusShell
              mode={workbenchFocusMode}
              sharedPanelProps={sharedPanelProps}
              onClose={closeFocusApp}
              reducedMotion={reducedMotion} />

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
          statusMetrics={sidePanelRuntime.rightPanelMetrics}
          metricHistory={sidePanelRuntime.metricHistory}
          logEntries={sidePanelRuntime.panelLogEntries}
          headerStatusLabel={sidePanelRuntime.rightPanelHeader.label}
          headerStatusTone={sidePanelRuntime.rightPanelHeader.tone}
          headerSignalValue={sidePanelRuntime.rightPanelHeader.signal}
          headerSignalTone={sidePanelRuntime.rightPanelHeader.signalTone}
          onMaximize={() => setRightPanelWidth(600)}
          onMinimize={() => setRightPanelWidth(280)}>

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
            focusMode={workbenchFocusMode}
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
            onToggleExpand={() => setRightPanelCollapsed(!rightPanelCollapsed)} />

        </TacticalSidePanel>
      </div>

      <footer className="nx-shell-bottom flex-shrink-0">
        <NexusTaskbar
          activeAppId={workbenchFocusMode}
          appEntries={lifecycle.entries || {}}
          appCatalog={FOCUS_APP_CATALOG}
          notifications={tray.notifications}
          unreadNotifications={tray.unreadCount}
          onActivateApp={openFocusApp}
          onSuspendApp={suspendFocusApp}
          onOpenCommandDeck={() => setCommandDeckOpen(true)}
          onMarkNotificationRead={tray.markNotificationRead}
          onMarkAllNotificationsRead={tray.markAllNotificationsRead}
          onClearNotifications={tray.clearNotifications} />

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
                aria-label={entry.label}>

                <Icon className="w-4 h-4" />
                <span>{entry.label}</span>
              </button>);

          })}
          <button type="button" className="nx-mobile-nav-button" onClick={() => setCommandDeckOpen(true)}>
            <Search className="w-4 h-4" />
            <span>Deck</span>
          </button>
        </nav>
      </footer>

      <NexusCommandDeck
        open={commandDeckOpen}
        onClose={() => setCommandDeckOpen(false)}
        commandCatalog={commandCatalog}
        contextSummary={`Bridge ${bridgeId} · Focus ${focusStatusLabel} · ${online ? 'Link up' : 'Link down'} · ${alertStatusLabel}`}
        onRunCommand={(command) => {
          const result = runNexusCommand(command);
          setCommandFeedback(result);
          return result;
        }} />

      <NexusSettingsPanel
        open={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        user={user}
        onUpdateSetting={handleUpdateSetting} />

      <NexusBootOverlay
        visible={bootState.visible}
        mode={bootState.mode}
        phaseLabel={bootState.label}
        progress={bootState.progress} />

    </div>);

}