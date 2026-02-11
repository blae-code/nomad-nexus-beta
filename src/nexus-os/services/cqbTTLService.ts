/**
 * CQB TTL Service
 *
 * Helpers for classifying active vs stale tactical records with optional
 * per-record policy overrides.
 */

import type { CqbEvent } from '../schemas/coreSchemas';
import { isStaleAt } from '../schemas/coreSchemas';

export interface TTLPartition<T> {
  active: T[];
  stale: T[];
}

export interface TTLPolicyOverride {
  forceStale?: boolean;
  ttlSecondsOverride?: number;
}

export interface TTLPolicyResolverInput<T extends Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>> {
  event: T;
  nowMs: number;
}

export type TTLPolicyResolver<T extends Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>> =
  (input: TTLPolicyResolverInput<T>) => TTLPolicyOverride | null | undefined;

function resolveEffectiveTTL(
  event: Pick<CqbEvent, 'ttlSeconds'>,
  override?: TTLPolicyOverride | null
): number {
  if (typeof override?.ttlSecondsOverride === 'number' && override.ttlSecondsOverride > 0) {
    return override.ttlSecondsOverride;
  }
  return event.ttlSeconds;
}

export function isCqbEventStale(
  event: Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>,
  nowMs = Date.now(),
  override?: TTLPolicyOverride | null
): boolean {
  if (override?.forceStale) return true;
  return isStaleAt(event.createdAt, resolveEffectiveTTL(event, override), nowMs);
}

export function isCqbEventActive(
  event: Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>,
  nowMs = Date.now(),
  override?: TTLPolicyOverride | null
): boolean {
  return !isCqbEventStale(event, nowMs, override);
}

export function partitionCqbEventsByTTL<T extends Pick<CqbEvent, 'createdAt' | 'ttlSeconds'>>(
  events: T[],
  nowMs = Date.now(),
  policyResolver?: TTLPolicyResolver<T>
): TTLPartition<T> {
  return events.reduce<TTLPartition<T>>(
    (acc, event) => {
      const override = policyResolver ? policyResolver({ event, nowMs }) : null;
      if (isCqbEventStale(event, nowMs, override)) acc.stale.push(event);
      else acc.active.push(event);
      return acc;
    },
    { active: [], stale: [] }
  );
}
