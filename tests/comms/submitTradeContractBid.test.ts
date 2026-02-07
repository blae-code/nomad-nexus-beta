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
  post,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  post?: any;
  keyStatus?: string;
}) => {
  const postUpdate = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...post,
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
      MissionBoardPost: {
        get: vi.fn().mockResolvedValue(post || null),
        update: postUpdate,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    },
  };

  return { base44, postUpdate };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('submitTradeContractBid', () => {
  it('returns unauthorized when actor context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      post: null,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitTradeContractBid.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ postId: 'post-1', amount: 1000 }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when contract post does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      post: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitTradeContractBid.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'missing',
        amount: 1200,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Contract post not found' });
  });

  it('rejects bid when contract is not open', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const post = {
      id: 'post-1',
      title: 'Consignment route',
      status: 'claimed',
      tags: [],
    };
    const { base44, postUpdate } = createBase44Mock({
      actorProfile,
      post,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitTradeContractBid.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-1',
        amount: 1800,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ error: 'Bids are only allowed on open contracts' });
    expect(postUpdate).not.toHaveBeenCalled();
  });

  it('submits bid and falls back to tags when bid_history field update fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const post = {
      id: 'post-2',
      title: 'Bulk salvage lot',
      status: 'open',
      tags: ['commerce'],
      bid_history: [],
      posted_by_member_profile_id: 'member-9',
      event_id: 'event-1',
    };
    const { base44, postUpdate } = createBase44Mock({
      actorProfile,
      post,
    });
    postUpdate
      .mockRejectedValueOnce(new Error('Unknown field bid_history'))
      .mockResolvedValueOnce({
        ...post,
        highest_bid_amount: 2400,
        tags: ['commerce', 'bid:member-1:2400'],
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitTradeContractBid.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-2',
        amount: 2400,
        note: 'Can pick up immediately',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      highestBid: 2400,
    });
    expect(postUpdate).toHaveBeenCalledTimes(2);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });
});
