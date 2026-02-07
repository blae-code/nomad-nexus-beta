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
  targetProfile: any;
  mentorProfile?: any;
  keyStatus?: string;
}) => {
  const profileStore = new Map<string, any>();
  profileStore.set(actorProfile.id, actorProfile);
  profileStore.set(targetProfile.id, targetProfile);
  if (mentorProfile?.id) profileStore.set(mentorProfile.id, mentorProfile);

  const updateMock = vi.fn(async (id: string, payload: Record<string, unknown>) => {
    const current = profileStore.get(id) || {};
    const updated = { ...current, ...payload, id };
    profileStore.set(id, updated);
    return updated;
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

describe('updateOnboardingPipeline', () => {
  it('returns unauthorized when no actor context is resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = { id: 'member-1', onboarding_pipeline: [] };
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateOnboardingPipeline.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'set_pipeline', pipelineTasks: [] }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('rejects non-staff member managing another recruit', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = { id: 'member-2', onboarding_pipeline: [] };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateOnboardingPipeline.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'set_pipeline',
        targetMemberProfileId: 'member-2',
        pipelineTasks: [],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects mentor assignment when selected mentor lacks permissions', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = { id: 'member-1', onboarding_pipeline: [] };
    const mentorProfile = { id: 'member-9', callsign: 'Rookie', rank: 'MEMBER', roles: [] };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
      mentorProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateOnboardingPipeline.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'assign_mentor',
        targetMemberProfileId: 'member-1',
        mentorMemberProfileId: 'member-9',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'Selected mentor lacks mentor permissions' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('assigns mentor and falls back to secondary mentor field', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const targetProfile = { id: 'member-2', callsign: 'Scout', onboarding_pipeline: [] };
    const mentorProfile = { id: 'member-9', callsign: 'Lead', rank: 'COMMANDER', roles: ['mentor'] };
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

    const handler = await loadHandler('../../functions/updateOnboardingPipeline.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'assign_mentor',
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
      action: 'assign_mentor',
      assignmentField: 'mentor_member_profile_id',
      mentorMemberProfileId: 'member-9',
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('upserts milestone and marks training task complete', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfile = {
      id: 'member-1',
      onboarding_pipeline: [
        { id: 'charter', label: 'Read the Redscar Charter', status: 'pending' },
        { id: 'dossier', label: 'Complete member dossier', status: 'pending' },
        { id: 'training', label: 'Finish basic training', status: 'pending' },
        { id: 'mentor', label: 'Assigned a mentor', status: 'pending' },
        { id: 'first-op', label: 'Participate in first operation', status: 'pending' },
      ],
      training_milestones: [],
    };
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateOnboardingPipeline.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_milestone',
        targetMemberProfileId: 'member-1',
        milestone: {
          title: 'Combat basic complete',
          notes: 'Passed scenario alpha',
          status: 'complete',
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'upsert_milestone',
    });
    expect(Array.isArray(payload.milestones)).toBe(true);
    expect(payload.milestones).toHaveLength(1);
    const trainingTask = payload.pipeline.find((task: any) => task.id === 'training');
    expect(trainingTask?.status).toBe('complete');
  });
});
