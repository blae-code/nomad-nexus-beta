/**
 * CQB Event Service
 *
 * Guardrails:
 * - Only explicit operator actions may create events.
 * - No synthetic telemetry or fabricated state is allowed.
 * - TTL and confidence are mandatory for tactical truth.
 */

import { CqbVariantRegistryById } from '../registries/cqbVariantRegistry';
import { getDefaultTTLSeconds } from '../registries/ttlProfileRegistry';
import type { CqbEvent, CqbEventType } from '../schemas/coreSchemas';
import { clampConfidence, isValidConfidence } from '../schemas/coreSchemas';
import { isCqbEventActive } from './cqbTTLService';

export type CqbEventCreateInput = Omit<CqbEvent, 'id' | 'createdAt' | 'ttlSeconds'> & {
  id?: string;
  createdAt?: string;
  ttlSeconds?: number;
};

export interface CqbEventListFilters {
  opId?: string;
  variantId?: string;
  channelId?: string;
  eventType?: CqbEventType;
  includeStale?: boolean;
  nowMs?: number;
  limit?: number;
}

export interface CqbDiagnostics {
  generatedAt: string;
  windowMs: number;
  eventsCreatedPerMinute: number;
  unscopedPercent: number;
  mostUsedBrevityMacros: Array<{ eventType: CqbEventType; count: number }>;
}

type CqbEventListener = (event: CqbEvent, allEvents: CqbEvent[]) => void;

const BREVITY_EVENT_TYPES = new Set<CqbEventType>([
  'KISS',
  'ROGER',
  'STAND_BY',
  'WILCO',
  'CLEAR_COMMS',
  'SAY_AGAIN',
  'ON_ME',
  'MOVE_OUT',
  'SET_SECURITY',
  'HOLD',
  'SELF_CHECK',
  'WEAPON_DRY',
  'SET',
  'GREEN',
  'RELOADING',
  'CROSSING',
  'CEASE_FIRE',
  'CHECK_FIRE',
]);

let cqbEventStore: CqbEvent[] = [];
const listeners = new Set<CqbEventListener>();

function createEventId(now = Date.now()): string {
  return `cqb_evt_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByCreatedDesc(events: CqbEvent[]): CqbEvent[] {
  return [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function notifyListeners(event: CqbEvent) {
  const snapshot = sortByCreatedDesc(cqbEventStore);
  for (const listener of listeners) listener(event, snapshot);
}

export function validateCqbEvent(input: Partial<CqbEventCreateInput>): string[] {
  const errors: string[] = [];
  if (!input.variantId) errors.push('variantId is required');
  if (!input.authorId) errors.push('authorId is required');
  if (!input.eventType) errors.push('eventType is required');
  if (!input.payload || typeof input.payload !== 'object') errors.push('payload must be an object');

  const variant = input.variantId ? CqbVariantRegistryById[input.variantId as keyof typeof CqbVariantRegistryById] : null;
  if (!variant) {
    errors.push('variantId is not registered');
  } else if (input.eventType && !variant.allowedEventTypes.includes(input.eventType)) {
    errors.push(`eventType ${input.eventType} is not allowed for variant ${variant.id}`);
  }

  if (typeof input.confidence !== 'number' || !isValidConfidence(input.confidence)) {
    errors.push('confidence must be a number between 0 and 1');
  }

  if (typeof input.ttlSeconds === 'number' && input.ttlSeconds <= 0) {
    errors.push('ttlSeconds must be > 0 when provided');
  }

  return errors;
}

export function createCqbEvent(input: CqbEventCreateInput, nowMs = Date.now()): CqbEvent {
  const variant = CqbVariantRegistryById[input.variantId as keyof typeof CqbVariantRegistryById];
  const ttlSeconds =
    typeof input.ttlSeconds === 'number'
      ? input.ttlSeconds
      : variant
      ? getDefaultTTLSeconds(variant.defaultTTLProfileId, input.eventType, 60)
      : 60;

  const candidate: CqbEvent = {
    id: input.id || createEventId(nowMs),
    opId: input.opId,
    variantId: input.variantId,
    channelId: input.channelId,
    authorId: input.authorId,
    eventType: input.eventType,
    payload: input.payload || {},
    confidence: clampConfidence(input.confidence),
    ttlSeconds,
    createdAt: input.createdAt || new Date(nowMs).toISOString(),
  };

  const validationErrors = validateCqbEvent({ ...candidate });
  if (validationErrors.length > 0) {
    throw new Error(`Invalid CqbEvent: ${validationErrors.join('; ')}`);
  }

  return candidate;
}

export function storeCqbEvent(input: CqbEventCreateInput, nowMs = Date.now()): CqbEvent {
  const event = createCqbEvent(input, nowMs);
  cqbEventStore = sortByCreatedDesc([event, ...cqbEventStore]);
  notifyListeners(event);
  return event;
}

export function listCqbEvents(events: CqbEvent[], filters: CqbEventListFilters = {}): CqbEvent[] {
  const nowMs = filters.nowMs ?? Date.now();
  const filtered = events.filter((event) => {
    if (filters.opId && event.opId !== filters.opId) return false;
    if (filters.variantId && event.variantId !== filters.variantId) return false;
    if (filters.channelId && event.channelId !== filters.channelId) return false;
    if (filters.eventType && event.eventType !== filters.eventType) return false;
    if (!filters.includeStale && !isCqbEventActive(event, nowMs)) return false;
    return true;
  });
  if (typeof filters.limit === 'number' && filters.limit > 0) return filtered.slice(0, filters.limit);
  return filtered;
}

export function listStoredCqbEvents(filters: CqbEventListFilters = {}): CqbEvent[] {
  return listCqbEvents(cqbEventStore, filters);
}

export function subscribeCqbEvents(listener: CqbEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetCqbEventStore() {
  cqbEventStore = [];
}

export function getCqbEventDiagnostics(windowMs = 60000): CqbDiagnostics {
  const nowMs = Date.now();
  const eventsInWindow = cqbEventStore.filter((event) => nowMs - new Date(event.createdAt).getTime() <= windowMs);
  const perMinuteBase = windowMs <= 0 ? 0 : (eventsInWindow.length / windowMs) * 60000;
  const unscopedCount = eventsInWindow.filter((event) => !event.channelId).length;
  const counts = new Map<CqbEventType, number>();

  for (const event of eventsInWindow) {
    if (!BREVITY_EVENT_TYPES.has(event.eventType)) continue;
    counts.set(event.eventType, (counts.get(event.eventType) || 0) + 1);
  }

  const mostUsedBrevityMacros = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([eventType, count]) => ({ eventType, count }));

  return {
    generatedAt: new Date(nowMs).toISOString(),
    windowMs,
    eventsCreatedPerMinute: Number(perMinuteBase.toFixed(2)),
    unscopedPercent: eventsInWindow.length === 0 ? 0 : Number(((unscopedCount / eventsInWindow.length) * 100).toFixed(2)),
    mostUsedBrevityMacros,
  };
}

