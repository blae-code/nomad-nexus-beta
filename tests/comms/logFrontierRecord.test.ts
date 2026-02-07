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
  event,
  members = [],
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  event?: any;
  members?: any[];
  keyStatus?: string;
}) => {
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
        list: vi.fn().mockResolvedValue(members),
      },
      Event: {
        get: vi.fn().mockResolvedValue(event || null),
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    },
  };

  return { base44 };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('logFrontierRecord', () => {
  it('returns unauthorized when actor context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: { id: 'event-1', title: 'Scout Run' },
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/logFrontierRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        recordType: 'discovery',
        eventId: 'event-1',
        region: 'Pyro sector',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('rejects claim submissions from non-command members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: { id: 'event-1', title: 'Scout Run' },
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/logFrontierRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        recordType: 'claim',
        eventId: 'event-1',
        region: 'Pyro sector',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Only command staff can register territory claims' });
  });

  it('records discoveries for members and skips claim notification fanout', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: { id: 'event-1', title: 'Scout Run' },
      members: [{ id: 'member-9', rank: 'COMMANDER', roles: [] }],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/logFrontierRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        recordType: 'discovery',
        eventId: 'event-1',
        region: 'Yela asteroid field',
        coordinates: 'YELA-44',
        notes: 'Rich ore signatures',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      recordType: 'discovery',
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FRONTIER_DISCOVERY',
        event_id: 'event-1',
      })
    );
    expect(base44.entities.Notification.create).not.toHaveBeenCalled();
  });

  it('records command territory claim and notifies staff', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const members = [
      { id: 'member-2', rank: 'PIONEER', roles: [] },
      { id: 'member-3', rank: 'MEMBER', roles: ['officer'] },
      { id: 'member-1', rank: 'COMMANDER', roles: [] },
    ];
    const { base44 } = createBase44Mock({
      actorProfile,
      event: { id: 'event-1', title: 'Claim Run' },
      members,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/logFrontierRecord.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        recordType: 'claim',
        eventId: 'event-1',
        region: 'Pyro 3 Ridge',
        coordinates: 'PYR3-17',
        notes: 'Secured by Ranger wing',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      recordType: 'claim',
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TERRITORY_CLAIM',
        event_id: 'event-1',
      })
    );
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(2);
  });
});
