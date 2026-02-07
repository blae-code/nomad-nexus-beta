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

  const eventLogCreateMock = vi.fn(async (payload: Record<string, unknown>) => ({
    id: `log-${Date.now()}`,
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
        get: vi.fn(async (id: string) => profileStore.get(id) || null),
        update: updateMock,
      },
      EventLog: {
        create: eventLogCreateMock,
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
      },
    },
  };

  return { base44, updateMock, eventLogCreateMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateNexusTraining', () => {
  it('returns unauthorized when actor session is missing', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'submit_feedback', message: 'Great tutorial' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('blocks tutorial authoring for non-training members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_tutorial',
        title: 'Command Palette Basics',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Training admin privileges required' });
  });

  it('upserts tutorial for training admin', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['training'] };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_tutorial',
        title: 'Platform Navigation',
        summary: 'Use the Hub and command palette effectively',
        tags: ['ui', 'navigation'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'upsert_tutorial',
      tutorial: { title: 'Platform Navigation' },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
  });

  it('completes tutorial and falls back to notes-only update payload', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile: actorProfile,
    });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field training_last_completed_at'))
      .mockResolvedValueOnce({
        ...actorProfile,
        notes: '[nexus_training_state]{"completed_tutorial_ids":["tutorial-hub"]}[/nexus_training_state]',
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'complete_tutorial',
        tutorialId: 'tutorial-hub',
        tutorialTitle: 'Hub Orientation',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'complete_tutorial',
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('issues platform certification and notifies target member', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['training'] };
    const targetProfile = { id: 'member-2', callsign: 'Raven', notes: '', certifications: [] };
    const { base44, updateMock } = createBase44Mock({
      actorProfile,
      targetProfile,
    });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field certifications'))
      .mockResolvedValueOnce({ ...targetProfile, certification_list: [{ name: 'Nexus Platform Operator' }] });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_platform_certification',
        targetMemberProfileId: 'member-2',
        certificationName: 'Nexus Platform Operator',
        certificationLevel: 'ADVANCED',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'issue_platform_certification',
      certification: { name: 'Nexus Platform Operator', level: 'ADVANCED' },
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('submits feedback and records training feedback log', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', notes: '' };
    const { base44, eventLogCreateMock } = createBase44Mock({
      actorProfile,
      targetProfile: actorProfile,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateNexusTraining.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'submit_feedback',
        tutorialId: 'tutorial-hub',
        rating: 5,
        message: 'The guide was clear and concise',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'submit_feedback',
      feedback: { tutorial_id: 'tutorial-hub', rating: 5 },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
  });
});
