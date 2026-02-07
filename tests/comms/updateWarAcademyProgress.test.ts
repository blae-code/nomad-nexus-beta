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
        get: vi.fn(async (id: string) => profileStore.get(id) || null),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id && profileStore.get(String(query.id))) return [profileStore.get(String(query.id))];
          for (const profile of profileStore.values()) {
            if (query?.callsign && query.callsign === profile.callsign) return [profile];
            if (query?.display_callsign && query.display_callsign === profile.display_callsign) return [profile];
          }
          return [];
        }),
        update: updateMock,
      },
      EventTemplate: {
        create: vi.fn(async (payload: Record<string, unknown>) => ({ id: 'template-1', ...payload })),
        update: vi.fn(async (_id: string, payload: Record<string, unknown>) => ({ id: 'template-1', ...payload })),
      },
      Event: {
        create: vi.fn(async (payload: Record<string, unknown>) => ({ id: 'event-1', ...payload })),
      },
      EventLog: {
        create: vi.fn(async (payload: Record<string, unknown>) => ({ id: 'log-1', ...payload })),
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
      },
    },
  };

  return { base44, updateMock, profileStore };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateWarAcademyProgress', () => {
  it('returns unauthorized when actor cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'complete_scenario' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('blocks scenario creation for non-instructor members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_scenario',
        scenario: { name: 'Boarding Drill' },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Instructor privileges required' });
  });

  it('upserts training scenario for instructor members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['instructor'] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_scenario',
        scenario: {
          name: 'Combat Recovery',
          description: 'Recover disabled pilot under fire',
          difficulty: 'advanced',
          tags: ['medical', 'rescue'],
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, action: 'upsert_scenario' });
    expect(base44.entities.EventTemplate.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('completes scenario and falls back to secondary milestone field', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = {
      id: 'member-1',
      callsign: 'Nomad',
      onboarding_pipeline: [
        { id: 'training', label: 'Finish basic training', status: 'pending' },
      ],
      onboarding_training_milestones: [],
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, targetProfile });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field training_milestones'))
      .mockResolvedValueOnce({
        ...targetProfile,
        onboarding_training_milestones: [{ id: 'sim-1', title: 'Medical Run', status: 'complete' }],
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'complete_scenario',
        scenarioId: 'sim-1',
        scenarioTitle: 'Medical Run',
        score: 92,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, action: 'complete_scenario' });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('issues certification and notifies target member', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['instructor'] };
    const targetProfile = { id: 'member-2', callsign: 'Raven', certifications: [] };
    const { base44 } = createBase44Mock({ actorProfile, targetProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_certification',
        targetMemberProfileId: 'member-2',
        certificationName: 'Advanced Extraction',
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
    });
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('creates simulation event for instructor members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['training'] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateWarAcademyProgress.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_simulation',
        title: 'Sector Breach Simulation',
        description: 'Live-fire breach response rehearsal',
        start_time: '2026-02-20T18:00:00.000Z',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'create_simulation',
      simulation: { title: 'Sector Breach Simulation' },
    });
    expect(base44.entities.Event.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });
});
