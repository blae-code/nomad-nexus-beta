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
  asset,
  event,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  asset?: any;
  event?: any;
  keyStatus?: string;
}) => {
  const eventLogCreateMock = vi.fn(async (payload: Record<string, unknown>) => ({
    id: 'log-1',
    ...payload,
  }));

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
      },
      FleetAsset: {
        get: vi.fn(async (id: string) => (asset && id === asset.id ? asset : null)),
      },
      Event: {
        get: vi.fn(async (id: string) => (event && id === event.id ? event : null)),
      },
      EventLog: {
        create: eventLogCreateMock,
      },
    },
  };

  return { base44, eventLogCreateMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateFleetTrackingRecord', () => {
  it('returns unauthorized when actor context is not resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
      asset: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'log_deployment' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when logging deployment for unknown asset', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile, asset: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_deployment',
        assetId: 'missing-asset',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Fleet asset not found' });
  });

  it('blocks deployment logging for member without asset management rights', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const asset = {
      id: 'asset-1',
      name: 'Cutlass Blue',
      owner_member_profile_id: 'member-2',
      assigned_member_profile_id: 'member-3',
    };
    const { base44 } = createBase44Mock({ actorProfile, asset });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_deployment',
        assetId: 'asset-1',
        status: 'deployed',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Only assigned crew or command staff can log deployment history' });
  });

  it('logs deployment history and validates referenced operation', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['command'] };
    const asset = {
      id: 'asset-1',
      name: 'RSI Andromeda',
      owner_member_profile_id: 'member-9',
      assigned_member_profile_id: 'member-1',
      location: 'ARC L1',
    };
    const event = { id: 'event-1', title: 'Operation Halcyon' };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile, asset, event });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_deployment',
        assetId: 'asset-1',
        eventId: 'event-1',
        status: 'deployed',
        location: 'ARC L2',
        note: 'Escort deployment for focused operation',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'log_deployment',
      record: {
        asset_id: 'asset-1',
        event_id: 'event-1',
        status: 'deployed',
      },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns not found when referenced operation is missing', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['command'] };
    const asset = {
      id: 'asset-1',
      name: 'RSI Andromeda',
      owner_member_profile_id: 'member-1',
    };
    const { base44 } = createBase44Mock({ actorProfile, asset, event: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_deployment',
        assetId: 'asset-1',
        eventId: 'missing-event',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Operation not found' });
  });

  it('acknowledges condition alert and records acknowledgement log', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetTrackingRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'ack_condition_alert',
        assetId: 'asset-4',
        alertKey: 'critical-eng-open',
        severity: 'critical',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'ack_condition_alert',
      acknowledgement: {
        asset_id: 'asset-4',
        alert_key: 'critical-eng-open',
        severity: 'critical',
      },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
  });
});
