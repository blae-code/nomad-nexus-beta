import React, { useEffect, useMemo, useState } from 'react';
import {
  BridgeSwitcher,
  BRIDGE_DEFAULT_PRESET,
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
} from '../ui';
import { getActiveChannelId } from '../services/channelContextService';
import { getCqbEventDiagnostics, listStoredCqbEvents, storeCqbEvent, subscribeCqbEvents } from '../services/cqbEventService';
import { computeControlZones } from '../services/controlZoneService';
import { getIntelObjectTTLState, listAllIntelObjectsForDev } from '../services/intelService';
import { listDrafts } from '../services/intentDraftService';
import { listPriceObservations } from '../services/marketIntelService';
import { getFocusOperationId, listOperationsForUser, subscribeOperations } from '../services/operationService';
import { listComments } from '../services/opThreadService';
import { listAssumptions } from '../services/planningService';
import { listReports } from '../services/reportService';
import { listShipSpecs } from '../services/referenceDataService';
import { listFitProfiles } from '../services/fitProfileService';
import { runNexusOSInvariantChecks, summarizeInvariantWarnings } from '../diagnostics';
import { runNexusRegistryValidatorsDevOnly } from '../validators';

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
        <span className="text-xs text-zinc-400">CQB Event Stream</span>
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
        Open CQB Command Focus for large team tiles, macro control, and feed monitoring. Open Comms Network for live channel topology and Tactical Map for fading spatial claims.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <NexusButton size="sm" intent="primary" onClick={onOpenCqbConsole}>
          Open CQB Console
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onOpenCommsNetwork}>
          Open Comms Network
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onOpenMapFocus}>
          Open Tactical Map
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
      <p className="text-[11px] text-zinc-500">No fake telemetry: graph pulses only from recent CQB events.</p>
    </div>
  );
}

function focusModeFromBridge(bridgeId) {
  return bridgeId === 'COMMAND' ? 'comms' : 'cqb';
}

function cqbpulseSummary(events) {
  const now = Date.now();
  return events.filter((event) => now - new Date(event.createdAt).getTime() <= 20000).length;
}

function FocusShell({ mode, sharedPanelProps, forceDesignOpId, reportsOpId, onClose }) {
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
              transform: active ? 'translateY(0px)' : 'translateY(4px)',
              transition: 'opacity 140ms ease, transform 140ms ease',
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
  const pulses = cqbpulseSummary(events);
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
        <span className="text-zinc-200">{variantId}</span>
      </div>
      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1">
        <span className="text-zinc-400">CQB pulses (20s)</span>
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
        <div>Unscoped CQB %: {eventDiagnostics.unscopedPercent}</div>
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
  const vars = getNexusCssVars();
  const isWorkspaceMode = mode === 'workspace';
  const [bridgeId, setBridgeId] = useState('OPS');
  const [presetId, setPresetId] = useState(BRIDGE_DEFAULT_PRESET.OPS);
  const [variantId, setVariantId] = useState('CQB-01');
  const [opId, setOpId] = useState('');
  const [elementFilter, setElementFilter] = useState('ALL');
  const [actorId, setActorId] = useState(DEV_CQB_ROSTER[0]?.id || 'ce-warden');
  const [focusMode, setFocusMode] = useState(null);
  const [forceDesignOpId, setForceDesignOpId] = useState('');
  const [reportsOpId, setReportsOpId] = useState('');
  const [events, setEvents] = useState(() => listStoredCqbEvents({ includeStale: true }));
  const [opsVersion, setOpsVersion] = useState(0);

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
    const unsubscribe = subscribeOperations(() => {
      setOpsVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const timer = setInterval(() => {
      const diagnostics = getCqbEventDiagnostics(60000);
      console.info('[NexusOS][CQB][Diagnostics]', diagnostics);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  const locationEstimates = useMemo(
    () =>
      buildDevLocationEstimates({
        events,
        roster: DEV_CQB_ROSTER,
        opId: resolvedOpId,
      }),
    [events, resolvedOpId]
  );

  const controlSignals = useMemo(
    () =>
      buildDevControlSignals({
        events,
        roster: DEV_CQB_ROSTER,
        opId: resolvedOpId,
        locationEstimates,
      }),
    [events, resolvedOpId, locationEstimates]
  );
  const controlZones = useMemo(() => computeControlZones(controlSignals, Date.now()), [controlSignals]);

  const sharedPanelProps = {
    variantId,
    opId: resolvedOpId,
    elementFilter,
    roster: DEV_CQB_ROSTER,
    actorId,
    events,
    locationEstimates,
    controlSignals,
    controlZones,
    operations,
    focusOperationId,
    onCreateMacroEvent: createMacroEvent,
    onOpenCqbConsole: () => setFocusMode('cqb'),
    onOpenCommsNetwork: () => setFocusMode('comms'),
    onOpenMapFocus: () => setFocusMode('map'),
    onOpenOperationFocus: () => setFocusMode('ops'),
    onOpenForceDesign: (nextOpId) => {
      if (nextOpId) setForceDesignOpId(nextOpId);
      setFocusMode('force');
    },
    onOpenReports: (nextOpId) => {
      if (nextOpId) setReportsOpId(nextOpId);
      setFocusMode('reports');
    },
  };

  const panelDescriptors = useMemo(() => {
    if (bridgeId === 'OPS') {
      return [
        {
          id: 'panel-cqb-teamtiles',
          title: 'TeamTiles CQB Mode',
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
          id: 'panel-cqb-feed',
          title: 'CQB Feed',
          component: CqbFeedPanel,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 2 },
        },
        {
          id: 'panel-cqb-macropad',
          title: 'CQB MacroPad',
          component: CqbMacroPad,
          status: variantId,
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
          id: 'panel-cqb-console',
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
      return [
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
          id: 'panel-diagnostics',
          title: 'Diagnostics',
          component: DiagnosticsPanel,
          status: 'Live',
          statusTone: 'ok',
          live: true,
          defaultSize: { colSpan: 1, rowSpan: 1 },
        },
      ];
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
  }, [bridgeId, variantId]);

  const handleBridgeSwitch = (nextBridgeId) => {
    setBridgeId(nextBridgeId);
    setPresetId(BRIDGE_DEFAULT_PRESET[nextBridgeId] || presetId);
    if (focusMode === 'cqb' || focusMode === 'comms') {
      setFocusMode(focusModeFromBridge(nextBridgeId));
    }
  };

  return (
    <div
      className="w-full h-[calc(100vh-8.5rem)] min-h-0 overflow-hidden px-4 py-4 flex flex-col gap-3"
      style={{ ...vars, backgroundColor: 'var(--nx-shell-bg)' }}
    >
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 flex items-center justify-between gap-3" style={{ borderColor: 'var(--nx-border)' }}>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold uppercase tracking-wide text-zinc-100">
            {isWorkspaceMode ? 'Nexus OS Workspace' : 'Nexus OS Preview'}
          </h1>
          <p className="text-xs text-zinc-500">
            {isWorkspaceMode
              ? 'Event-sourced operational workspace. No fake telemetry, TTL/confidence enforced.'
              : 'Dev-only CQB Kernel UI v1.0 in shell preview. No production route impact.'}
          </p>
        </div>
        {isWorkspaceMode ? <NexusBadge tone="active">WORKSPACE</NexusBadge> : <NexusBadge tone="warning">DEV ONLY</NexusBadge>}
      </section>

      <CqbContextSelector
        variantId={variantId}
        onVariantIdChange={setVariantId}
        opId={opId}
        onOpIdChange={setOpId}
        elementFilter={elementFilter}
        onElementFilterChange={setElementFilter}
        actorId={actorId}
        onActorIdChange={setActorId}
        roster={DEV_CQB_ROSTER}
      />

      <OpsStrip actorId={actorId} onOpenOperationFocus={() => setFocusMode('ops')} />

      <BridgeSwitcher activeBridgeId={bridgeId} onSwitch={handleBridgeSwitch} />

      <div className="flex-1 min-h-0 overflow-hidden">
        <WorkbenchGrid
          bridgeId={bridgeId}
          panels={panelDescriptors}
          presetId={presetId}
          onPresetChange={setPresetId}
          panelComponentProps={sharedPanelProps}
        />
      </div>

      <CommandFocus
        open={Boolean(focusMode)}
        onClose={() => setFocusMode(null)}
        FocusApp={() => (
          <FocusShell
            mode={focusMode}
            sharedPanelProps={sharedPanelProps}
            forceDesignOpId={forceDesignOpId}
            reportsOpId={reportsOpId}
            onClose={() => setFocusMode(null)}
          />
        )}
      />
    </div>
  );
}
