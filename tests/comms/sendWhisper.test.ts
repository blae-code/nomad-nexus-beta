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

function createBase44Mock(actorProfile: any, members: any[] = []) {
  const messageStore: any[] = [];
  const notificationStore: any[] = [];
  const eventLogStore: any[] = [];
  const memberRows = members.length > 0 ? members : [actorProfile];
  return {
    entities: {
      AccessKey: {
        filter: vi.fn().mockResolvedValue([
          {
            id: 'key-1',
            code: 'ACCESS-01',
            status: 'ACTIVE',
            redeemed_by_member_profile_ids: [actorProfile.id],
          },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.callsign) return memberRows.filter((row) => row.callsign === query.callsign);
          if (query?.display_callsign) return memberRows.filter((row) => row.display_callsign === query.display_callsign);
          if (query?.id) return memberRows.filter((row) => row.id === query.id);
          return [];
        }),
        get: vi.fn(async (id: string) => memberRows.find((row) => row.id === id) || null),
        list: vi.fn(async () => memberRows),
      },
      Role: {
        get: vi.fn(async (_id: string) => null),
      },
      Squad: {
        list: vi.fn(async () => []),
      },
      SquadMembership: {
        filter: vi.fn(async () => []),
      },
      Message: {
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `msg-${messageStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          messageStore.push(row);
          return row;
        }),
      },
      Notification: {
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `notif-${notificationStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          notificationStore.push(row);
          return row;
        }),
      },
      EventLog: {
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `log-${eventLogStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          eventLogStore.push(row);
          return row;
        }),
      },
    },
    __stores: {
      messageStore,
      notificationStore,
      eventLogStore,
    },
  };
}

afterEach(() => {
  cleanupDeno();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('sendWhisper', () => {
  it('allows scoped ship role signal for pilot with member-only targets', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Falcon', rank: 'MEMBER', roles: ['pilot'] };
    const target = { id: 'member-2', callsign: 'Gunner', rank: 'MEMBER', roles: ['gunner'] };
    mockState.base44 = createBase44Mock(actorProfile, [actorProfile, target]);

    const handler = await loadHandler('../../functions/sendWhisper.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        code: 'ACCESS-01',
        callsign: 'Falcon',
        message: 'Check turret arc.',
        targetType: 'member',
        targetIds: ['member-2'],
        allowScopedRoleSignal: true,
        scope: 'ship',
        roleToken: 'gunner',
        scopeContext: { squadId: 'gce:alpha', vehicleId: 'ship-1' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: 'success', recipients_count: 1, scope: 'ship', role_token: 'gunner' });
  });

  it('blocks scoped role signal when authority does not match scope', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Cargo', rank: 'MEMBER', roles: ['cargo'] };
    const target = { id: 'member-2', callsign: 'Pilot', rank: 'MEMBER', roles: ['pilot'] };
    mockState.base44 = createBase44Mock(actorProfile, [actorProfile, target]);

    const handler = await loadHandler('../../functions/sendWhisper.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        code: 'ACCESS-01',
        callsign: 'Cargo',
        message: 'Signal check.',
        targetType: 'member',
        targetIds: ['member-2'],
        allowScopedRoleSignal: true,
        scope: 'squad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/scoped authority/i);
  });

  it('requires member target type for scoped role signal', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Falcon', rank: 'MEMBER', roles: ['pilot'] };
    mockState.base44 = createBase44Mock(actorProfile, [actorProfile]);

    const handler = await loadHandler('../../functions/sendWhisper.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        code: 'ACCESS-01',
        callsign: 'Falcon',
        message: 'Invalid target mode.',
        targetType: 'role',
        targetIds: ['Pilot'],
        allowScopedRoleSignal: true,
        scope: 'ship',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/targetType "member"/i);
  });

  it('caps recipients to the guardrail maximum', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'VOYAGER', roles: [] };
    const largeTargetList = Array.from({ length: 140 }, (_, index) => ({
      id: `member-${index + 2}`,
      callsign: `Target-${index + 2}`,
      rank: 'MEMBER',
      roles: [],
    }));
    mockState.base44 = createBase44Mock(actorProfile, [actorProfile, ...largeTargetList]);

    const handler = await loadHandler('../../functions/sendWhisper.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        code: 'ACCESS-01',
        callsign: 'Nomad',
        message: 'Fleet check.',
        targetType: 'member',
        targetIds: largeTargetList.map((entry) => entry.id),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.recipients_count).toBe(120);
  });
});
