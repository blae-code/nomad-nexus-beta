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
  operation,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  operation?: any;
  keyStatus?: string;
}) => {
  const eventUpdate = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...operation,
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
      Event: {
        get: vi.fn().mockResolvedValue(operation || null),
        update: eventUpdate,
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    },
  };

  return { base44, eventUpdate };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('linkMissionToOperation', () => {
  const missionPayload = {
    id: 'mission-12',
    title: 'Clear bunker at Security Post',
    category: 'combat',
    difficulty: 'medium',
  };

  it('returns unauthorized when actor context is unavailable', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      operation: null,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/linkMissionToOperation.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ operationId: 'op-1', mission: missionPayload }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when operation does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      operation: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/linkMissionToOperation.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        operationId: 'missing-op',
        mission: missionPayload,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Operation not found' });
  });

  it('rejects linking for non-command non-host members', async () => {
    const actorProfile = { id: 'member-7', callsign: 'Scout', rank: 'MEMBER', roles: [] };
    const operation = {
      id: 'op-1',
      title: 'Pyro patrol',
      host_id: 'member-2',
      objectives: [],
      linked_missions: [],
    };
    const { base44, eventUpdate } = createBase44Mock({
      actorProfile,
      operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/linkMissionToOperation.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        operationId: 'op-1',
        mission: missionPayload,
        code: 'ACCESS-01',
        callsign: 'Scout',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it('links mission and falls back to mission_catalog_entries when linked_missions field fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const operation = {
      id: 'op-1',
      title: 'Pyro patrol',
      host_id: 'member-2',
      objectives: [],
      linked_missions: [],
    };
    const { base44, eventUpdate } = createBase44Mock({
      actorProfile,
      operation,
    });
    eventUpdate
      .mockRejectedValueOnce(new Error('Unknown field linked_missions'))
      .mockResolvedValueOnce({
        ...operation,
        mission_catalog_entries: [missionPayload],
        objectives: [
          {
            id: 'mission_mission-12',
            text: 'Run mission: Clear bunker at Security Post',
            is_completed: false,
          },
        ],
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/linkMissionToOperation.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        operationId: 'op-1',
        mission: missionPayload,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      linkedField: 'mission_catalog_entries',
      alreadyLinked: false,
      eventLogCreated: true,
    });
    expect(eventUpdate).toHaveBeenCalledTimes(2);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate existing linked mission', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const operation = {
      id: 'op-1',
      title: 'Pyro patrol',
      host_id: 'member-2',
      objectives: [
        {
          id: 'mission_mission-12',
          text: 'Run mission: Clear bunker at Security Post',
          is_completed: false,
          mission_catalog_id: 'mission-12',
        },
      ],
      linked_missions: [missionPayload],
    };
    const { base44, eventUpdate } = createBase44Mock({
      actorProfile,
      operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/linkMissionToOperation.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        operationId: 'op-1',
        mission: missionPayload,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      alreadyLinked: true,
      linkedField: 'linked_missions',
    });
    expect(eventUpdate).toHaveBeenCalledTimes(1);
  });
});
