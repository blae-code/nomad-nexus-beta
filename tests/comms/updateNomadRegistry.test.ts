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
  targetProfile,
  mentorProfile,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  targetProfile?: any;
  mentorProfile?: any;
  keyStatus?: string;
}) => {
  const profileStore = new Map<string, any>();
  profileStore.set(actorProfile.id, actorProfile);
  if (targetProfile?.id) profileStore.set(targetProfile.id, targetProfile);
  if (mentorProfile?.id) profileStore.set(mentorProfile.id, mentorProfile);

  const updateMock = vi.fn(async (memberId: string, payload: Record<string, unknown>) => {
    const current = profileStore.get(memberId);
    if (!current) throw new Error('Member not found');
    const next = { ...current, ...payload };
    profileStore.set(memberId, next);
    return next;
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
        get: vi.fn(async (id: string) => profileStore.get(id) || null),
        update: updateMock,
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
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

describe('updateNomadRegistry', () => {
  it('returns unauthorized when actor context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'set_availability',
        availability: 'available',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('rejects self-submitted reputation entries', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'submit_reputation',
        score: 5,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'Cannot submit reputation on your own profile' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('submits reputation and updates reliability score with notification', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'submit_reputation',
        targetMemberProfileId: 'member-2',
        score: 4,
        category: 'mission-delivery',
        note: 'Completed contract with no losses',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'submit_reputation',
      reliabilityScore: 4,
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('requires command privileges to award achievements', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', notes: '' };
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'award_achievement',
        targetMemberProfileId: 'member-2',
        title: 'Rescue Wing',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Command privileges required' });
  });

  it('updates mentor relationship with fallback field strategy', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', notes: '' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', notes: '' };
    const mentorProfile = { id: 'member-9', callsign: 'Lead', rank: 'COMMANDER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
      mentorProfile,
    });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field onboarding_mentor_member_profile_id'))
      .mockResolvedValueOnce({
        ...targetProfile,
        mentor_member_profile_id: 'member-9',
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'set_mentor_relationship',
        targetMemberProfileId: 'member-2',
        mentorMemberProfileId: 'member-9',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'set_mentor_relationship',
      mentorMemberProfileId: 'member-9',
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('blocks availability updates for other members without command role', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'set_availability',
        targetMemberProfileId: 'member-2',
        availability: 'focused',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      error: 'Cannot update availability for another member without command privileges',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported availability states', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNomadRegistry.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'set_availability',
        availability: 'invisible',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: 'Unsupported availability status: invisible',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
