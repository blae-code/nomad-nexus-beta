import { describe, expect, it } from 'vitest';
import {
  canRunDataOpsScheduler,
  DATA_OPS_SCHEDULER_CONFIG,
  DATA_OPS_SCHEDULER_KEYS,
  readSchedulerTelemetry,
  recordSchedulerError,
  recordSchedulerRun,
  summarizeDueSyncPayload,
  tryAcquireSchedulerLease,
} from '../../src/components/admin/dataOpsScheduler';

function createStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe('dataOpsScheduler utils', () => {
  it('grants scheduler access for command/admin users', () => {
    expect(canRunDataOpsScheduler({ role: 'admin' })).toBe(true);
    expect(canRunDataOpsScheduler({ is_admin: true })).toBe(true);
    expect(canRunDataOpsScheduler({ member_profile_data: { rank: 'COMMANDER', roles: [] } })).toBe(true);
    expect(canRunDataOpsScheduler({ member_profile_data: { rank: 'SCOUT', roles: ['operations'] } })).toBe(true);
    expect(canRunDataOpsScheduler({ member_profile_data: { rank: 'SCOUT', roles: [] } })).toBe(false);
  });

  it('acquires and blocks lease based on ownership and expiry', () => {
    const storage = createStorage();
    const now = 1000;

    const first = tryAcquireSchedulerLease(storage, 'tab-a', now, 2000);
    expect(first).toMatchObject({ acquired: true, ownerId: 'tab-a' });

    const blocked = tryAcquireSchedulerLease(storage, 'tab-b', now + 500, 2000);
    expect(blocked).toMatchObject({ acquired: false, ownerId: 'tab-a', reason: 'held_by_other' });

    const expiredTakeover = tryAcquireSchedulerLease(storage, 'tab-b', now + 12000, 2000);
    expect(expiredTakeover).toMatchObject({ acquired: true, ownerId: 'tab-b' });
  });

  it('records run telemetry and computes due state', () => {
    const storage = createStorage();
    const now = 10000;
    recordSchedulerRun(storage, { synced: 2, skipped: 1, alerts: 0, staleCount: 1 }, now);

    const telemetryFresh = readSchedulerTelemetry(storage, now + 1000);
    expect(telemetryFresh.runDue).toBe(false);
    expect(telemetryFresh.lastResult).toMatchObject({ synced: 2, skipped: 1 });

    const telemetryDue = readSchedulerTelemetry(storage, now + DATA_OPS_SCHEDULER_CONFIG.minRunIntervalMs + 1);
    expect(telemetryDue.runDue).toBe(true);
  });

  it('records scheduler errors and exposes them via telemetry', () => {
    const storage = createStorage();
    const now = 5000;
    recordSchedulerError(storage, 'network timeout', now);
    const telemetry = readSchedulerTelemetry(storage, now + 1);

    expect(telemetry.lastError).toMatchObject({ message: 'network timeout' });
  });

  it('summarizes due-sync payload metrics', () => {
    const summary = summarizeDueSyncPayload({
      synced: [{ lane: 'live' }, { lane: 'market' }],
      skipped: [{ lane: 'reference' }],
      alertsEmitted: [{ lane: 'live' }],
      health: { staleCount: 2 },
    });

    expect(summary).toEqual({
      synced: 2,
      skipped: 1,
      alerts: 1,
      staleCount: 2,
    });
  });

  it('reports active leader when lease is still valid', () => {
    const storage = createStorage();
    const now = 10000;
    storage.setItem(DATA_OPS_SCHEDULER_KEYS.leaderLease, JSON.stringify({
      ownerId: 'tab-z',
      leaseUntil: now + 60000,
      heartbeatAt: new Date(now).toISOString(),
    }));

    const telemetry = readSchedulerTelemetry(storage, now + 500);
    expect(telemetry.leaderActive).toBe(true);
    expect(telemetry.leaderLease).toMatchObject({ ownerId: 'tab-z' });
  });
});
