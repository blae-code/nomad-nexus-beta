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
  ownerProfile,
  objective,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  ownerProfile?: any;
  objective?: any;
  keyStatus?: string;
}) => {
  const updateMock = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...objective,
    ...payload,
  }));
  const memberGet = vi.fn(async (id: string) => {
    if (ownerProfile?.id === id) return ownerProfile;
    if (actorProfile?.id === id) return actorProfile;
    throw new Error('not found');
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
        get: memberGet,
        filter: createMemberProfileFilter(actorProfile),
      },
      StrategicObjective: {
        get: vi.fn().mockResolvedValue(objective || null),
        update: updateMock,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
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

describe('assignStrategicObjectiveOwner', () => {
  it('returns unauthorized when no actor context is resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile, objective: null, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/assignStrategicObjectiveOwner.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        objectiveId: 'obj-1',
        ownerMemberProfileId: 'member-2',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when objective does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile, objective: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/assignStrategicObjectiveOwner.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        objectiveId: 'missing',
        ownerMemberProfileId: 'member-2',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Objective not found' });
  });

  it('returns forbidden for non-command non-owner members', async () => {
    const actorProfile = { id: 'member-7', callsign: 'Scout', rank: 'MEMBER' };
    const objective = {
      id: 'obj-2',
      title: 'Secure route',
      owner_member_profile_id: 'member-3',
      created_by_member_profile_id: 'member-3',
    };
    const ownerProfile = { id: 'member-2', callsign: 'Lead', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile, ownerProfile, objective });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/assignStrategicObjectiveOwner.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        objectiveId: 'obj-2',
        ownerMemberProfileId: 'member-2',
        code: 'ACCESS-01',
        callsign: 'Scout',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
  });

  it('assigns owner using fallback field when primary field update fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const ownerProfile = { id: 'member-2', callsign: 'Lead', rank: 'MEMBER' };
    const objective = {
      id: 'obj-1',
      title: 'Hold perimeter',
      owner_member_profile_id: null,
      created_by_member_profile_id: 'member-1',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, ownerProfile, objective });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field owner_member_profile_id'))
      .mockResolvedValueOnce({ ...objective, assigned_member_profile_id: 'member-2' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/assignStrategicObjectiveOwner.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        objectiveId: 'obj-1',
        ownerMemberProfileId: 'member-2',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      assignmentField: 'assigned_member_profile_id',
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });
});
