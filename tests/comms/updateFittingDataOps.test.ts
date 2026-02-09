import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

const mockState: { base44: any; adminUser: any } = {
  base44: null,
  adminUser: null,
};

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClient: () => mockState.base44,
  createClientFromRequest: () => ({
    auth: {
      me: vi.fn().mockResolvedValue(mockState.adminUser),
    },
  }),
}));

const createMemberProfileFilter = (actorProfile: any) =>
  vi.fn(async (query: Record<string, unknown>) => {
    if (query?.id && query.id === actorProfile.id) return [actorProfile];
    if (query?.callsign && query.callsign === actorProfile.callsign) return [actorProfile];
    if (query?.display_callsign && query.display_callsign === actorProfile.display_callsign) return [actorProfile];
    return [];
  });

const createBase44Mock = ({
  actorProfile,
  keyStatus = 'ACTIVE',
  integrationConfigs = [],
  eventLogs = [],
}: {
  actorProfile: any;
  keyStatus?: string;
  integrationConfigs?: any[];
  eventLogs?: any[];
}) => {
  const configStore = [...integrationConfigs];
  const logStore = [...eventLogs];

  const integrationCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const record = {
      id: `cfg-${configStore.length + 1}`,
      created_date: new Date().toISOString(),
      ...payload,
    };
    configStore.push(record);
    return record;
  });

  const integrationUpdateMock = vi.fn(async (id: string, payload: Record<string, unknown>) => {
    const idx = configStore.findIndex((entry) => entry.id === id);
    if (idx < 0) throw new Error(`Integration config ${id} not found`);
    const updated = {
      ...configStore[idx],
      ...payload,
      updated_date: new Date().toISOString(),
    };
    configStore[idx] = updated;
    return updated;
  });

  const eventLogCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const record = {
      id: `log-${logStore.length + 1}`,
      created_date: new Date().toISOString(),
      ...payload,
    };
    logStore.push(record);
    return record;
  });

  const base44 = {
    entities: {
      AccessKey: {
        filter: vi.fn().mockResolvedValue([
          {
            id: 'key-1',
            code: 'ACCESS-01',
            status: keyStatus,
            redeemed_by_member_profile_ids: [actorProfile.id],
          },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: createMemberProfileFilter(actorProfile),
        get: vi.fn(async (id: string) => (id === actorProfile.id ? actorProfile : null)),
      },
      IntegrationConfig: {
        list: vi.fn(async () => [...configStore]),
        create: integrationCreateMock,
        update: integrationUpdateMock,
      },
      EventLog: {
        list: vi.fn(async () => [...logStore]),
        create: eventLogCreateMock,
      },
    },
    __stores: {
      configStore,
      logStore,
    },
    __mocks: {
      integrationCreateMock,
      integrationUpdateMock,
      eventLogCreateMock,
    },
  };

  return base44;
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateFittingDataOps', () => {
  it('returns unauthorized when auth context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock({ actorProfile, keyStatus: 'REVOKED' });

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'get_snapshot',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('saves lane source config and records config update log', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const base44 = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'save_source',
        lane: 'market',
        endpointUrl: 'https://provider.example/market',
        authHeader: 'Bearer token',
        cadenceMinutes: 10,
        ttlMinutes: 90,
        enabled: true,
        notes: 'Market feed',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'save_source',
      lane: 'market',
      source: {
        lane: 'market',
        endpointUrl: 'https://provider.example/market',
        cadenceMinutes: 10,
        ttlMinutes: 90,
      },
    });
    expect(base44.__mocks.integrationCreateMock).toHaveBeenCalledTimes(1);
    expect(base44.__mocks.eventLogCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns snapshot with lane freshness health and recent run feed', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const nowIso = new Date().toISOString();
    const base44 = createBase44Mock({
      actorProfile,
      integrationConfigs: [
        {
          id: 'cfg-ref',
          provider: 'FITTING_DATA_SOURCE',
          lane: 'reference',
          endpoint_url: 'https://provider.example/reference',
          cadence_minutes: 300,
          ttl_minutes: 1800,
          enabled: true,
        },
      ],
      eventLogs: [
        {
          id: 'snapshot-1',
          type: 'FIT_DATA_SNAPSHOT',
          created_date: nowIso,
          details: {
            lane: 'reference',
            generated_at: nowIso,
            source_mode: 'remote',
            source_version: 'ref-v1',
            record_count: 12,
            checksum: 'h1',
            records: [{ id: 'ship_gladius' }],
          },
        },
        {
          id: 'run-1',
          type: 'FIT_SYNC_RUN',
          created_date: nowIso,
          summary: 'Reference sync',
          details: {
            lane: 'reference',
            status: 'success',
            source_mode: 'remote',
            record_count: 12,
            started_at: nowIso,
            finished_at: nowIso,
          },
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'get_snapshot',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'get_snapshot',
      health: {
        lanes: {
          reference: {
            status: 'fresh',
            recordCount: 12,
          },
          market: {
            status: 'stale',
          },
        },
      },
    });
    expect(Array.isArray(payload.runs)).toBe(true);
    expect(payload.runs[0]).toMatchObject({
      lane: 'reference',
      status: 'success',
      sourceMode: 'remote',
    });
  });

  it('runs seed sync and writes snapshot + sync logs', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const base44 = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_sync',
        lane: 'reference',
        mode: 'seed',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'run_sync',
      lane: 'reference',
      snapshot: {
        lane: 'reference',
        source_mode: 'seed',
      },
    });
    expect(Number(payload?.snapshot?.record_count || 0)).toBeGreaterThan(0);
    expect(base44.__mocks.eventLogCreateMock).toHaveBeenCalledTimes(2);
    expect(base44.__stores.logStore.some((entry: any) => entry.type === 'FIT_DATA_SNAPSHOT')).toBe(true);
    expect(base44.__stores.logStore.filter((entry: any) => entry.type === 'FIT_SYNC_RUN').length).toBe(1);
  });

  it('falls back to seed when remote source fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const base44 = createBase44Mock({
      actorProfile,
      integrationConfigs: [
        {
          id: 'cfg-live',
          provider: 'FITTING_DATA_SOURCE',
          lane: 'live',
          endpoint_url: 'https://provider.example/live',
          enabled: true,
          cadence_minutes: 1,
          ttl_minutes: 5,
        },
      ],
    });
    mockState.base44 = base44;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Provider timeout')));

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_sync',
        lane: 'live',
        mode: 'auto',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      lane: 'live',
      snapshot: {
        source_mode: 'seed_on_error',
      },
    });
    expect(base44.__mocks.eventLogCreateMock).toHaveBeenCalledTimes(3);
    expect(base44.__stores.logStore.some((entry: any) => entry.details?.status === 'fallback')).toBe(true);
  });

  it('blocks sync when lane source is disabled and force is not set', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const base44 = createBase44Mock({
      actorProfile,
      integrationConfigs: [
        {
          id: 'cfg-market',
          provider: 'FITTING_DATA_SOURCE',
          lane: 'market',
          enabled: false,
          cadence_minutes: 15,
          ttl_minutes: 120,
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_sync',
        lane: 'market',
        mode: 'auto',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ error: 'Source lane market is disabled' });
  });

  it('runs due-sync orchestration only for lanes outside cadence', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const now = Date.now();
    const base44 = createBase44Mock({
      actorProfile,
      integrationConfigs: [
        {
          id: 'cfg-ref',
          provider: 'FITTING_DATA_SOURCE',
          lane: 'reference',
          enabled: true,
          cadence_minutes: 60,
          ttl_minutes: 1440,
        },
        {
          id: 'cfg-market',
          provider: 'FITTING_DATA_SOURCE',
          lane: 'market',
          enabled: true,
          cadence_minutes: 15,
          ttl_minutes: 120,
        },
      ],
      eventLogs: [
        {
          id: 'snap-ref',
          type: 'FIT_DATA_SNAPSHOT',
          created_date: new Date(now - 10 * 60 * 1000).toISOString(),
          details: {
            lane: 'reference',
            generated_at: new Date(now - 10 * 60 * 1000).toISOString(),
            source_mode: 'seed',
            source_version: 'seed-reference-v1',
            record_count: 5,
            checksum: 'h-ref',
            records: [{ id: 'ship_a' }],
          },
        },
        {
          id: 'snap-market',
          type: 'FIT_DATA_SNAPSHOT',
          created_date: new Date(now - 40 * 60 * 1000).toISOString(),
          details: {
            lane: 'market',
            generated_at: new Date(now - 40 * 60 * 1000).toISOString(),
            source_mode: 'seed',
            source_version: 'seed-market-v1',
            record_count: 4,
            checksum: 'h-market',
            records: [{ id: 'market_a' }],
          },
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_due_syncs',
        mode: 'seed',
        emitAlerts: false,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'run_due_syncs',
    });
    expect(Array.isArray(payload.synced)).toBe(true);
    expect(payload.synced.map((entry: any) => entry.lane).sort()).toEqual(['live', 'market']);
    expect(payload.skipped).toEqual(expect.arrayContaining([{ lane: 'reference', reason: 'not_due' }]));
    expect(base44.__mocks.eventLogCreateMock).toHaveBeenCalledTimes(4);
  });

  it('emits stale alerts on dry-run and throttles duplicate stale alerts', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const base44 = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFittingDataOps.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const first = await handler(
      buildRequest({
        action: 'run_due_syncs',
        dryRun: true,
        emitAlerts: true,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const firstPayload = await first.json();
    expect(first.status).toBe(200);
    expect(Array.isArray(firstPayload.alertsEmitted)).toBe(true);
    expect(firstPayload.alertsEmitted.length).toBe(3);
    expect(base44.__stores.logStore.filter((entry: any) => entry.type === 'FIT_SYNC_ALERT').length).toBe(3);

    const second = await handler(
      buildRequest({
        action: 'run_due_syncs',
        dryRun: true,
        emitAlerts: true,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const secondPayload = await second.json();
    expect(second.status).toBe(200);
    expect(secondPayload.alertsEmitted.length).toBe(0);
    expect(base44.__stores.logStore.filter((entry: any) => entry.type === 'FIT_SYNC_ALERT').length).toBe(3);
  });
});
