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
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  targetProfile?: any;
  keyStatus?: string;
}) => {
  const profileStore = new Map<string, any>();
  profileStore.set(actorProfile.id, actorProfile);
  if (targetProfile?.id) profileStore.set(targetProfile.id, targetProfile);

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
      EventLog: {
        create: vi.fn(async () => ({ id: 'log-1' })),
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

describe('updateMemberProgression', () => {
  it('returns unauthorized when actor cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', certifications: [] };
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_certification',
        targetMemberProfileId: 'member-2',
        certificationName: 'Advanced Logistics',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('requires command privileges for certification changes', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', certifications: [] };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_certification',
        targetMemberProfileId: 'member-2',
        certificationName: 'Advanced Logistics',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Command privileges required' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns not found for unknown target member', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_certification',
        targetMemberProfileId: 'missing-member',
        certificationName: 'Advanced Logistics',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Target member not found' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('issues certification with fallback field strategy', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfile = { id: 'member-2', callsign: 'Raven', rank: 'MEMBER', certification_list: [] };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field certifications'))
      .mockResolvedValueOnce({
        ...targetProfile,
        certification_list: [{ id: 'cert_1', name: 'Advanced Logistics', level: 'ELITE', status: 'active' }],
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_certification',
        targetMemberProfileId: 'member-2',
        certificationName: 'Advanced Logistics',
        certificationLevel: 'ELITE',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'issue_certification',
      certification: {
        name: 'Advanced Logistics',
        level: 'ELITE',
        status: 'active',
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('revokes an existing certification by id', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfile = {
      id: 'member-2',
      callsign: 'Raven',
      rank: 'MEMBER',
      certifications: [{ id: 'cert-alpha', name: 'Advanced Logistics', level: 'ELITE', status: 'active' }],
    };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'revoke_certification',
        targetMemberProfileId: 'member-2',
        certificationId: 'cert-alpha',
        reason: 'Expired standard',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'revoke_certification',
      certification: {
        id: 'cert-alpha',
        name: 'Advanced Logistics',
        status: 'revoked',
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('returns not found when certification does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfile = {
      id: 'member-2',
      callsign: 'Raven',
      rank: 'MEMBER',
      certifications: [],
    };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMemberProgression.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'revoke_certification',
        targetMemberProfileId: 'member-2',
        certificationId: 'unknown-id',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Certification not found' });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
