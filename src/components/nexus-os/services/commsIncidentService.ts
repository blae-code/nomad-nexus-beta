import type { CqbEvent } from '../schemas/coreSchemas';
import type { CommsGraphSnapshot } from './commsGraphService';

export type CommsIncidentPriority = 'CRITICAL' | 'HIGH' | 'MED';
export type CommsIncidentStatus = 'NEW' | 'ACKED' | 'ASSIGNED' | 'RESOLVED';
export type CommsChannelDiscipline = 'CLEAR' | 'BUSY' | 'SATURATED';
export type CommsRoutingDirective = 'NORMAL' | 'LIMIT_NON_ESSENTIAL' | 'REROUTE_MONITOR';

export interface CommsChannelHealth {
  channelId: string;
  label: string;
  membershipCount: number;
  intensity: number;
  qualityPct: number;
  latencyMs: number;
  discipline: CommsChannelDiscipline;
  directive: CommsRoutingDirective;
}

export interface CommsIncidentCandidate {
  id: string;
  channelId: string;
  title: string;
  detail: string;
  priority: CommsIncidentPriority;
  recommendedAction: string;
  createdAtMs: number;
}

export interface CommsIncidentRecord extends CommsIncidentCandidate {
  status: CommsIncidentStatus;
}

const PRIORITY_RANK: Record<CommsIncidentPriority, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MED: 1,
};

const STATUS_RANK: Record<CommsIncidentStatus, number> = {
  NEW: 0,
  ACKED: 1,
  ASSIGNED: 2,
  RESOLVED: 3,
};

const TRANSITIONS: Record<CommsIncidentStatus, CommsIncidentStatus[]> = {
  NEW: ['ACKED'],
  ACKED: ['ASSIGNED', 'RESOLVED'],
  ASSIGNED: ['RESOLVED'],
  RESOLVED: [],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseTimestampMs(raw: string | undefined, fallbackMs: number): number {
  const parsed = Date.parse(String(raw || ''));
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function eventPriority(eventType: string): CommsIncidentPriority | null {
  if (eventType === 'DOWNED' || eventType === 'EXTRACT') return 'CRITICAL';
  if (eventType === 'CONTACT' || eventType === 'THREAT_UPDATE' || eventType === 'REVIVE') return 'HIGH';
  if (eventType === 'HOLD' || eventType === 'CLEAR_COMMS') return 'MED';
  return null;
}

function disciplineForIntensity(intensity: number): CommsChannelDiscipline {
  if (intensity >= 0.72) return 'SATURATED';
  if (intensity >= 0.42) return 'BUSY';
  return 'CLEAR';
}

function directiveForDiscipline(discipline: CommsChannelDiscipline): CommsRoutingDirective {
  if (discipline === 'SATURATED') return 'REROUTE_MONITOR';
  if (discipline === 'BUSY') return 'LIMIT_NON_ESSENTIAL';
  return 'NORMAL';
}

export function buildCommsChannelHealth(snapshot: Pick<CommsGraphSnapshot, 'channels'>): CommsChannelHealth[] {
  return (snapshot.channels || []).map((channel) => {
    const discipline = disciplineForIntensity(channel.intensity);
    const membershipPenalty = channel.membershipCount * 1.6;
    const intensityPenalty = channel.intensity * 38;
    const qualityPct = clamp(Math.round(99 - membershipPenalty - intensityPenalty), 36, 99);
    const latencyMs = clamp(Math.round(18 + membershipPenalty * 2 + channel.intensity * 96), 18, 220);
    return {
      channelId: channel.id,
      label: channel.label,
      membershipCount: channel.membershipCount,
      intensity: channel.intensity,
      qualityPct,
      latencyMs,
      discipline,
      directive: directiveForDiscipline(discipline),
    };
  });
}

export function buildCommsIncidentCandidates(input: {
  channelHealth: CommsChannelHealth[];
  events: CqbEvent[];
  nowMs?: number;
  eventWindowMs?: number;
}): CommsIncidentCandidate[] {
  const nowMs = input.nowMs ?? Date.now();
  const eventWindowMs = input.eventWindowMs ?? 6 * 60 * 1000;
  const incidents: CommsIncidentCandidate[] = [];

  for (const channel of input.channelHealth) {
    if (channel.discipline === 'CLEAR' && channel.qualityPct >= 82) continue;
    const priority: CommsIncidentPriority =
      channel.discipline === 'SATURATED' || channel.qualityPct < 60 ? 'HIGH' : 'MED';
    incidents.push({
      id: `health:${channel.channelId}`,
      channelId: channel.channelId,
      title: `${channel.label} comms degraded`,
      detail: `Q${channel.qualityPct}% · ${channel.latencyMs}ms · ${channel.membershipCount} members`,
      priority,
      recommendedAction: channel.directive === 'REROUTE_MONITOR' ? 'Reroute monitor traffic' : 'Restrict non-essential traffic',
      createdAtMs: nowMs - Math.round(channel.intensity * 10000),
    });
  }

  for (const event of input.events || []) {
    const createdAtMs = parseTimestampMs(event.createdAt, nowMs);
    if (nowMs - createdAtMs > eventWindowMs) continue;
    const priority = eventPriority(event.eventType);
    if (!priority) continue;

    const payloadSummary =
      typeof event.payload?.summary === 'string'
        ? event.payload.summary
        : typeof event.payload?.directive === 'string'
        ? event.payload.directive
        : '';

    incidents.push({
      id: `event:${event.id}`,
      channelId: event.channelId || 'UNSCOPED',
      title: `${event.eventType.replace(/_/g, ' ')} callout`,
      detail: payloadSummary || `Author ${event.authorId}`,
      priority,
      recommendedAction: priority === 'CRITICAL' ? 'Acknowledge and assign immediately' : 'Acknowledge and validate lane',
      createdAtMs,
    });
  }

  return incidents.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.createdAtMs - a.createdAtMs);
}

export function normalizeIncidentStatusById(
  candidates: CommsIncidentCandidate[],
  previousById: Record<string, CommsIncidentStatus>
): Record<string, CommsIncidentStatus> {
  const next: Record<string, CommsIncidentStatus> = {};
  for (const incident of candidates) {
    next[incident.id] = previousById[incident.id] || 'NEW';
  }
  return next;
}

export function canTransitionIncidentStatus(from: CommsIncidentStatus, to: CommsIncidentStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function sortCommsIncidents(
  candidates: CommsIncidentCandidate[],
  statusById: Record<string, CommsIncidentStatus>
): CommsIncidentRecord[] {
  const withStatus = candidates.map((candidate) => ({
    ...candidate,
    status: statusById[candidate.id] || 'NEW',
  }));

  return withStatus.sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    return b.createdAtMs - a.createdAtMs;
  });
}
