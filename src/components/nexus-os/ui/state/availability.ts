/**
 * Shared availability states for degraded-mode UX consistency.
 */

export type AvailabilityState =
  | 'OK'
  | 'LOADING'
  | 'EMPTY'
  | 'STALE'
  | 'CONFLICT'
  | 'ERROR'
  | 'UNKNOWN';

interface AvailabilityMeta {
  label: string;
  tone: 'neutral' | 'active' | 'ok' | 'warning' | 'danger';
  copy: string;
}

const AVAILABILITY_META: Record<AvailabilityState, AvailabilityMeta> = {
  OK: { label: 'OK', tone: 'ok', copy: 'Data is available and within expected freshness bounds.' },
  LOADING: { label: 'LOADING', tone: 'active', copy: 'Loading scoped data.' },
  EMPTY: { label: 'EMPTY', tone: 'neutral', copy: 'No scoped data currently available.' },
  STALE: { label: 'STALE', tone: 'warning', copy: 'Data is available but stale by TTL policy.' },
  CONFLICT: { label: 'CONFLICT', tone: 'warning', copy: 'Conflicting claims detected. Review provenance.' },
  ERROR: { label: 'ERROR', tone: 'danger', copy: 'Data could not be loaded or validated.' },
  UNKNOWN: { label: 'UNKNOWN', tone: 'neutral', copy: 'State cannot be determined from current context.' },
};

export function availabilityLabel(state: AvailabilityState): string {
  return AVAILABILITY_META[state].label;
}

export function availabilityTone(state: AvailabilityState): AvailabilityMeta['tone'] {
  return AVAILABILITY_META[state].tone;
}

export function availabilityCopy(state: AvailabilityState, reason?: string): string {
  if (reason?.trim()) return reason.trim();
  return AVAILABILITY_META[state].copy;
}

export function resolveAvailabilityState(input: {
  loading?: boolean;
  error?: string | null;
  count?: number;
  staleCount?: number;
  hasConflict?: boolean;
}): AvailabilityState {
  if (input.loading) return 'LOADING';
  if (input.error) return 'ERROR';
  if (input.hasConflict) return 'CONFLICT';
  if (typeof input.count === 'number' && input.count <= 0) return 'EMPTY';
  if (typeof input.staleCount === 'number' && input.staleCount > 0) return 'STALE';
  if (typeof input.count !== 'number') return 'UNKNOWN';
  return 'OK';
}

