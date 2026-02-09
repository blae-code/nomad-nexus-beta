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
  voiceNets = [],
  userPresences = [],
  bridgeSessions = [],
}: {
  actorProfile: any;
  keyStatus?: string;
  eventLogs?: any[];
  voiceNets?: any[];
  userPresences?: any[];
  bridgeSessions?: any[];
}) => {
  const eventLogStore = [...eventLogs];
  const messageStore: any[] = [];
  const notificationStore: any[] = [];
  const channels = new Map<string, any>([
    ['channel-1', { id: 'channel-1', name: 'general' }],
    ['channel-2', { id: 'channel-2', name: 'ops' }],
  ]);
  const events = new Map<string, any>([
    ['event-1', { id: 'event-1', title: 'Operation Aegis', assigned_member_profile_ids: ['member-1', 'member-2'] }],
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
      VoiceNet: {
        list: vi.fn(async () => [...voiceNets]),
      },
      UserPresence: {
        list: vi.fn(async () => [...userPresences]),
        filter: vi.fn(async () => [...userPresences]),
      },
      BridgeSession: {
        list: vi.fn(async () => [...bridgeSessions]),
      },
      Event: {
        get: vi.fn(async (id: string) => events.get(id) || null),
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
    },
    __stores: {
      eventLogStore,
      messageStore,
      notificationStore,
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

  it('issues priority callouts and relays into text channel', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_priority_callout',
        eventId: 'event-1',
        channelId: 'channel-2',
        lane: 'COMMAND',
        priority: 'CRITICAL',
        message: 'All wings scramble now.',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'issue_priority_callout',
      callout: {
        event_id: 'event-1',
        channel_id: 'channel-2',
        priority: 'CRITICAL',
      },
    });
    expect(base44.entities.Message.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalled();
  });

  it('records and lists voice captions', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const createResponse = await handler(
      buildRequest({
        action: 'record_voice_caption',
        eventId: 'event-1',
        netId: 'net-cmd',
        speaker: 'Nomad',
        severity: 'ALERT',
        text: 'Target acquired at grid C4.',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    expect(createResponse.status).toBe(200);

    const listResponse = await handler(
      buildRequest({
        action: 'list_voice_captions',
        eventId: 'event-1',
        netId: 'net-cmd',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload).toMatchObject({
      success: true,
      action: 'list_voice_captions',
    });
    expect(Array.isArray(listPayload.captions)).toBe(true);
    expect(listPayload.captions[0]).toMatchObject({
      event_id: 'event-1',
      net_id: 'net-cmd',
      severity: 'ALERT',
      text: 'Target acquired at grid C4.',
    });
  });

  it('blocks voice moderation for non-command members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'moderate_voice_user',
        eventId: 'event-1',
        targetMemberProfileId: 'member-2',
        moderationAction: 'MUTE',
        reason: 'Noise discipline',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Command privileges required' });
  });

  it('moderates voice user and exposes moderation feed for command staff', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const moderateResponse = await handler(
      buildRequest({
        action: 'moderate_voice_user',
        eventId: 'event-1',
        targetMemberProfileId: 'member-2',
        moderationAction: 'KICK',
        reason: 'Comms discipline violation',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const moderatePayload = await moderateResponse.json();
    expect(moderateResponse.status).toBe(200);
    expect(moderatePayload).toMatchObject({
      success: true,
      action: 'moderate_voice_user',
      moderation: {
        event_id: 'event-1',
        moderation_action: 'KICK',
        target_member_profile_id: 'member-2',
      },
    });

    const listResponse = await handler(
      buildRequest({
        action: 'list_voice_moderation',
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload).toMatchObject({ success: true, action: 'list_voice_moderation' });
    expect(Array.isArray(listPayload.moderation)).toBe(true);
    expect(listPayload.moderation[0]).toMatchObject({
      moderation_action: 'KICK',
      target_member_profile_id: 'member-2',
    });
  });

  it('returns comms topology snapshot for tactical map overlays', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      voiceNets: [
        { id: 'net-1', code: 'OPS-CMD', label: 'Ops Command', discipline: 'focused', event_id: 'event-1' },
        { id: 'net-2', code: 'HANG-1', label: 'Hangout', discipline: 'casual' },
      ],
      userPresences: [
        { id: 'presence-1', member_profile_id: 'member-1', net_id: 'net-1', is_speaking: true },
        { id: 'presence-2', member_profile_id: 'member-2', current_net: { id: 'net-1', code: 'OPS-CMD' } },
      ],
      bridgeSessions: [
        { id: 'bridge-1', event_id: 'event-1', left_room: 'OPS-CMD', right_room: 'HANG-1', status: 'ACTIVE' },
      ],
      eventLogs: [
        {
          id: 'log-callout',
          created_date: new Date(Date.now() - 30 * 1000).toISOString(),
          type: 'COMMS_PRIORITY_CALLOUT',
          details: { event_id: 'event-1', lane: 'COMMAND', priority: 'HIGH', message: 'Push north flank' },
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
        action: 'get_comms_topology_snapshot',
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, action: 'get_comms_topology_snapshot' });
    expect(payload.topology).toBeTruthy();
    expect(Array.isArray(payload.topology.nets)).toBe(true);
    expect(payload.topology.nets[0]).toMatchObject({ id: 'net-1' });
    expect(payload.topology.memberships.length).toBe(2);
    expect(payload.topology.bridges.length).toBe(1);
    expect(payload.topology.callouts[0]).toMatchObject({ priority: 'HIGH' });
    expect(payload.topology.netLoad[0]).toMatchObject({
      net_id: 'net-1',
      participants: 2,
      callouts: 1,
    });
  });
});
