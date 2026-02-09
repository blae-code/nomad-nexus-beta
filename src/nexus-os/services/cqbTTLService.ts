/**
 * CQB TTL Service (scaffold)
 *
 * Minimal helpers for classifying active vs stale tactical records.
 * TODO: integrate with persisted event streams and policy override layers.
 */

import type { CqbEvent } from '../schemas/coreSchemas';
import { isStaleAt } from '../schemas/coreSchemas';

export interface TTLPartition<T> {
  active: T[];
  stale: T[];
}

export function isCqbEventStale(event: Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>, nowMs = Date.now()): boolean {
  return isStaleAt(event.createdAt, event.ttlSeconds, nowMs);
}

export function isCqbEventActive(event: Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>, nowMs = Date.now()): boolean {
  return !isCqbEventStale(event, nowMs);
}

export function partitionCqbEventsByTTL<T extends Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>>(
  events: T[],
  nowMs = Date.now()
): TTLPartition<T> {
  return events.reduce<TTLPartition<T>>(
    (acc, event) => {
      if (isCqbEventStale(event, nowMs)) acc.stale.push(event);
      else acc.active.push(event);
      return acc;
    },
    { active: [], stale: [] }
  );
}
