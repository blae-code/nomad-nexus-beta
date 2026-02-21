import type { CqbEvent, CqbEventType } from '../schemas/coreSchemas';
import type { CommsChannelHealth, CommsIncidentRecord } from './commsIncidentService';

export type DirectiveDeliveryState = 'QUEUED' | 'PERSISTED' | 'ACKED';
export type DisciplineAlertSeverity = 'critical' | 'warning' | 'info';

export interface DirectiveDispatchRecord {
  dispatchId: string;
  channelId: string;
  laneId: string;
  directive: string;
  eventType: CqbEventType;
  incidentId: string;
  issuedAtMs: number;
  status: DirectiveDeliveryState;
}

export interface CommsDirectiveThreadLane {
  id: string;
  channelId: string;
  label: string;
  qualityPct: number;
  unresolvedCount: number;
  criticalCount: number;
  directiveVolume: number;
  lastActivityMs: number;
  nextAction: 'ACK' | 'ASSIGN' | 'RESTRICT' | 'REROUTE' | 'CHECKIN';
}

export interface DisciplineAlert {
  id: string;
  severity: DisciplineAlertSeverity;
  title: string;
  detail: string;
}

const DIRECTIVE_EVENT_SET = new Set<CqbEventType>([
  'MOVE_OUT',
  'HOLD',
  'SELF_CHECK',
  'ROGER',
  'WILCO',
  'CLEAR_COMMS',
]);
const ACK_EVENT_SET = new Set<CqbEventType>(['ROGER', 'WILCO', 'CLEAR_COMMS']);
const ALERT_SEVERITY_RANK: Record<DisciplineAlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function toText(value: unknown): string {
  return String(value || '').trim();
}

function eventMs(event: Partial<CqbEvent>, fallbackMs: number): number {
  const parsed = Date.parse(String(event?.createdAt || ''));
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function directiveToken(event: Partial<CqbEvent>): string {
  const payloadDirective = toText((event as any)?.payload?.directive).toUpperCase();
  if (payloadDirective) return payloadDirective;
  return toText(event?.eventType).toUpperCase();
}

function laneIdForChannel(channelId: string): string {
  const normalized = toText(channelId) || 'UNSCOPED';
  return `lane:${normalized}`;
}

function laneLabel(channelId: string): string {
  const normalized = toText(channelId);
  if (!normalized || normalized === 'UNSCOPED') return 'Unscoped Lane';
  if (normalized.startsWith('op-')) return `Op ${normalized.slice(3)}`;
  return normalized.replace(/[-_]/g, ' ');
}

export function createDirectiveDispatchRecord(input: {
  channelId: string;
  laneId?: string;
  directive: string;
  eventType: CqbEventType;
  incidentId?: string;
  nowMs?: number;
}): DirectiveDispatchRecord {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const channelId = toText(input.channelId) || 'UNSCOPED';
  return {
    dispatchId: `dispatch:${nowMs}:${Math.random().toString(36).slice(2, 7)}`,
    channelId,
    laneId: toText(input.laneId) || laneIdForChannel(channelId),
    directive: toText(input.directive) || toText(input.eventType) || 'DIRECTIVE',
    eventType: input.eventType,
    incidentId: toText(input.incidentId),
    issuedAtMs: nowMs,
    status: 'QUEUED',
  };
}

export function buildCommsDirectiveThreads(input: {
  channelHealth: CommsChannelHealth[];
  incidents: CommsIncidentRecord[];
  events: CqbEvent[];
  nowMs?: number;
  maxLanes?: number;
}): CommsDirectiveThreadLane[] {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const maxLanes = Math.max(1, Number(input.maxLanes || 18));
  const laneMap = new Map<string, CommsDirectiveThreadLane>();

  for (const channel of input.channelHealth || []) {
    const id = laneIdForChannel(channel.channelId);
    laneMap.set(id, {
      id,
      channelId: channel.channelId,
      label: channel.label || laneLabel(channel.channelId),
      qualityPct: channel.qualityPct,
      unresolvedCount: 0,
      criticalCount: 0,
      directiveVolume: 0,
      lastActivityMs: nowMs - Math.round(channel.intensity * 10000),
      nextAction: 'CHECKIN',
    });
  }

  for (const incident of input.incidents || []) {
    const channelId = toText(incident.channelId) || 'UNSCOPED';
    const id = laneIdForChannel(channelId);
    const lane =
      laneMap.get(id) ||
      ({
        id,
        channelId,
        label: laneLabel(channelId),
        qualityPct: 68,
        unresolvedCount: 0,
        criticalCount: 0,
        directiveVolume: 0,
        lastActivityMs: incident.createdAtMs || nowMs,
        nextAction: 'CHECKIN',
      } satisfies CommsDirectiveThreadLane);
    if (incident.status !== 'RESOLVED') lane.unresolvedCount += 1;
    if (incident.priority === 'CRITICAL' && incident.status !== 'RESOLVED') lane.criticalCount += 1;
    lane.lastActivityMs = Math.max(lane.lastActivityMs, incident.createdAtMs || nowMs);
    laneMap.set(id, lane);
  }

  for (const event of input.events || []) {
    const channelId = toText(event.channelId) || 'UNSCOPED';
    const id = laneIdForChannel(channelId);
    const lane =
      laneMap.get(id) ||
      ({
        id,
        channelId,
        label: laneLabel(channelId),
        qualityPct: 70,
        unresolvedCount: 0,
        criticalCount: 0,
        directiveVolume: 0,
        lastActivityMs: eventMs(event, nowMs),
        nextAction: 'CHECKIN',
      } satisfies CommsDirectiveThreadLane);
    if (DIRECTIVE_EVENT_SET.has(event.eventType)) {
      lane.directiveVolume += 1;
    }
    lane.lastActivityMs = Math.max(lane.lastActivityMs, eventMs(event, nowMs));
    laneMap.set(id, lane);
  }

  const lanes = [...laneMap.values()].map((lane) => {
    let nextAction: CommsDirectiveThreadLane['nextAction'] = 'CHECKIN';
    if (lane.criticalCount > 0) nextAction = 'ACK';
    else if (lane.unresolvedCount > 0) nextAction = 'ASSIGN';
    else if (lane.qualityPct < 55) nextAction = 'REROUTE';
    else if (lane.directiveVolume >= 4) nextAction = 'RESTRICT';
    return { ...lane, nextAction };
  });

  return lanes
    .sort((a, b) => {
      if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
      if (a.unresolvedCount !== b.unresolvedCount) return b.unresolvedCount - a.unresolvedCount;
      if (a.directiveVolume !== b.directiveVolume) return b.directiveVolume - a.directiveVolume;
      return b.lastActivityMs - a.lastActivityMs;
    })
    .slice(0, maxLanes);
}

export function buildCommsDisciplineAlerts(input: {
  events: CqbEvent[];
  incidents: CommsIncidentRecord[];
  nowMs?: number;
  activeSpeakers?: number;
  degradedChannelCount?: number;
  windowMs?: number;
}): DisciplineAlert[] {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const windowMs = Number(input.windowMs || 12 * 60 * 1000);
  const alerts: DisciplineAlert[] = [];
  const duplicateMap = new Map<string, number>();
  const directiveByChannel = new Map<string, Set<string>>();

  for (const event of input.events || []) {
    const createdAtMs = eventMs(event, nowMs);
    if (nowMs - createdAtMs > windowMs) continue;
    const channelId = toText(event.channelId) || 'UNSCOPED';
    const directive = directiveToken(event);
    if (!directive) continue;
    const dupKey = `${channelId}:${directive}`;
    duplicateMap.set(dupKey, (duplicateMap.get(dupKey) || 0) + 1);
    const directives = directiveByChannel.get(channelId) || new Set<string>();
    directives.add(directive);
    directiveByChannel.set(channelId, directives);
  }

  for (const [dupKey, count] of duplicateMap.entries()) {
    if (count < 2) continue;
    const [channelId, directive] = dupKey.split(':');
    alerts.push({
      id: `dup:${dupKey}`,
      severity: count >= 3 ? 'critical' : 'warning',
      title: 'Duplicate Directive Pattern',
      detail: `${directive} repeated ${count}x on ${channelId}.`,
    });
  }

  for (const [channelId, directives] of directiveByChannel.entries()) {
    if (directives.has('REROUTE_TRAFFIC') && directives.has('RESTRICT_NON_ESSENTIAL')) {
      alerts.push({
        id: `conflict:${channelId}`,
        severity: 'warning',
        title: 'Conflicting Lane Orders',
        detail: `${channelId} has simultaneous reroute and restrict directives.`,
      });
    }
  }

  const staleUnresolved = (input.incidents || []).filter(
    (incident) => incident.status !== 'RESOLVED' && nowMs - Number(incident.createdAtMs || nowMs) > 10 * 60 * 1000
  );
  if (staleUnresolved.length > 0) {
    alerts.push({
      id: 'stale:incidents',
      severity: staleUnresolved.some((incident) => incident.priority === 'CRITICAL') ? 'critical' : 'warning',
      title: 'Unacknowledged Incident Age',
      detail: `${staleUnresolved.length} unresolved incidents exceed 10m response window.`,
    });
  }

  if (Number(input.activeSpeakers || 0) >= 3 && Number(input.degradedChannelCount || 0) > 0) {
    alerts.push({
      id: 'voice:collision',
      severity: 'warning',
      title: 'Voice Collision Risk',
      detail: `${input.activeSpeakers} active speakers with ${input.degradedChannelCount} degraded lanes.`,
    });
  }

  return alerts
    .sort((a, b) => {
      if (ALERT_SEVERITY_RANK[a.severity] !== ALERT_SEVERITY_RANK[b.severity]) {
        return ALERT_SEVERITY_RANK[b.severity] - ALERT_SEVERITY_RANK[a.severity];
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, 6);
}

export function reconcileDirectiveDispatches(input: {
  dispatches: DirectiveDispatchRecord[];
  events: CqbEvent[];
  incidents: CommsIncidentRecord[];
  nowMs?: number;
  maxItems?: number;
}): DirectiveDispatchRecord[] {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const maxItems = Math.max(1, Number(input.maxItems || 12));
  const eventsByDispatchId = new Map<string, CqbEvent>();

  for (const event of input.events || []) {
    const dispatchId = toText((event as any)?.payload?.dispatchId);
    if (!dispatchId) continue;
    const current = eventsByDispatchId.get(dispatchId);
    if (!current || eventMs(event, nowMs) > eventMs(current, nowMs)) {
      eventsByDispatchId.set(dispatchId, event);
    }
  }

  return (input.dispatches || [])
    .map((dispatch) => {
      const persistedEvent = eventsByDispatchId.get(dispatch.dispatchId);
      const incident = dispatch.incidentId
        ? (input.incidents || []).find((candidate) => candidate.id === dispatch.incidentId) || null
        : null;

      let status: DirectiveDeliveryState = persistedEvent ? 'PERSISTED' : dispatch.status || 'QUEUED';

      if (status === 'PERSISTED') {
        if (dispatch.directive === 'INCIDENT_ACK' && incident && ['ACKED', 'ASSIGNED', 'RESOLVED'].includes(incident.status)) {
          status = 'ACKED';
        } else if (dispatch.directive === 'INCIDENT_ASSIGN' && incident && ['ASSIGNED', 'RESOLVED'].includes(incident.status)) {
          status = 'ACKED';
        } else if (dispatch.directive === 'INCIDENT_RESOLVE' && incident && incident.status === 'RESOLVED') {
          status = 'ACKED';
        } else if (!dispatch.incidentId) {
          const acknowledged = (input.events || []).some((event) => {
            if (!ACK_EVENT_SET.has(event.eventType)) return false;
            const createdAtMs = eventMs(event, nowMs);
            if (createdAtMs < dispatch.issuedAtMs) return false;
            return toText(event.channelId) === toText(dispatch.channelId);
          });
          if (acknowledged) status = 'ACKED';
        }
      }

      return { ...dispatch, status };
    })
    .sort((a, b) => b.issuedAtMs - a.issuedAtMs)
    .slice(0, maxItems);
}
