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
  keyStatus = 'ACTIVE',
  eventLogs = [],
}: {
  actorProfile: any;
  keyStatus?: string;
  eventLogs?: any[];
}) => {
  const eventLogStore = [...eventLogs];
  const messageStore: any[] = [];
  const channels = new Map<string, any>([
    ['channel-1', { id: 'channel-1', name: 'general' }],
    ['channel-2', { id: 'channel-2', name: 'ops' }],
  ]);

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
        get: vi.fn(async (id: string) => (id === actorProfile.id ? actorProfile : null)),
        update: vi.fn(),
      },
      Channel: {
        get: vi.fn(async (id: string) => channels.get(id) || null),
      },
      EventLog: {
        list: vi.fn(async () => [...eventLogStore]),
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
    },
    __stores: {
      eventLogStore,
      messageStore,
    },
  };

  return { base44 };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateCommsConsole', () => {
  it('returns unauthorized when session cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'list_scheduled_messages',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('schedules a message when channel and payload are valid', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'schedule_message',
        channelId: 'channel-1',
        content: 'Rally in 15 minutes.',
        sendAt: new Date(Date.now() + 60 * 1000).toISOString(),
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'schedule_message',
      schedule: {
        channel_id: 'channel-1',
        content: 'Rally in 15 minutes.',
        status: 'scheduled',
      },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects schedule when channel does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'schedule_message',
        channelId: 'missing-channel',
        content: 'Rally in 15 minutes.',
        sendAt: new Date(Date.now() + 60 * 1000).toISOString(),
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Channel not found' });
  });

  it('blocks cancellation by non-owner without command privileges', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const futureIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { base44 } = createBase44Mock({
      actorProfile,
      eventLogs: [
        {
          id: 'log-a',
          created_date: new Date(Date.now() - 60 * 1000).toISOString(),
          type: 'COMMS_SCHEDULED_MESSAGE',
          details: {
            id: 'sched-1',
            channel_id: 'channel-1',
            content: 'Hold position',
            send_at: futureIso,
            status: 'scheduled',
            created_by_member_profile_id: 'member-9',
            created_at: new Date(Date.now() - 60 * 1000).toISOString(),
          },
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'cancel_scheduled_message',
        scheduleId: 'sched-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      error: 'Cannot cancel another member schedule without command privileges',
    });
  });

  it('dispatches due scheduled messages for command access', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const pastIso = new Date(Date.now() - 60 * 1000).toISOString();
    const { base44 } = createBase44Mock({
      actorProfile,
      eventLogs: [
        {
          id: 'log-a',
          created_date: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          type: 'COMMS_SCHEDULED_MESSAGE',
          details: {
            id: 'sched-1',
            channel_id: 'channel-2',
            content: 'Execute breach now',
            send_at: pastIso,
            status: 'scheduled',
            created_by_member_profile_id: 'member-1',
            created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          },
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'dispatch_due_messages',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'dispatch_due_messages',
      dispatchedCount: 1,
    });
    expect(base44.entities.Message.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });
});
