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
  const updateMock = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
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
        update: updateMock,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    },
  };

  return { base44, updateMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateMissionBoardPostStatus', () => {
  it('returns unauthorized when no actor context is resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile, post: null, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionBoardPostStatus.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ postId: 'post-1', action: 'claim' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('blocks claim when role requirements are not met', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: ['pilot'] };
    const post = {
      id: 'post-1',
      status: 'open',
      tags: ['role:medic'],
      posted_by_member_profile_id: 'member-9',
      claimed_by_member_profile_id: null,
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, post });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionBoardPostStatus.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-1',
        action: 'claim',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      error: 'Role requirements not met for this mission',
      requiredRoles: ['MEDIC'],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('claims post when role requirements are met', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: ['pilot'] };
    const post = {
      id: 'post-1',
      title: 'Escort cargo',
      status: 'open',
      tags: ['role:pilot'],
      posted_by_member_profile_id: 'member-9',
      claimed_by_member_profile_id: null,
      event_id: 'event-1',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, post });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionBoardPostStatus.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-1',
        action: 'claim',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'claim',
      nextStatus: 'claimed',
    });
    expect(updateMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        status: 'claimed',
        claimed_by_member_profile_id: 'member-1',
      })
    );
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('rejects complete when actor is not claimer or command staff', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const post = {
      id: 'post-2',
      status: 'claimed',
      tags: [],
      posted_by_member_profile_id: 'member-9',
      claimed_by_member_profile_id: 'member-3',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, post });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionBoardPostStatus.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-2',
        action: 'complete',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Only claimer or command staff can complete this post' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('marks reward as paid for completed mission by poster', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const post = {
      id: 'post-3',
      title: 'Salvage sweep',
      status: 'completed',
      tags: ['salvage'],
      posted_by_member_profile_id: 'member-1',
      claimed_by_member_profile_id: 'member-4',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, post });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionBoardPostStatus.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        postId: 'post-3',
        action: 'mark_paid',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'mark_paid',
    });
    expect(updateMock).toHaveBeenCalledWith(
      'post-3',
      expect.objectContaining({
        reward_status: 'PAID',
      })
    );
  });
});
