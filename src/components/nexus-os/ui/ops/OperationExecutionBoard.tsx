import React, { useEffect, useMemo, useState } from 'react';
import type { Operation, OperationReadinessGate } from '../../schemas/opSchemas';
import {
  listOperationEvents,
  listOperationReadinessGates,
  setOperationReadinessGateStatus,
  subscribeOperations,
} from '../../services/operationService';
import { listPhases, listTasks, subscribePlanning } from '../../services/planningService';
import { computeRosterSummary, subscribeRsvp } from '../../services/rsvpService';
import { listOperationLeadAlerts, subscribeOperationEnhancements } from '../../services/operationEnhancementService';
import { getVariantDisplayBadge } from '../../registries/starCitizenReleaseRegistry';
import {
  buildRegolithLinks,
  deriveMiningExecutionSnapshot,
} from '../../services/operationMiningCompanionService';
import { derivePvpExecutionSnapshot } from '../../services/operationPvpCompanionService';
import { deriveSalvageExecutionSnapshot } from '../../services/operationSalvageCompanionService';
import { NexusBadge, NexusButton } from '../primitives';
import type { OperationRoleView } from '../../services/operationAuthorityService';
import type { OperationStatusUpdateOptions } from '../../services/operationService';

type OrderStatus = 'PERSISTED' | 'ACKED';

interface OrderRow {
  id: string;
  directive: string;
  createdAt: string;
  by: string;
  status: OrderStatus;
}

function formatEventAge(value: string): string {
  const eventMs = Date.parse(String(value || ''));
  if (!Number.isFinite(eventMs)) return '--';
  const deltaSec = Math.max(0, Math.round((Date.now() - eventMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m`;
  return `${Math.floor(deltaMin / 60)}h`;
}

function usePaged<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
  const visibleItems = useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize]
  );
  return { page, setPage, pageCount, visibleItems };
}

function Pager({
  page,
  setPage,
  pageCount,
}: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      <NexusButton size="sm" intent="subtle" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
        Prev
      </NexusButton>
      <NexusBadge tone="neutral">{page + 1}/{pageCount}</NexusBadge>
      <NexusButton size="sm" intent="subtle" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>
        Next
      </NexusButton>
    </div>
  );
}

const ORDER_EVENT_SET = new Set(['MOVE_OUT', 'HOLD', 'SELF_CHECK', 'ROGER', 'WILCO', 'CLEAR_COMMS']);

export default function OperationExecutionBoard({
  operation,
  actorId,
  roleView,
  lifecycleReason,
  actorContext,
  onError,
}: {
  operation: Operation;
  actorId: string;
  roleView: OperationRoleView;
  lifecycleReason: string;
  actorContext?: OperationStatusUpdateOptions['actorContext'];
  onError?: (message: string) => void;
}) {
  const [opsVersion, setOpsVersion] = useState(0);
  const [planVersion, setPlanVersion] = useState(0);
  const [rsvpVersion, setRsvpVersion] = useState(0);
  const [enhVersion, setEnhVersion] = useState(0);
  const [gateNote, setGateNote] = useState('');
  const [selectedGateId, setSelectedGateId] = useState('');

  useEffect(() => {
    const unsubOps = subscribeOperations(() => setOpsVersion((value) => value + 1));
    const unsubPlan = subscribePlanning(() => setPlanVersion((value) => value + 1));
    const unsubRsvp = subscribeRsvp(() => setRsvpVersion((value) => value + 1));
    const unsubEnh = subscribeOperationEnhancements(() => setEnhVersion((value) => value + 1));
    return () => {
      unsubOps();
      unsubPlan();
      unsubRsvp();
      unsubEnh();
    };
  }, []);

  const phases = useMemo(() => listPhases(operation.id), [operation.id, planVersion]);
  const tasks = useMemo(() => listTasks(operation.id), [operation.id, planVersion]);
  const readinessGates = useMemo(() => listOperationReadinessGates(operation.id), [operation.id, opsVersion]);
  const rosterSummary = useMemo(() => computeRosterSummary(operation.id), [operation.id, rsvpVersion]);
  const leadAlerts = useMemo(() => listOperationLeadAlerts(operation.id), [operation.id, enhVersion]);
  const miningSnapshot = useMemo(() => deriveMiningExecutionSnapshot(operation, readinessGates), [operation, readinessGates]);
  const salvageSnapshot = useMemo(() => deriveSalvageExecutionSnapshot(operation, readinessGates), [operation, readinessGates]);
  const pvpSnapshot = useMemo(() => derivePvpExecutionSnapshot(operation, readinessGates, roleView), [operation, readinessGates, roleView]);
  const miningVariantBadge = useMemo(
    () => getVariantDisplayBadge(operation.scenarioConfig?.mining?.variantId),
    [operation.scenarioConfig?.mining?.variantId]
  );
  const pvpVariantBadge = useMemo(
    () => getVariantDisplayBadge(operation.scenarioConfig?.pvp?.variantId),
    [operation.scenarioConfig?.pvp?.variantId]
  );
  const salvageVariantBadge = useMemo(
    () => getVariantDisplayBadge(operation.scenarioConfig?.salvage?.variantId),
    [operation.scenarioConfig?.salvage?.variantId]
  );
  const miningLinks = useMemo(() => buildRegolithLinks(operation), [operation]);
  const orderRows = useMemo<OrderRow[]>(() => {
    return listOperationEvents(operation.id)
      .filter((entry) => ORDER_EVENT_SET.has(String(entry.kind || '').toUpperCase()))
      .map((entry) => ({
        id: entry.id,
        directive: String(entry.kind || '').toUpperCase(),
        createdAt: entry.createdAt,
        by: entry.createdBy,
        status: ['ROGER', 'WILCO', 'CLEAR_COMMS'].includes(String(entry.kind || '').toUpperCase()) ? 'ACKED' : 'PERSISTED',
      }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 24);
  }, [operation.id, opsVersion]);

  useEffect(() => {
    if (!readinessGates.length) {
      setSelectedGateId('');
      return;
    }
    if (selectedGateId && readinessGates.some((gate) => gate.id === selectedGateId)) return;
    setSelectedGateId(readinessGates[0].id);
  }, [readinessGates, selectedGateId]);

  const selectedGate = readinessGates.find((gate) => gate.id === selectedGateId) || null;
  useEffect(() => {
    setGateNote(selectedGate?.note || '');
  }, [selectedGate?.id, selectedGate?.note]);

  const phaseProgress = useMemo(() => {
    const donePhases = phases.filter((phase) => phase.status === 'DONE').length;
    const doneTasks = tasks.filter((task) => task.status === 'DONE').length;
    return {
      phasesDone: donePhases,
      phasesTotal: phases.length,
      tasksDone: doneTasks,
      tasksTotal: tasks.length,
    };
  }, [phases, tasks]);

  const requiredReady = useMemo(
    () => readinessGates.filter((gate) => gate.required && gate.status === 'READY').length,
    [readinessGates]
  );
  const requiredTotal = useMemo(
    () => readinessGates.filter((gate) => gate.required).length,
    [readinessGates]
  );

  const canManageGates = roleView === 'COMMAND';

  const pagedPhases = usePaged(phases, 5);
  const pagedGates = usePaged(readinessGates, 6);
  const pagedOrders = usePaged(orderRows, 6);
  const pagedAlerts = usePaged(leadAlerts, 5);

  const updateGateStatus = (gate: OperationReadinessGate, status: OperationReadinessGate['status']) => {
    try {
      setOperationReadinessGateStatus(operation.id, gate.id, status, actorId, gateNote, Date.now(), actorContext);
    } catch (error: any) {
      onError?.(error?.message || 'Failed to update readiness gate.');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
      <section className="xl:col-span-2 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Execution Progress</h4>
          <NexusBadge tone={requiredTotal > 0 && requiredReady >= requiredTotal ? 'ok' : 'warning'}>
            Gates {requiredReady}/{requiredTotal}
          </NexusBadge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-300">
            Phases done: {phaseProgress.phasesDone}/{phaseProgress.phasesTotal}
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-zinc-300">
            Tasks done: {phaseProgress.tasksDone}/{phaseProgress.tasksTotal}
          </div>
        </div>
        {miningSnapshot ? (
          <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-zinc-200">Mining Execution Intelligence</div>
                <span title={miningVariantBadge.tooltip}>
                  <NexusBadge tone={miningVariantBadge.tone}>{miningVariantBadge.label}</NexusBadge>
                </span>
              </div>
              <NexusBadge tone={miningSnapshot.regolithStatus === 'LINKED' ? 'ok' : miningSnapshot.regolithStatus === 'PENDING_LINK' ? 'warning' : 'neutral'}>
                {miningSnapshot.regolithStatus}
              </NexusBadge>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 text-zinc-300">
              <div className="truncate">Variant: {miningSnapshot.variantLabel}</div>
              <div className="truncate">Tier: {miningSnapshot.tier}</div>
              <div className="truncate">Environment: {miningSnapshot.environment}</div>
              <div className="truncate">Method: {miningSnapshot.extractionMethod}</div>
              <div className="truncate">Ore targets: {miningSnapshot.oreTargetCount}</div>
              <div className="truncate">Gross aUEC: {Math.round(miningSnapshot.grossAuec).toLocaleString()}</div>
              <div className="truncate">Net aUEC: {Math.round(miningSnapshot.netAuec).toLocaleString()}</div>
              <div className="truncate">Ready gates: {miningSnapshot.requiredReady}/{miningSnapshot.requiredTotal}</div>
              <div className="truncate">Fracture %: {Math.round(miningSnapshot.telemetry.fractureSuccessRatePct)}</div>
              <div className="truncate">Overcharge: {Math.round(miningSnapshot.telemetry.overchargeIncidents)}</div>
              <div className="truncate">Recovered SCU: {Math.round(miningSnapshot.telemetry.recoveredScu)}</div>
              <div className="truncate">Idle haul min: {Math.round(miningSnapshot.telemetry.idleHaulMinutes)}</div>
            </div>
            {miningSnapshot.warnings.length > 0 ? (
              <div className="space-y-1">
                {miningSnapshot.warnings.slice(0, 2).map((warning, index) => (
                  <div key={`${warning}:${index}`} className="rounded border border-amber-900/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
            {miningLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {miningLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="rounded border border-sky-900/55 bg-sky-950/20 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-sky-900/30">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {pvpSnapshot ? (
          <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-zinc-200">PvP Execution Intelligence</div>
                <span title={pvpVariantBadge.tooltip}>
                  <NexusBadge tone={pvpVariantBadge.tone}>{pvpVariantBadge.label}</NexusBadge>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <NexusBadge tone={pvpSnapshot.redacted ? 'warning' : 'ok'}>
                  {pvpSnapshot.redacted ? 'REDACTED' : 'COMMAND'}
                </NexusBadge>
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 text-zinc-300">
              <div className="truncate">Variant: {pvpSnapshot.variantLabel}</div>
              <div className="truncate">Environment: {pvpSnapshot.environment}</div>
              <div className="truncate">Profile: {pvpSnapshot.engagementProfile}</div>
              <div className="truncate">Opsec: {pvpSnapshot.opsecLevel}</div>
              <div className="truncate">Objective: {pvpSnapshot.objectiveType}</div>
              <div className="truncate">Force ratio: {pvpSnapshot.forceRatio.toFixed(2)}</div>
              <div className="truncate">Friendly/Hostile: {Math.round(pvpSnapshot.friendlyPlanned)}/{Math.round(pvpSnapshot.hostileEstimated)}</div>
              <div className="truncate">Gate readiness: {pvpSnapshot.requiredReady}/{pvpSnapshot.requiredTotal}</div>
              <div className="truncate">Control target %: {Math.round(pvpSnapshot.objectiveControlTargetPct)}</div>
              <div className="truncate">Casualties: {Math.round(pvpSnapshot.currentCasualties)}/{Math.round(pvpSnapshot.casualtyCap)}</div>
              <div className="truncate">Comms disruptions: {Math.round(pvpSnapshot.commsDisruptions)}</div>
              <div className="truncate">Reaction sec: {Math.round(pvpSnapshot.reactionLatencySec)}</div>
              <div className="truncate xl:col-span-2">Opponent: {pvpSnapshot.opponentLabel}</div>
              <div className="truncate">Strength: {pvpSnapshot.opponentStrength}</div>
              <div className="truncate">Intel confidence: {pvpSnapshot.intelConfidence}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-300">
              Intent: {pvpSnapshot.commandIntent || 'No command intent set.'}
            </div>
            {pvpSnapshot.warnings.length > 0 ? (
              <div className="space-y-1">
                {pvpSnapshot.warnings.slice(0, 2).map((warning, index) => (
                  <div key={`${warning}:${index}`} className="rounded border border-amber-900/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
            {pvpSnapshot.companionRefs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pvpSnapshot.companionRefs.slice(0, 4).map((ref, index) => (
                  <span key={`${ref}:${index}`} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
                    {ref}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {salvageSnapshot ? (
          <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-zinc-200">Salvage Execution Intelligence</div>
                <span title={salvageVariantBadge.tooltip}>
                  <NexusBadge tone={salvageVariantBadge.tone}>{salvageVariantBadge.label}</NexusBadge>
                </span>
              </div>
              <NexusBadge tone={salvageSnapshot.requiredTotal > 0 && salvageSnapshot.requiredReady >= salvageSnapshot.requiredTotal ? 'ok' : 'warning'}>
                Gates {salvageSnapshot.requiredReady}/{salvageSnapshot.requiredTotal}
              </NexusBadge>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 text-zinc-300">
              <div className="truncate">Variant: {salvageSnapshot.variantLabel}</div>
              <div className="truncate">Mode: {salvageSnapshot.mode}</div>
              <div className="truncate">Environment: {salvageSnapshot.environment}</div>
              <div className="truncate">Method: {salvageSnapshot.extractionMethod}</div>
              <div className="truncate">Objective: {salvageSnapshot.objectiveType || 'N/A'}</div>
              <div className="truncate">Claim: {salvageSnapshot.claimJurisdiction || 'unassigned'}</div>
              <div className="truncate">Gross aUEC: {Math.round(salvageSnapshot.projectedGrossAuec).toLocaleString()}</div>
              <div className="truncate">Net aUEC: {Math.round(salvageSnapshot.projectedNetAuec).toLocaleString()}</div>
              <div className="truncate">RMC SCU: {Math.round(salvageSnapshot.projectedRmcScu)}</div>
              <div className="truncate">CM SCU: {Math.round(salvageSnapshot.projectedCmScu)}</div>
              <div className="truncate">Cargo SCU: {Math.round(salvageSnapshot.projectedCargoScu)}</div>
              <div className="truncate">Hull recovery %: {Math.round(salvageSnapshot.hullRecoveredPct)}</div>
              <div className="truncate">Components: {Math.round(salvageSnapshot.componentsRecovered)}</div>
              <div className="truncate">Recovered cargo SCU: {Math.round(salvageSnapshot.cargoRecoveredScu)}</div>
              <div className="truncate">Cycle min: {Math.round(salvageSnapshot.cycleTimeMinutes)}</div>
              <div className="truncate">Contamination: {Math.round(salvageSnapshot.contaminationIncidents)}</div>
            </div>
            {salvageSnapshot.warnings.length > 0 ? (
              <div className="space-y-1">
                {salvageSnapshot.warnings.slice(0, 2).map((warning, index) => (
                  <div key={`${warning}:${index}`} className="rounded border border-amber-900/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
            {salvageSnapshot.companionRefs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {salvageSnapshot.companionRefs.slice(0, 4).map((ref, index) => (
                  <span key={`${ref}:${index}`} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
                    {ref}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-1 max-h-48 overflow-hidden pr-1">
          {pagedPhases.visibleItems.map((phase) => (
            <div key={phase.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] flex items-center justify-between gap-2">
              <div className="truncate text-zinc-200">{phase.title}</div>
              <NexusBadge tone={phase.status === 'DONE' ? 'ok' : phase.status === 'IN_PROGRESS' ? 'active' : 'neutral'}>
                {phase.status}
              </NexusBadge>
            </div>
          ))}
          {phases.length === 0 ? <div className="text-xs text-zinc-500">No phases defined yet.</div> : null}
        </div>
        <Pager page={pagedPhases.page} setPage={pagedPhases.setPage} pageCount={pagedPhases.pageCount} />
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Readiness Gates</h4>
          {!canManageGates ? <NexusBadge tone="locked">LOCKED</NexusBadge> : null}
        </div>
        {!canManageGates ? (
          <div className="text-[11px] text-zinc-500">
            {lifecycleReason}
          </div>
        ) : null}
        <select
          value={selectedGateId}
          onChange={(event) => setSelectedGateId(event.target.value)}
          className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
        >
          {readinessGates.map((gate) => (
            <option key={gate.id} value={gate.id}>{gate.label}</option>
          ))}
        </select>
        <textarea
          value={gateNote}
          disabled={!canManageGates}
          onChange={(event) => setGateNote(event.target.value)}
          className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          placeholder="Gate note"
        />
        {selectedGate ? (
          <div className="grid grid-cols-3 gap-1">
            <NexusButton size="sm" intent="subtle" disabled={!canManageGates} onClick={() => updateGateStatus(selectedGate, 'PENDING')}>
              Pending
            </NexusButton>
            <NexusButton size="sm" intent="primary" disabled={!canManageGates} onClick={() => updateGateStatus(selectedGate, 'READY')}>
              Ready
            </NexusButton>
            <NexusButton size="sm" intent="subtle" disabled={!canManageGates} onClick={() => updateGateStatus(selectedGate, 'BLOCKED')}>
              Blocked
            </NexusButton>
          </div>
        ) : null}
        <div className="space-y-1 max-h-44 overflow-hidden pr-1">
          {pagedGates.visibleItems.map((gate) => (
            <div key={gate.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-200 truncate">{gate.label}</span>
                <NexusBadge tone={gate.status === 'READY' ? 'ok' : gate.status === 'BLOCKED' ? 'danger' : 'warning'}>
                  {gate.status}
                </NexusBadge>
              </div>
              <div className="text-zinc-500 truncate">{gate.ownerRole} {gate.required ? '(required)' : '(optional)'}</div>
            </div>
          ))}
          {readinessGates.length === 0 ? <div className="text-xs text-zinc-500">No readiness gates configured.</div> : null}
        </div>
        <Pager page={pagedGates.page} setPage={pagedGates.setPage} pageCount={pagedGates.pageCount} />
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Orders + Alerts</h4>
        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] space-y-1">
          <div className="text-zinc-300">Roster submitted: {rosterSummary.submittedCount}</div>
          <div className="text-zinc-300">Open seats: {rosterSummary.openSeats.reduce((sum, seat) => sum + seat.openQty, 0)}</div>
          <div className="text-zinc-300">Hard violations: {rosterSummary.hardViolations}</div>
        </div>
        <div className="space-y-1 max-h-36 overflow-hidden pr-1">
          {pagedOrders.visibleItems.map((order) => (
            <div key={order.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-200 truncate">{order.directive}</span>
                <NexusBadge tone={order.status === 'ACKED' ? 'ok' : 'neutral'}>{order.status}</NexusBadge>
              </div>
              <div className="text-zinc-500 truncate">{order.by} · {formatEventAge(order.createdAt)} ago</div>
            </div>
          ))}
          {orderRows.length === 0 ? <div className="text-xs text-zinc-500">No recent orders.</div> : null}
        </div>
        <Pager page={pagedOrders.page} setPage={pagedOrders.setPage} pageCount={pagedOrders.pageCount} />
        <div className="space-y-1 max-h-32 overflow-hidden pr-1">
          {pagedAlerts.visibleItems.map((alert) => (
            <div key={alert.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-200 truncate">{alert.title}</span>
                <NexusBadge tone={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'warning' : 'neutral'}>
                  {alert.severity}
                </NexusBadge>
              </div>
              <div className="text-zinc-500 truncate">{alert.summary}</div>
            </div>
          ))}
          {leadAlerts.length === 0 ? <div className="text-xs text-zinc-500">No high-priority alerts.</div> : null}
        </div>
        <Pager page={pagedAlerts.page} setPage={pagedAlerts.setPage} pageCount={pagedAlerts.pageCount} />
      </section>
    </div>
  );
}
