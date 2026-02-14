import type { OperationEventStub } from '../schemas/opSchemas';
import type { MapCommsOverlay } from './mapCommsOverlayService';
import { listOperationEvents } from './operationService';

export type MapTimelineSource = 'OP_EVENT' | 'COMMS_CALLOUT' | 'COMMS_BUS' | 'SPEAK_REQUEST';

export interface MapTimelineEntry {
  id: string;
  source: MapTimelineSource;
  opId?: string;
  netId?: string;
  nodeId?: string;
  title: string;
  detail: string;
  severity: 'LOW' | 'MED' | 'HIGH';
  createdAt: string;
  tsMs: number;
}

export interface MapTimelineSnapshot {
  generatedAt: string;
  nowMs: number;
  windowMinutes: number;
  offsetMinutes: number;
  replayCursorMs: number;
  entries: MapTimelineEntry[];
  visibleEntries: MapTimelineEntry[];
}

interface BuildMapTimelineInput {
  opId?: string;
  events?: OperationEventStub[];
  commsOverlay?: Pick<MapCommsOverlay, 'callouts' | 'commandBus' | 'speakRequests'>;
  windowMinutes?: number;
  offsetMinutes?: number;
  nowMs?: number;
}

function toTsMs(value: unknown): number | null {
  const parsed = new Date(String(value || '')).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function toSeverity(value: unknown): MapTimelineEntry['severity'] {
  const token = String(value || '').toUpperCase();
  if (token === 'CRITICAL' || token === 'HIGH') return 'HIGH';
  if (token === 'MEDIUM' || token === 'MED') return 'MED';
  return 'LOW';
}

function eventToTimelineEntry(event: OperationEventStub): MapTimelineEntry | null {
  const tsMs = toTsMs(event.createdAt);
  if (tsMs === null) return null;
  return {
    id: `op:${event.id}`,
    source: 'OP_EVENT',
    opId: event.opId,
    nodeId: event.nodeId,
    title: event.kind,
    detail: String(event.payload?.notes || event.payload?.title || event.payload?.summary || ''),
    severity: toSeverity(event.payload?.priority),
    createdAt: event.createdAt,
    tsMs,
  };
}

function sortEntries(entries: MapTimelineEntry[]): MapTimelineEntry[] {
  return [...entries].sort((a, b) => b.tsMs - a.tsMs || a.id.localeCompare(b.id));
}

export function buildMapTimelineSnapshot(input: BuildMapTimelineInput): MapTimelineSnapshot {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const windowMinutes = Math.max(5, Math.min(Number(input.windowMinutes || 30), 360));
  const offsetMinutes = Math.max(0, Math.min(Number(input.offsetMinutes || 0), 720));
  const replayCursorMs = nowMs - offsetMinutes * 60_000;
  const windowStartMs = replayCursorMs - windowMinutes * 60_000;

  const operationEvents = (input.events || listOperationEvents(input.opId)).filter((entry) => {
    if (!input.opId) return true;
    return entry.opId === input.opId;
  });
  const opEntries = operationEvents
    .map((entry) => eventToTimelineEntry(entry))
    .filter(Boolean) as MapTimelineEntry[];

  const commsOverlay = input.commsOverlay || { callouts: [], commandBus: [], speakRequests: [] };
  const calloutEntries: MapTimelineEntry[] = (commsOverlay.callouts || []).map((entry) => {
    const tsMs = toTsMs(entry.createdDate) || nowMs;
    return {
      id: `callout:${entry.id}`,
      source: 'COMMS_CALLOUT',
      opId: entry.eventId,
      netId: entry.netId,
      nodeId: entry.nodeId,
      title: `${entry.priority} callout`,
      detail: entry.message || 'Priority comms callout',
      severity: toSeverity(entry.priority),
      createdAt: entry.createdDate || new Date(tsMs).toISOString(),
      tsMs,
    };
  });
  const commandBusEntries: MapTimelineEntry[] = (commsOverlay.commandBus || []).map((entry) => {
    const tsMs = toTsMs(entry.createdDate) || nowMs;
    return {
      id: `bus:${entry.id}`,
      source: 'COMMS_BUS',
      opId: entry.eventId,
      netId: entry.netId,
      nodeId: entry.nodeId,
      title: `Command bus ${entry.action}`,
      detail: JSON.stringify(entry.payload || {}),
      severity: entry.action === 'PRIORITY_OVERRIDE' ? 'HIGH' : 'MED',
      createdAt: entry.createdDate || new Date(tsMs).toISOString(),
      tsMs,
    };
  });
  const speakRequestEntries: MapTimelineEntry[] = (commsOverlay.speakRequests || []).map((entry) => {
    const tsMs = toTsMs(entry.createdDate) || nowMs;
    return {
      id: `speak:${entry.requestId}`,
      source: 'SPEAK_REQUEST',
      opId: entry.eventId,
      netId: entry.netId,
      nodeId: entry.nodeId,
      title: `Speak request ${entry.status}`,
      detail: entry.reason || 'No reason provided',
      severity: entry.status === 'PENDING' ? 'MED' : 'LOW',
      createdAt: entry.createdDate || new Date(tsMs).toISOString(),
      tsMs,
    };
  });

  const entries = sortEntries([
    ...opEntries,
    ...calloutEntries,
    ...commandBusEntries,
    ...speakRequestEntries,
  ]);

  const visibleEntries = entries.filter((entry) => entry.tsMs <= replayCursorMs && entry.tsMs >= windowStartMs);

  return {
    generatedAt: new Date(nowMs).toISOString(),
    nowMs,
    windowMinutes,
    offsetMinutes,
    replayCursorMs,
    entries,
    visibleEntries,
  };
}
