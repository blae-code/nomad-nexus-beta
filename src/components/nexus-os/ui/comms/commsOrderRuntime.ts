import {
  createDirectiveDispatchRecord,
  reconcileDirectiveDispatches,
} from '../../services/commsFocusDirectiveService';

export const ORDER_LIST_PAGE_SIZE = 5;
export const MAX_DISPATCH_HISTORY = 24;

export const INCIDENT_EVENT_BY_STATUS = {
  ACKED: 'ROGER',
  ASSIGNED: 'WILCO',
  RESOLVED: 'CLEAR_COMMS',
} as const;

export type IncidentTransitionStatus = keyof typeof INCIDENT_EVENT_BY_STATUS;

export function createOrderDispatch(input: {
  channelId: string;
  laneId?: string;
  directive: string;
  eventType: string;
  incidentId?: string;
  nowMs: number;
}) {
  return createDirectiveDispatchRecord({
    channelId: input.channelId,
    laneId: input.laneId,
    directive: input.directive,
    eventType: input.eventType as any,
    incidentId: input.incidentId,
    nowMs: input.nowMs,
  });
}

export function appendOrderDispatch<T>(entries: T[], entry: T, maxItems = MAX_DISPATCH_HISTORY) {
  return [entry, ...entries].slice(0, maxItems);
}

export function buildDeliverySurface(input: {
  dispatches: any[];
  events: any[];
  incidents: any[];
  nowMs: number;
}) {
  return reconcileDirectiveDispatches({
    dispatches: input.dispatches,
    events: input.events,
    incidents: input.incidents,
    nowMs: input.nowMs,
  });
}

export function buildDeliveryStats(deliverySurface: any[]) {
  const total = deliverySurface.length;
  const queued = deliverySurface.filter((entry) => entry.status === 'QUEUED').length;
  const persisted = deliverySurface.filter((entry) => entry.status === 'PERSISTED').length;
  const acked = deliverySurface.filter((entry) => entry.status === 'ACKED').length;
  const confidencePct = total > 0 ? Math.round((acked / total) * 100) : 100;
  return { total, queued, persisted, acked, confidencePct };
}

export function buildPagedOrders(deliverySurface: any[], page: number, pageSize = ORDER_LIST_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(deliverySurface.length / pageSize));
  const visible = deliverySurface.slice(page * pageSize, page * pageSize + pageSize);
  return { pageCount, visible };
}

export function deliveryTone(status: string): 'warning' | 'active' | 'ok' {
  if (status === 'QUEUED') return 'warning';
  if (status === 'PERSISTED') return 'active';
  return 'ok';
}
