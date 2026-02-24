import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Operation } from '../../schemas/opSchemas';
import type { CqbEvent } from '../../schemas/coreSchemas';
import type { CqbRosterMember } from '../cqb/cqbTypes';
import { NexusBadge, NexusButton } from '../primitives';
import { channelStatusTokenIcon } from '../comms/commsTokenSemantics';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import {
  buildCommsChannelHealth,
  buildCommsIncidentCandidates,
  canTransitionIncidentStatus,
  normalizeIncidentStatusById,
  sortCommsIncidents,
} from '../../services/commsIncidentService';
import {
  INCIDENT_EVENT_BY_STATUS,
  appendOrderDispatch,
  buildDeliveryStats,
  buildDeliverySurface,
  buildPagedOrders,
  createOrderDispatch,
  deliveryTone,
  ORDER_LIST_PAGE_SIZE,
} from '../comms/commsOrderRuntime';
import { DEFAULT_ACQUISITION_MODE, buildCaptureMetadata, toCaptureMetadataRecord } from '../../services/dataAcquisitionPolicyService';

const INCIDENT_PAGE_SIZE = 5;
const MAX_DISPATCH_HISTORY = 24;
const DIRECTIVE_EVENT_SET = new Set(['MOVE_OUT', 'HOLD', 'SELF_CHECK', 'ROGER', 'WILCO', 'CLEAR_COMMS']);

interface OperationCommsControlPanelProps {
  selectedOp: Operation;
  actorId: string;
  roster: CqbRosterMember[];
  events: CqbEvent[];
  variantId: string;
  locked: boolean;
  onCreateMacroEvent?: (macroEventType: string, payload: Record<string, unknown>) => void;
}

function incidentPriorityTone(priority: string): 'danger' | 'warning' | 'active' {
  if (priority === 'CRITICAL') return 'danger';
  if (priority === 'HIGH') return 'warning';
  return 'active';
}

function incidentStatusTone(status: string): 'warning' | 'active' | 'ok' | 'neutral' {
  if (status === 'NEW') return 'warning';
  if (status === 'ACKED') return 'active';
  if (status === 'ASSIGNED') return 'ok';
  return 'neutral';
}

function formatAge(nowMs: number, createdAtMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - createdAtMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function OperationCommsControlPanel({
  selectedOp,
  actorId,
  roster,
  events,
  variantId,
  locked,
  onCreateMacroEvent,
}: OperationCommsControlPanelProps) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [incidentStatusById, setIncidentStatusById] = useState<Record<string, any>>({});
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentPage, setIncidentPage] = useState(0);
  const [directiveDispatches, setDirectiveDispatches] = useState<any[]>([]);
  const [ordersPage, setOrdersPage] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadGraph = async () => {
      setLoading(true);
      setErrorText('');
      try {
        const next = await buildCommsGraphSnapshot({
          variantId,
          opId: selectedOp.id,
          includeUserNodes: true,
          roster,
        });
        if (cancelled) return;
        setSnapshot(next);
      } catch (err: any) {
        if (cancelled) return;
        setErrorText(err?.message || 'Unable to load comms graph snapshot.');
        setSnapshot(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadGraph();
    return () => {
      cancelled = true;
    };
  }, [variantId, selectedOp.id, roster]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  const channelHealth = useMemo(() => buildCommsChannelHealth({ channels: snapshot?.channels || [] }), [snapshot?.channels]);

  const incidentCandidates = useMemo(
    () => buildCommsIncidentCandidates({ channelHealth, events, nowMs }),
    [channelHealth, events, nowMs]
  );

  useEffect(() => {
    setIncidentStatusById((prev) => normalizeIncidentStatusById(incidentCandidates, prev));
  }, [incidentCandidates]);

  const incidents = useMemo(
    () => sortCommsIncidents(incidentCandidates, incidentStatusById),
    [incidentCandidates, incidentStatusById]
  );

  const unresolvedIncidentCount = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED').length,
    [incidents]
  );

  const incidentPageCount = Math.max(1, Math.ceil(incidents.length / INCIDENT_PAGE_SIZE));
  const visibleIncidents = useMemo(
    () => incidents.slice(incidentPage * INCIDENT_PAGE_SIZE, incidentPage * INCIDENT_PAGE_SIZE + INCIDENT_PAGE_SIZE),
    [incidents, incidentPage]
  );

  useEffect(() => {
    setIncidentPage((current) => Math.min(current, incidentPageCount - 1));
  }, [incidentPageCount]);

  useEffect(() => {
    if (!incidents.length) {
      setSelectedIncidentId('');
      return;
    }
    const exists = incidents.some((incident) => incident.id === selectedIncidentId);
    if (exists) return;
    const firstUnresolved = incidents.find((incident) => incident.status !== 'RESOLVED');
    setSelectedIncidentId(firstUnresolved?.id || incidents[0].id);
  }, [incidents, selectedIncidentId]);

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;

  const deliverySurface = useMemo(
    () => buildDeliverySurface({ dispatches: directiveDispatches, events, incidents, nowMs }),
    [directiveDispatches, events, incidents, nowMs]
  );

  const eventOrders = useMemo(() => {
    return (Array.isArray(events) ? events : [])
      .filter((event) => DIRECTIVE_EVENT_SET.has(String(event?.eventType || '')))
      .map((event) => {
        const issuedAtMs = Number.isFinite(Date.parse(String(event?.createdAt || '')))
          ? Date.parse(String(event?.createdAt || ''))
          : nowMs;
        return {
          dispatchId: String(event?.payload?.dispatchId || `event:${event.id}`),
          directive: String(event?.payload?.directive || event?.eventType || 'DIRECTIVE'),
          channelId: String(event?.channelId || 'UNSCOPED'),
          issuedAtMs,
          status: ['ROGER', 'WILCO', 'CLEAR_COMMS'].includes(String(event?.eventType || '')) ? 'ACKED' : 'PERSISTED',
        };
      })
      .sort((a, b) => b.issuedAtMs - a.issuedAtMs)
      .slice(0, MAX_DISPATCH_HISTORY);
  }, [events, nowMs]);

  const combinedOrders = useMemo(() => {
    const byId = new Map<string, any>();
    for (const row of deliverySurface) byId.set(row.dispatchId, row);
    for (const row of eventOrders) {
      if (!byId.has(row.dispatchId)) byId.set(row.dispatchId, row);
    }
    return [...byId.values()].sort((a, b) => b.issuedAtMs - a.issuedAtMs);
  }, [deliverySurface, eventOrders]);

  const deliveryStats = useMemo(() => buildDeliveryStats(combinedOrders), [combinedOrders]);
  const pagedOrders = useMemo(() => buildPagedOrders(combinedOrders, ordersPage, ORDER_LIST_PAGE_SIZE), [combinedOrders, ordersPage]);

  useEffect(() => {
    setOrdersPage((current) => Math.min(current, pagedOrders.pageCount - 1));
  }, [pagedOrders.pageCount]);

  const emitDirective = useCallback(
    (input: { eventType: any; directive: string; channelId: string; incidentId?: string; successMessage: string; payload?: Record<string, unknown> }) => {
      const dispatch = createOrderDispatch({
        channelId: input.channelId,
        laneId: `lane:${input.channelId}`,
        directive: input.directive,
        eventType: input.eventType,
        incidentId: input.incidentId,
        nowMs,
      });
      setDirectiveDispatches((prev) => appendOrderDispatch(prev, dispatch, MAX_DISPATCH_HISTORY));
      if (onCreateMacroEvent) {
        onCreateMacroEvent(input.eventType, {
          channelId: input.channelId,
          dispatchId: dispatch.dispatchId,
          directive: input.directive,
          incidentId: input.incidentId || null,
          source: 'operation-comms-control',
          actorId,
          ...toCaptureMetadataRecord(
            buildCaptureMetadata({
              mode: DEFAULT_ACQUISITION_MODE,
              source: 'OPERATOR_FORM',
              commandSource: 'ops_comms_control',
              confirmed: true,
            })
          ),
          ...(input.payload || {}),
        });
      }
      setFeedback(onCreateMacroEvent ? input.successMessage : `${input.successMessage} (preview)`);
    },
    [actorId, nowMs, onCreateMacroEvent]
  );

  const transitionIncident = useCallback(
    (nextStatus: 'ACKED' | 'ASSIGNED' | 'RESOLVED') => {
      if (!selectedIncident) return;
      if (!canTransitionIncidentStatus(selectedIncident.status, nextStatus)) return;
      setIncidentStatusById((prev) => ({ ...prev, [selectedIncident.id]: nextStatus }));
      const channelId = selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : channelHealth[0]?.channelId || 'UNSCOPED';
      emitDirective({
        eventType: INCIDENT_EVENT_BY_STATUS[nextStatus],
        channelId,
        incidentId: selectedIncident.id,
        directive: `INCIDENT_${nextStatus}`,
        successMessage: `Incident ${nextStatus.toLowerCase()}`,
        payload: {
          priority: selectedIncident.priority,
          incidentStatus: nextStatus,
        },
      });
    },
    [selectedIncident, channelHealth, emitDirective]
  );

  const dispatchDirective = useCallback(
    (directive: 'REROUTE' | 'RESTRICT' | 'CHECKIN') => {
      const channelId =
        (selectedIncident?.channelId && selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : '') ||
        channelHealth[0]?.channelId ||
        '';
      if (!channelId) return;
      if (directive === 'REROUTE') {
        emitDirective({ eventType: 'MOVE_OUT', channelId, directive: 'REROUTE_TRAFFIC', successMessage: 'Reroute directive sent' });
        return;
      }
      if (directive === 'RESTRICT') {
        emitDirective({ eventType: 'HOLD', channelId, directive: 'RESTRICT_NON_ESSENTIAL', successMessage: 'Restriction directive sent' });
        return;
      }
      emitDirective({ eventType: 'SELF_CHECK', channelId, directive: 'CHECK_IN_REQUEST', successMessage: 'Check-in request broadcast' });
    },
    [selectedIncident, channelHealth, emitDirective]
  );

  const createActionOrder = useCallback(() => {
    const channelId =
      (selectedIncident?.channelId && selectedIncident.channelId !== 'UNSCOPED' ? selectedIncident.channelId : '') ||
      channelHealth[0]?.channelId ||
      '';
    if (!channelId) return;
    emitDirective({
      eventType: 'MOVE_OUT',
      channelId,
      incidentId: selectedIncident?.id || '',
      directive: 'CREATE_ACTION_ORDER',
      successMessage: 'Action order created',
      payload: { orderType: 'COMMS_STABILIZATION' },
    });
  }, [selectedIncident, channelHealth, emitDirective]);

  if (loading) {
    return (
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 text-xs text-zinc-500">
        Loading operational signals controls...
      </section>
    );
  }

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Operational Signals Control</h4>
        <NexusBadge tone={unresolvedIncidentCount > 0 ? 'warning' : 'ok'}>Open {unresolvedIncidentCount}</NexusBadge>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-400">
        Voice net controls are in the right-side Voice Comms panel.
      </div>

      {errorText ? <div className="text-[11px] text-amber-300">{errorText}</div> : null}

      <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1">
        <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Channel Health Snapshot</div>
        <div className="space-y-1">
          {channelHealth.slice(0, 4).map((channel) => (
            <div key={channel.channelId} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1 text-[10px] text-zinc-300 flex items-center justify-between gap-2">
              <span className="truncate">{channel.label}</span>
              <span className="flex items-center gap-1">
                <NexusBadge tone={channel.discipline === 'SATURATED' ? 'warning' : channel.discipline === 'BUSY' ? 'active' : 'ok'}>
                  {channel.discipline}
                </NexusBadge>
                <span className="text-zinc-500">{channel.qualityPct}%</span>
              </span>
            </div>
          ))}
          {channelHealth.length === 0 ? <div className="text-[11px] text-zinc-500">No channel health data in scope.</div> : null}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Incident Queue</div>
        {visibleIncidents.map((incident) => (
          <button
            key={incident.id}
            type="button"
            onClick={() => setSelectedIncidentId(incident.id)}
            className={`w-full text-left rounded border px-2 py-1 ${selectedIncidentId === incident.id ? 'border-orange-500/50 bg-orange-500/10' : 'border-zinc-800 bg-zinc-950/55'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-200 truncate">{incident.title}</span>
              <span className="flex items-center gap-1">
                <img src={channelStatusTokenIcon(incident.priority)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                <NexusBadge tone={incidentPriorityTone(incident.priority)}>{incident.priority}</NexusBadge>
                <NexusBadge tone={incidentStatusTone(incident.status)}>{incident.status}</NexusBadge>
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500 truncate">{incident.detail}</div>
          </button>
        ))}
        {visibleIncidents.length === 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-500">No active incidents in this operation.</div>
        ) : null}
      </div>

      {incidentPageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
          <NexusButton size="sm" intent="subtle" onClick={() => setIncidentPage((prev) => Math.max(0, prev - 1))} disabled={incidentPage === 0}>Prev</NexusButton>
          <span>{incidentPage + 1}/{incidentPageCount}</span>
          <NexusButton size="sm" intent="subtle" onClick={() => setIncidentPage((prev) => Math.min(incidentPageCount - 1, prev + 1))} disabled={incidentPage >= incidentPageCount - 1}>Next</NexusButton>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5">
        <NexusButton size="sm" intent="primary" disabled={locked || !selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'ACKED')} onClick={() => transitionIncident('ACKED')}>Ack</NexusButton>
        <NexusButton size="sm" intent="primary" disabled={locked || !selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'ASSIGNED')} onClick={() => transitionIncident('ASSIGNED')}>Assign</NexusButton>
        <NexusButton size="sm" intent="primary" disabled={locked || !selectedIncident || !canTransitionIncidentStatus(selectedIncident.status, 'RESOLVED')} onClick={() => transitionIncident('RESOLVED')}>Resolve</NexusButton>
        <NexusButton size="sm" intent="subtle" disabled={locked} onClick={createActionOrder}>Create Order</NexusButton>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <NexusButton size="sm" intent="subtle" disabled={locked} onClick={() => dispatchDirective('REROUTE')}>Reroute Net</NexusButton>
        <NexusButton size="sm" intent="subtle" disabled={locked} onClick={() => dispatchDirective('RESTRICT')}>Restrict Net</NexusButton>
        <NexusButton size="sm" intent="subtle" disabled={locked} onClick={() => dispatchDirective('CHECKIN')}>Broadcast Check-In</NexusButton>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Orders Feed</div>
          <div className="flex items-center gap-1">
            <NexusBadge tone={deliveryStats.queued > 0 ? 'warning' : 'neutral'}>Queued {deliveryStats.queued}</NexusBadge>
            <NexusBadge tone={deliveryStats.persisted > 0 ? 'active' : 'neutral'}>Persisted {deliveryStats.persisted}</NexusBadge>
            <NexusBadge tone={deliveryStats.acked > 0 ? 'ok' : 'neutral'}>Acked {deliveryStats.acked}</NexusBadge>
          </div>
        </div>
        {pagedOrders.visible.map((dispatch) => (
          <div key={dispatch.dispatchId} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{dispatch.directive}</span>
              <NexusBadge tone={deliveryTone(dispatch.status)}>{dispatch.status}</NexusBadge>
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500 truncate">{dispatch.channelId} · {formatAge(nowMs, dispatch.issuedAtMs)} ago</div>
          </div>
        ))}
        {pagedOrders.visible.length === 0 ? (
          <div className="text-[11px] text-zinc-500">No directive traffic yet.</div>
        ) : null}
      </div>

      {pagedOrders.pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
          <NexusButton size="sm" intent="subtle" onClick={() => setOrdersPage((prev) => Math.max(0, prev - 1))} disabled={ordersPage === 0}>Prev</NexusButton>
          <span>{ordersPage + 1}/{pagedOrders.pageCount}</span>
          <NexusButton size="sm" intent="subtle" onClick={() => setOrdersPage((prev) => Math.min(pagedOrders.pageCount - 1, prev + 1))} disabled={ordersPage >= pagedOrders.pageCount - 1}>Next</NexusButton>
        </div>
      ) : null}

      {feedback ? (
        <div className="text-[10px] text-orange-300">{feedback}</div>
      ) : null}
    </section>
  );
}
