import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  BridgeSwitcher,
  BRIDGE_DEFAULT_PRESET,
  getBridgeThemeCssVars,
  CommandFocus,
  CommsNetworkConsole,
  CommsPeekPanel,
  CqbCommandConsole,
  CqbContextSelector,
  CqbFeedPanel,
  CqbMacroPad,
  buildDevControlSignals,
  buildDevLocationEstimates,
  DEV_CQB_ROSTER,
  FittingForceDesignFocusApp,
  MobileArCompanionFocusApp,
  MobileCompanionPanel,
  OperationFocusApp,
  OpsStrip,
  ReportsFocusApp,
  NexusBadge,
  NexusButton,
  RustPulseIndicator,
  TacticalMapFocusApp,
  TacticalMapPanel,
  TeamTilesCqbMode,
  WorkbenchGrid,
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
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
import { getActiveChannelId } from '../services/channelContextService';
import { getCqbEventDiagnostics, listStoredCqbEvents, storeCqbEvent, subscribeCqbEvents } from '../services/cqbEventService';
import { computeControlZones } from '../services/controlZoneService';
import { getIntelObjectTTLState, listAllIntelObjectsForDev } from '../services/intelService';
import { listDrafts } from '../services/intentDraftService';
import { listPriceObservations } from '../services/marketIntelService';
import { getFocusOperationId, listOperationsForUser, subscribeOperations } from '../services/operationService';
import { subscribeOperationEnhancements } from '../services/operationEnhancementService';
import { listComments } from '../services/opThreadService';
import { listAssumptions } from '../services/planningService';
import { listReports } from '../services/reportService';
import { listShipSpecs } from '../services/referenceDataService';
import { listFitProfiles } from '../services/fitProfileService';
import { runNexusOSInvariantChecks, summarizeInvariantWarnings } from '../diagnostics';
import { runNexusRegistryValidatorsDevOnly } from '../validators';
import { Radar, Shield, Signal, Swords, UserRound } from 'lucide-react';
import {
  formatGameplayLoopVariantId,
  isGameplayLoopVariantToken,
  normalizeGameplayLoopVariantId,
} from '../ui/cqb/gameplayLoopLanguage';
import '../ui/theme/nexus-shell.css';

function normalizeElementTag(raw) {
  const normalized = String(raw || '')
    .trim()
    .toUpperCase();
  if (normalized === 'CE' || normalized === 'GCE' || normalized === 'ACE') return normalized;
  return null;
}

function SystemHealthPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">
        <span className="text-xs text-zinc-400">Shell Integrity</span>
        <NexusBadge tone="ok">Stable</NexusBadge>
      </div>
      <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">
        <span className="text-xs text-zinc-400">Truth Substrate</span>
        <RustPulseIndicator active={false} label="Idle" />
      </div>
      <div className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900/60 px-3 py-2">
        <span className="text-xs text-zinc-400">Gameplay Event Stream</span>
        <RustPulseIndicator active label="Listening" />
      </div>
    </div>
  );
}

function CqbConsoleLauncherPanel({
  onOpenCqbConsole,
  bridgeId,
  onOpenCommsNetwork,
  onOpenMapFocus,
  onOpenMobileCompanion,
  onOpenOperationFocus,
  onOpenForceDesign,
  onOpenReports,
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Bridge: <span className="text-zinc-200 font-semibold">{bridgeId}</span>
      </p>
      <p className="text-sm text-zinc-300 leading-relaxed">
        Open Action Command Focus for large team tiles, macro control, and feed monitoring. Open Comms Network for live channel topology and Tactical Map for fading spatial claims.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <NexusButton size="sm" intent="primary" onClick={onOpenCqbConsole}>
          Open Action Console
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onOpenCommsNetwork}>
          Open Comms Network
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onOpenMapFocus}>
          Open Tactical Map
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onOpenMobileCompanion?.()}>
          Open Mobile AR
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onOpenOperationFocus}>
          Open Ops Focus
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onOpenForceDesign?.()}>
          Open Force Design
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onOpenReports?.()}>
          Open Reports
        </NexusButton>
      </div>
      <p className="text-[11px] text-zinc-500">No fake telemetry: graph pulses only from recent gameplay events.</p>
    </div>
  );
}

function focusModeFromBridge(bridgeId) {
  return bridgeId === 'COMMAND' ? 'comms' : 'cqb';
}

function gameplayPulseSummary(events) {
  const now = Date.now();
  return events.filter((event) => now - new Date(event.createdAt).getTime() <= 20000).length;
}

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
const FOCUS_APP_ALIASES = {
  action: 'cqb',
  gameplay: 'cqb',
  loop: 'cqb',
};
const HIGH_PRIORITY_GAMEPLAY_EVENTS = new Set(['CEASE_FIRE', 'CHECK_FIRE', 'WEAPON_DRY', 'SELF_CHECK', 'CLEAR_COMMS']);

function resolveFocusAppId(input) {
  const token = String(input || '').trim().toLowerCase();
  if (!token) return null;
  if (FOCUS_APP_IDS.has(token)) return token;
  const aliasMatch = FOCUS_APP_ALIASES[token];
  return aliasMatch && FOCUS_APP_IDS.has(aliasMatch) ? aliasMatch : null;
}

function toEventLabel(eventType) {
  return String(eventType || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function notificationLevelForLeadAlertSeverity(severity) {
  if (severity === 'CRITICAL') return 'critical';
  if (severity === 'HIGH') return 'warning';
  if (severity === 'MED') return 'info';
  return 'success';
}

function FocusShell({ mode, sharedPanelProps, forceDesignOpId, reportsOpId, onClose, reducedMotion }) {
  const [mountedModes, setMountedModes] = useState(() =>
    mode ? { [mode]: true } : { cqb: true }
  );

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
              transition: reducedMotion
                ? 'opacity 90ms linear'
                : 'opacity 220ms cubic-bezier(0.18, 0.67, 0.25, 1), transform 220ms cubic-bezier(0.18, 0.67, 0.25, 1)',
            }}
          >
            {component}
          </div>
        );
      })}
    </div>
  );
}

function DiagnosticsPanel({ events, variantId, operations, focusOperationId, controlZones }) {
  const pulses = gameplayPulseSummary(events);
  const eventDiagnostics = getCqbEventDiagnostics(60000);
  const intelObjects = listAllIntelObjectsForDev();
  const drafts = listDrafts();
  const reports = listReports();
  const marketObservations = listPriceObservations({ includeStale: true });
  const fitProfiles = listFitProfiles();
  const opComments = (operations || []).flatMap((operation) => listComments(operation.id));
  const assumptions = (operations || []).flatMap((operation) => listAssumptions(operation.id));
  const referenceSpecs = listShipSpecs();
  const warnings = runNexusOSInvariantChecks({
    ttl: {
      intelObjects,
      controlZones,
      marketObservations,
      assumptions,
    },
    provenance: {
      referenceRecords: referenceSpecs,
      marketObservations,
    },
    scoping: {
      events,
      intelObjects,
      comments: opComments,
    },
    noGlobalChat: {
      opComments,
      intelComments: [],
    },
    focus: {
      operations,
      focusOperationId,
    },
  });
  const summary = summarizeInvariantWarnings(warnings);
  const staleIntelCount = intelObjects.filter((entry) => getIntelObjectTTLState(entry).stale).length;
  const staleMarketCount = marketObservations.filter((entry) => entry.stale).length;
  const patchMismatchCount = fitProfiles.reduce(
    (count, profile) => count + (profile.validation?.patchMismatchWarnings?.length || 0),
    0
  );
  const diagnosticsState = resolveAvailabilityState({
    count: warnings.length === 0 ? 1 : warnings.length,
    hasConflict: summary.criticalCount > 0,
    staleCount: warnings.length > 0 ? warnings.length - summary.criticalCount : 0,
  });

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1">
        <span className="text-zinc-400">Variant</span>
        <span className="text-zinc-200">{formatGameplayLoopVariantId(variantId)}</span>
      </div>
      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1">
        <span className="text-zinc-400">Gameplay pulses (20s)</span>
        <span className="text-zinc-200">{pulses}</span>
      </div>
      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1">
        <span className="text-zinc-400">Invariant state</span>
        <NexusBadge tone={availabilityTone(diagnosticsState)}>{availabilityLabel(diagnosticsState)}</NexusBadge>
      </div>
      <div className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[11px] text-zinc-500">
        {availabilityCopy(diagnosticsState, summary.criticalCount > 0 ? 'Critical invariant violations detected.' : undefined)}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Ops</div>
          <div className="text-zinc-200">{operations?.length || 0}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Intel</div>
          <div className="text-zinc-200">{intelObjects.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Zones</div>
          <div className="text-zinc-200">{controlZones.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Drafts</div>
          <div className="text-zinc-200">{drafts.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Reports</div>
          <div className="text-zinc-200">{reports.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
          <div className="text-zinc-500">Patch mismatch</div>
          <div className="text-zinc-200">{patchMismatchCount}</div>
        </div>
      </div>
      <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-[11px] text-zinc-400 space-y-0.5">
        <div>Stale intel: {staleIntelCount}</div>
        <div>Stale market observations: {staleMarketCount}</div>
        <div>Unscoped gameplay %: {eventDiagnostics.unscopedPercent}</div>
        <div>
          Top brevity:{' '}
          {eventDiagnostics.mostUsedBrevityMacros[0]
            ? `${eventDiagnostics.mostUsedBrevityMacros[0].eventType} (${eventDiagnostics.mostUsedBrevityMacros[0].count})`
            : 'none'}
        </div>
      </div>
      {warnings.length > 0 ? (
        <div className="space-y-1 max-h-28 overflow-auto pr-1">
          {warnings.slice(0, 6).map((warning) => (
            <div key={`${warning.code}:${warning.message}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[10px]">
              <div className="text-zinc-300">
                {warning.severity.toUpperCase()} {warning.code}
              </div>
              <div className="text-zinc-500">{warning.message}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function NexusOSPreviewPage({ mode = 'dev' }) {
  const { user } = useAuth();
  const vars = getNexusCssVars();
  const isWorkspaceMode = mode === 'workspace';
  const workspaceActorId = user?.member_profile_id || user?.id || 'workspace-operator';
  const workspaceDisplayCallsign =
    user?.member_profile_data?.display_callsign ||
    user?.member_profile_data?.callsign ||
    user?.callsign ||
    'Operator';
  const sessionScopeKey = `${isWorkspaceMode ? 'workspace' : 'dev'}:${workspaceActorId || 'anon'}`;
  const { snapshot: osSession, hydrated, patchSnapshot, reset: resetSession } = useNexusWorkspaceSession(sessionScopeKey, {
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
    workspaceOnboardingCompleted: !isWorkspaceMode,
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
  const activePanelIds = osSession.activePanelIds || [];
  const workspaceOnboardingCompleted = Boolean(osSession.workspaceOnboardingCompleted);
  const needsWorkspaceOnboarding = Boolean(isWorkspaceMode && !workspaceOnboardingCompleted);

  const [commandDeckOpen, setCommandDeckOpen] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  const [events, setEvents] = useState(() => listStoredCqbEvents({ includeStale: true }));
  const [opsVersion, setOpsVersion] = useState(0);

  const lifecycle = useNexusAppLifecycle(FOCUS_APP_CATALOG.map((entry) => entry.id));
  const reducedMotion = useReducedMotion();
  const [bootSessionUpdatedAt, setBootSessionUpdatedAt] = useState(null);
  const previousOnlineRef = useRef(online);
  const lastNotifiedEventIdRef = useRef(null);
  const seenLeadAlertNotificationKeysRef = useRef(new Set());
  const leadAlertNotificationOrderRef = useRef([]);
  const tray = useNexusTrayNotifications({ maxItems: 40 });

  const backgroundPerformance = useNexusBackgroundPerformance({
    entries: lifecycle.entries,
    enabled: import.meta.env.DEV,
    sampleLimit: 24,
    slowThresholdMs: reducedMotion ? 24 : 18,
    onSlowSample: (sample) => {
      if (!import.meta.env.DEV) return;
      console.info('[NexusOS][Perf][SlowSample]', sample);
      tray.pushNotification({
        title: 'UI workload spike',
        detail: `${sample.label} · ${sample.durationMs}ms · ${sample.state}`,
        source: 'profiler',
        level: 'warning',
      });
    },
  });
  const { getThrottleMs, shouldRunWork, profileSync, recentSamples } = backgroundPerformance;

  const bootState = useNexusBootStateMachine({
    enabled: true,
    hydrated,
    reducedMotion,
    lastSessionUpdatedAt: bootSessionUpdatedAt,
  });

  const setBridgeId = (nextBridgeId) => patchSnapshot({ bridgeId: nextBridgeId });
  const setPresetId = (nextPresetId) => patchSnapshot({ presetId: nextPresetId });
  const setVariantId = (nextVariantId) => patchSnapshot({ variantId: normalizeGameplayLoopVariantId(nextVariantId) || 'CQB-01' });
  const setOpId = (nextOpId) => patchSnapshot({ opId: nextOpId });
  const setElementFilter = (nextFilter) => patchSnapshot({ elementFilter: nextFilter });
  const setActorId = (nextActorId) => patchSnapshot({ actorId: nextActorId });
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
    const label = FOCUS_APP_LABEL_BY_ID[appId] || String(appId || '').toUpperCase();
    lifecycle.markSuspended(appId);
    if (focusMode === appId) patchSnapshot({ focusMode: null });
    tray.pushNotification({
      title: `${label} suspended`,
      detail: 'Background throttling is now active for this app.',
      source: 'scheduler',
      level: 'info',
    });
  };

  useEffect(() => {
    runNexusRegistryValidatorsDevOnly();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCqbEvents((_event, allEvents) => {
      setEvents(allEvents);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || bootSessionUpdatedAt !== null) return;
    setBootSessionUpdatedAt(osSession.updatedAt || null);
  }, [hydrated, bootSessionUpdatedAt, osSession.updatedAt]);

  useEffect(() => {
    const unsubscribe = subscribeOperations(() => {
      setOpsVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    seenLeadAlertNotificationKeysRef.current = new Set();
    leadAlertNotificationOrderRef.current = [];
  }, [actorId]);

  useEffect(() => {
    const unsubscribe = subscribeOperationEnhancements((state) => {
      const relevantAlerts = (state.alerts || [])
        .filter((alert) => (alert.notifiedUserIds || []).includes(actorId))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const alert of relevantAlerts) {
        const alertKey = `${actorId}:${alert.id}:${alert.createdAt}`;
        if (seenLeadAlertNotificationKeysRef.current.has(alertKey)) continue;

        tray.pushNotification({
          id: `lead_alert_notice:${alertKey}`,
          title: alert.title,
          detail: alert.summary,
          source: `operation:${alert.opId}`,
          level: notificationLevelForLeadAlertSeverity(alert.severity),
        });

        seenLeadAlertNotificationKeysRef.current.add(alertKey);
        leadAlertNotificationOrderRef.current.push(alertKey);
      }

      while (leadAlertNotificationOrderRef.current.length > 120) {
        const removed = leadAlertNotificationOrderRef.current.shift();
        if (!removed) break;
        seenLeadAlertNotificationKeysRef.current.delete(removed);
      }
    });
    return unsubscribe;
  }, [actorId, tray.pushNotification]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    let cancelled = false;
    let timerId = 0;

    const runTick = () => {
      if (cancelled) return;
      const activeAppId = focusMode || lifecycle.foregroundAppId || 'cqb';

      if (shouldRunWork(activeAppId)) {
        profileSync('diagnostics.gameplay.window', activeAppId, () => {
          const diagnostics = getCqbEventDiagnostics(60000);
          console.info('[NexusOS][Gameplay][Diagnostics]', diagnostics);
        });
      }

      const nextDelayMs = getThrottleMs(activeAppId, 60000);
      timerId = window.setTimeout(runTick, nextDelayMs);
    };

    runTick();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    focusMode,
    lifecycle.foregroundAppId,
    getThrottleMs,
    profileSync,
    shouldRunWork,
  ]);

  useEffect(() => {
    if (previousOnlineRef.current === online) return;

    tray.pushNotification({
      title: online ? 'Network link restored' : 'Network link degraded',
      detail: online
        ? 'Taskbar services and sync resumed.'
        : 'Operating in degraded mode until link restores.',
      source: 'network',
      level: online ? 'success' : 'warning',
    });
    previousOnlineRef.current = online;
  }, [online]);

  useEffect(() => {
    if (!events.length) return;
    const newestEventId = events[0]?.id;
    const previousEventId = lastNotifiedEventIdRef.current;

    if (!previousEventId) {
      lastNotifiedEventIdRef.current = newestEventId;
      return;
    }

    if (previousEventId === newestEventId) return;

    const freshEvents = [];
    for (const event of events) {
      if (event.id === previousEventId) break;
      freshEvents.push(event);
      if (freshEvents.length >= 6) break;
    }

    freshEvents.reverse().forEach((event) => {
      if (!HIGH_PRIORITY_GAMEPLAY_EVENTS.has(event.eventType)) return;
      tray.pushNotification({
        title: `${toEventLabel(event.eventType)} · ${event.authorId}`,
        detail: event.channelId ? `Channel ${event.channelId}` : 'Unscoped gameplay event',
        source: 'events',
        level: event.eventType === 'CEASE_FIRE' || event.eventType === 'CHECK_FIRE' ? 'critical' : 'warning',
      });
    });

    lastNotifiedEventIdRef.current = newestEventId;
  }, [events]);

  useEffect(() => {
    if (!isWorkspaceMode) return;
    if (actorId === workspaceActorId) return;
    patchSnapshot({ actorId: workspaceActorId });
  }, [isWorkspaceMode, workspaceActorId, actorId]);

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
    const onKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const isCmd = event.ctrlKey || event.metaKey;
      if (isCmd && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCommandDeckOpen((prev) => !prev);
        return;
      }

      if (isCmd && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        suspendFocusApp();
        setCommandFeedback('Foreground app suspended.');
        return;
      }

      if (event.altKey && /^[1-7]$/.test(event.key)) {
        event.preventDefault();
        const index = Number(event.key) - 1;
        const appId = FOCUS_APP_CATALOG[index]?.id;
        if (appId) {
          openFocusApp(appId);
          setCommandFeedback(`Opened ${FOCUS_APP_LABEL_BY_ID[appId] || String(appId).toUpperCase()} app.`);
        }
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

  const operations = useMemo(
    () => listOperationsForUser({ userId: actorId, includeArchived: false }),
    [actorId, opsVersion]
  );
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);
  const resolvedOpId = opId.trim() || focusOperationId || undefined;

  const activeRoster = useMemo(() => {
    if (!isWorkspaceMode) return DEV_CQB_ROSTER;

    const latestByAuthor = new Map();
    for (const event of events) {
      if (!latestByAuthor.has(event.authorId)) {
        latestByAuthor.set(event.authorId, event);
      }
    }

    const participantIds = new Set([workspaceActorId]);
    for (const event of events) {
      if (event.authorId) participantIds.add(event.authorId);
    }

    return [...participantIds]
      .filter(Boolean)
      .map((id) => {
        const latest = latestByAuthor.get(id);
        const eventElement =
          normalizeElementTag(latest?.payload?.elementTag) ||
          normalizeElementTag(latest?.payload?.element) ||
          normalizeElementTag(latest?.payload?.authorElement);

        const isSelf = id === workspaceActorId;
        return {
          id,
          callsign: isSelf ? workspaceDisplayCallsign : String(latest?.payload?.callsign || id),
          element: eventElement || (isSelf ? 'CE' : 'GCE'),
          role: isSelf ? 'Operator' : 'Roster TBD',
        };
      });
  }, [isWorkspaceMode, events, workspaceActorId, workspaceDisplayCallsign]);

  const locationEstimates = useMemo(
    () =>
      isWorkspaceMode
        ? []
        : buildDevLocationEstimates({
            events,
            roster: activeRoster,
            opId: resolvedOpId,
          }),
    [isWorkspaceMode, events, activeRoster, resolvedOpId]
  );

  const controlSignals = useMemo(
    () =>
      isWorkspaceMode
        ? []
        : buildDevControlSignals({
            events,
            roster: activeRoster,
            opId: resolvedOpId,
            locationEstimates,
          }),
    [isWorkspaceMode, events, activeRoster, resolvedOpId, locationEstimates]
  );
  const controlZones = useMemo(() => computeControlZones(controlSignals, Date.now()), [controlSignals]);

  const sharedPanelProps = {
    variantId,
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

  const panelDescriptors = useMemo(() => {
    if (bridgeId === 'OPS') {
      return [
        {
          id: 'panel-loop-teamtiles',
          title: 'TeamTiles Loop Mode',
          component: TeamTilesCqbMode,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 2 },
          defaultSizeByPreset: {
            COMMAND_LEFT: { colSpan: 2, rowSpan: 2 },
          },
        },
        {
          id: 'panel-loop-feed',
          title: 'Loop Feed',
          component: CqbFeedPanel,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 2 },
        },
        {
          id: 'panel-loop-macropad',
          title: 'Gameplay MacroPad',
          component: CqbMacroPad,
          status: formatGameplayLoopVariantId(variantId),
          statusTone: 'warning',
          live: false,
          defaultSize: { colSpan: 1, rowSpan: 2 },
        },
        {
          id: 'panel-tactical-map',
          title: 'Tactical Map',
          component: TacticalMapPanel,
          status: 'MVP',
          statusTone: 'warning',
          live: true,
          defaultSize: { colSpan: 2, rowSpan: 2 },
          defaultSizeByPreset: {
            COMMAND_LEFT: { colSpan: 3, rowSpan: 2 },
          },
        },
        {
          id: 'panel-action-console',
          title: 'Command Focus',
          component: CqbConsoleLauncherPanel,
          status: 'Ready',
          statusTone: 'active',
          live: false,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
        {
          id: 'panel-comms-peek',
          title: 'Comms Peek',
          component: CommsPeekPanel,
          status: 'Network',
          statusTone: 'active',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
        {
          id: 'panel-mobile-companion',
          title: 'Mobile Companion',
          component: MobileCompanionPanel,
          status: 'PWA/AR',
          statusTone: 'warning',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
        {
          id: 'panel-system-health',
          title: 'System Health',
          component: SystemHealthPanel,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
      ];
    }

    if (bridgeId === 'COMMAND') {
      const commandPanels = [
        {
          id: 'panel-comms-peek',
          title: 'Comms Peek',
          component: CommsPeekPanel,
          status: 'Network',
          statusTone: 'active',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 2 },
          defaultSizeByPreset: {
            COMMAND_LEFT: { colSpan: 2, rowSpan: 2 },
          },
        },
        {
          id: 'panel-command-focus',
          title: 'Command Focus',
          component: CqbConsoleLauncherPanel,
          status: 'Ready',
          statusTone: 'active',
          live: false,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
        {
          id: 'panel-tactical-map',
          title: 'Tactical Map',
          component: TacticalMapPanel,
          status: 'MVP',
          statusTone: 'warning',
          live: true,
          defaultSize: { colSpan: 2, rowSpan: 2 },
          defaultSizeByPreset: {
            COMMAND_LEFT: { colSpan: 2, rowSpan: 2 },
          },
        },
        {
          id: 'panel-mobile-companion',
          title: 'Mobile Companion',
          component: MobileCompanionPanel,
          status: 'PWA/AR',
          statusTone: 'warning',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
      ];

      if (!isWorkspaceMode) {
        commandPanels.push({
          id: 'panel-diagnostics',
          title: 'Diagnostics',
          component: DiagnosticsPanel,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        });
      }

      return commandPanels;
    }

    return [
      {
        id: 'panel-command-focus',
        title: 'Command Focus',
        component: CqbConsoleLauncherPanel,
        status: 'Ready',
        statusTone: 'active',
        live: false,
        defaultSize: { colSpan: 1, rowSpan: 1 },
      },
      {
        id: 'panel-system-health',
        title: 'System Health',
        component: SystemHealthPanel,
        status: 'Live',
        statusTone: 'ok',
        live: true,
        defaultSize: { colSpan: 1, rowSpan: 1 },
      },
      {
        id: 'panel-diagnostics',
        title: 'Diagnostics',
        component: DiagnosticsPanel,
        status: 'Live',
        statusTone: 'ok',
        live: true,
        defaultSize: { colSpan: 1, rowSpan: 1 },
      },
    ];
  }, [bridgeId, variantId, isWorkspaceMode]);

  const handleBridgeSwitch = (nextBridgeId) => {
    setBridgeId(nextBridgeId);
    setPresetId(BRIDGE_DEFAULT_PRESET[nextBridgeId] || presetId);
    if (focusMode === 'cqb' || focusMode === 'comms' || focusMode === 'map') {
      openFocusApp(focusModeFromBridge(nextBridgeId));
    }
  };

  const runNexusCommand = (rawCommand) => {
    const input = String(rawCommand || '').trim();
    if (!input) return 'No command provided.';
    const [command, ...rest] = input.split(/\s+/);
    const keyword = command.toLowerCase();
    const arg = rest.join(' ').trim();

    if (keyword === 'help') {
      return 'Commands: open <app>, bridge <id>, preset <id>, variant <loop-id>, op <id>, close, suspend, reset-session.';
    }

    if (keyword === 'open') {
      const appId = resolveFocusAppId(arg);
      if (!appId) return `Unknown app "${arg}".`;
      openFocusApp(appId);
      return `Opened ${FOCUS_APP_LABEL_BY_ID[appId] || appId.toUpperCase()}.`;
    }

    if (keyword === 'bridge') {
      const nextBridge = arg.toUpperCase();
      if (!BRIDGE_DEFAULT_PRESET[nextBridge]) return `Unknown bridge "${arg}".`;
      handleBridgeSwitch(nextBridge);
      return `Bridge switched to ${nextBridge}.`;
    }

    if (keyword === 'preset') {
      const nextPreset = arg.toUpperCase();
      if (!['GRID_2X2', 'GRID_3_COLUMN', 'COMMAND_LEFT', 'OPERATIONS_HUB', 'WIDE_MESH'].includes(nextPreset)) {
        return `Unknown preset "${arg}".`;
      }
      setPresetId(nextPreset);
      return `Preset switched to ${nextPreset}.`;
    }

    if (keyword === 'variant') {
      if (!isGameplayLoopVariantToken(arg)) return 'Variant format: LOOP-01..LOOP-08.';
      const normalizedVariantId = normalizeGameplayLoopVariantId(arg) || 'CQB-01';
      setVariantId(normalizedVariantId);
      return `Variant set to ${formatGameplayLoopVariantId(normalizedVariantId)}.`;
    }

    if (keyword === 'op') {
      setOpId(arg);
      return arg ? `Active operation context set: ${arg}.` : 'Operation context cleared.';
    }

    if (keyword === 'close') {
      closeFocusApp();
      return 'Focus overlay closed.';
    }

    if (keyword === 'suspend') {
      suspendFocusApp();
      return 'Foreground app suspended.';
    }

    if (keyword === 'reset-session') {
      resetSession();
      closeFocusApp();
      return 'Workspace session reset to defaults.';
    }

    return `Unknown command "${input}".`;
  };

  const pulseCount = gameplayPulseSummary(events);
  const activeAppId = focusMode || lifecycle.foregroundAppId || 'none';
  const activeAppLabel = activeAppId === 'none' ? 'none' : FOCUS_APP_LABEL_BY_ID[activeAppId] || activeAppId;
  const activeLifecycleState = activeAppId !== 'none' ? lifecycle.entries?.[activeAppId]?.state || 'foreground' : 'idle';
  const focusedOperation = operations.find((operation) => operation.id === focusOperationId);
  const focusOperationLabel = focusedOperation?.name || (focusOperationId ? focusOperationId : 'No focused operation');
  const operationalPostureLabel = online ? 'Care-First Active' : 'Rescue Priority';

  useEffect(() => {
    if (!commandFeedback) return undefined;
    const timerId = window.setTimeout(() => {
      setCommandFeedback('');
    }, 4200);

    return () => window.clearTimeout(timerId);
  }, [commandFeedback]);

  return (
    <div
      className="nexus-shell-root relative w-full h-full min-h-0 overflow-hidden p-3 md:p-4 flex flex-col gap-3"
      data-bridge-id={bridgeId}
      style={{ ...vars, ...bridgeThemeVars, backgroundColor: 'var(--nx-shell-bg)' }}
    >
      <div className="nexus-shell-sweep" />
      <div className="nexus-shell-grid" />
      <div className="nexus-shell-vignette" />

      <section className="nexus-top-rail nexus-panel-glow rounded-xl px-4 py-3 md:px-5 md:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] nexus-console-text"
              style={{ color: 'rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)), 0.9)' }}
            >
              <Shield
                className="w-3.5 h-3.5"
                style={{ color: 'rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)), 0.9)' }}
              />
              Redscar Nomads Command Intranet
            </div>
            <h1 className="mt-1 text-lg md:text-2xl font-semibold uppercase text-zinc-100 truncate">
              {isWorkspaceMode ? 'NexusOS Tactical Workspace' : 'NexusOS Gameplay Sandbox'}
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl">
              Mission-scoped command surface with TTL-bound intelligence, degraded mode continuity, and narrative-first operational context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isWorkspaceMode ? <NexusBadge tone="active">WORKSPACE</NexusBadge> : <NexusBadge tone="warning">DEV ONLY</NexusBadge>}
            <span className={`nexus-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${online ? '' : 'nexus-chip-critical'}`}>
              <Signal className="w-3 h-3" />
              {online ? 'Network Nominal' : 'Network Degraded'}
            </span>
            <span className="nexus-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">
              <Radar className="w-3 h-3" />
              Pulse {pulseCount}
            </span>
            <span className={`nexus-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${online ? '' : 'nexus-chip-critical'}`}>
              {operationalPostureLabel}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-5 gap-2 text-[11px] nexus-console-text">
          <div className="nexus-surface px-2.5 py-1.5">
            <span className="text-zinc-500 uppercase tracking-widest">Operator</span>{' '}
            <span className="text-zinc-200">{workspaceDisplayCallsign}</span>
          </div>
          <div className="nexus-surface px-2.5 py-1.5">
            <span className="text-zinc-500 uppercase tracking-widest">Bridge</span>{' '}
            <span className="text-zinc-200">{bridgeId}</span>
          </div>
          <div className="nexus-surface px-2.5 py-1.5 truncate">
            <span className="text-zinc-500 uppercase tracking-widest">Focus Op</span>{' '}
            <span className="text-zinc-200">{focusOperationLabel}</span>
          </div>
          <div className="nexus-surface px-2.5 py-1.5">
            <span className="text-zinc-500 uppercase tracking-widest">Foreground</span>{' '}
            <span className="text-zinc-200">{activeAppLabel}</span>
          </div>
          <div className="nexus-surface px-2.5 py-1.5">
            <span className="text-zinc-500 uppercase tracking-widest">Scheduler</span>{' '}
            <span className="text-zinc-200">{activeLifecycleState}</span>
          </div>
        </div>
      </section>

      {!isWorkspaceMode ? (
        <div className="nexus-surface p-1.5">
          <CqbContextSelector
            variantId={variantId}
            onVariantIdChange={setVariantId}
            opId={opId}
            onOpIdChange={setOpId}
            elementFilter={elementFilter}
            onElementFilterChange={setElementFilter}
            actorId={actorId}
            onActorIdChange={setActorId}
            roster={activeRoster}
          />
        </div>
      ) : null}

      <div className="nexus-surface p-1.5">
        <OpsStrip actorId={actorId} onOpenOperationFocus={() => openFocusApp('ops')} />
      </div>

      <div className="nexus-surface p-1.5">
        <BridgeSwitcher activeBridgeId={bridgeId} onSwitch={handleBridgeSwitch} />
      </div>

      <section className="nexus-surface px-3 py-2 flex items-center justify-between gap-2 text-xs nexus-console-text">
        <div className="text-zinc-400 truncate">
          Session <span className="text-zinc-200">{sessionScopeKey}</span>
          {' · '}
          Boot <span className="text-zinc-200">{bootState.visible ? bootState.phase : 'ready'}</span>
          {' · '}
          Reduced Motion <span className="text-zinc-200">{reducedMotion ? 'on' : 'off'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NexusBadge tone="active">
            <UserRound className="w-3 h-3 mr-1" />
            {workspaceDisplayCallsign}
          </NexusBadge>
          <NexusBadge tone={recentSamples.length > 0 ? 'warning' : 'neutral'}>
            PERF {recentSamples.length}
          </NexusBadge>
          <NexusBadge tone={focusedOperation ? 'ok' : 'warning'}>
            <Swords className="w-3 h-3 mr-1" />
            {focusedOperation ? 'Operation Linked' : 'No Linked Op'}
          </NexusBadge>
          <div className="hidden xl:flex items-center gap-1.5">
            <span className="nexus-hotkey">Ctrl+Shift+P Deck</span>
            <span className="nexus-hotkey">Ctrl+Shift+S Suspend</span>
          </div>
        </div>
      </section>

      {commandFeedback ? (
        <section aria-live="polite" className="nexus-surface px-3 py-1.5 text-xs text-zinc-300 nexus-console-text">{commandFeedback}</section>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden nexus-panel-glow rounded-xl">
        <WorkbenchGrid
          bridgeId={bridgeId}
          panels={panelDescriptors}
          presetId={presetId}
          onPresetChange={setPresetId}
          defaultActivationMode={needsWorkspaceOnboarding ? 'empty' : 'all'}
          enableOnboardingExperience={needsWorkspaceOnboarding}
          workspaceUserDisplayName={workspaceDisplayCallsign}
          onCompleteOnboarding={() => {
            if (!needsWorkspaceOnboarding) return;
            patchSnapshot({ workspaceOnboardingCompleted: true });
          }}
          layoutPersistenceScopeKey={`${sessionScopeKey}:workbench:${bridgeId}`}
          enableLayoutPersistence
          initialActivePanelIds={activePanelIds}
          onActivePanelIdsChange={(next) =>
            patchSnapshot({
              activePanelIds: next,
              workspaceOnboardingCompleted: workspaceOnboardingCompleted || next.length > 0,
            })
          }
          panelComponentProps={sharedPanelProps}
        />
      </div>

      <NexusTaskbar
        bridgeId={bridgeId}
        activeAppId={focusMode || lifecycle.foregroundAppId}
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

      <CommandFocus
        open={Boolean(focusMode)}
        onClose={closeFocusApp}
        FocusApp={() => (
          <FocusShell
            mode={focusMode}
            sharedPanelProps={sharedPanelProps}
            forceDesignOpId={forceDesignOpId}
            reportsOpId={reportsOpId}
            onClose={closeFocusApp}
            reducedMotion={reducedMotion}
          />
        )}
      />

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
