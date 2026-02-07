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
  targetProfiles = [],
  event,
  keyStatus = 'ACTIVE',
  eventLogs = [],
}: {
  actorProfile: any;
  targetProfiles?: any[];
  event: any;
  keyStatus?: string;
  eventLogs?: any[];
}) => {
  const profileStore = new Map<string, any>();
  profileStore.set(actorProfile.id, actorProfile);
  for (const profile of targetProfiles) {
    profileStore.set(profile.id, profile);
  }

  const eventLogStore = [...eventLogs];
  const voiceNetStore: any[] = [];
  const eventParticipantStore: any[] = [
    { id: 'part-1', eventId: event.id, userId: actorProfile.id, callsign: actorProfile.callsign || 'Nomad' },
    { id: 'part-2', eventId: event.id, userId: 'member-2', callsign: 'Raven' },
  ];
  const eventReportStore: any[] = [];
  const missionBoardPostStore = new Map<string, any>([
    ['contract-1', { id: 'contract-1', title: 'Haul Med Supplies', type: 'hauling', status: 'open' }],
  ]);

  const eventStore = new Map<string, any>([[event.id, event]]);
  const updateEventMock = vi.fn(async (eventId: string, payload: Record<string, unknown>) => {
    const current = eventStore.get(eventId);
    if (!current) throw new Error('Operation not found');
    const next = { ...current, ...payload };
    eventStore.set(eventId, next);
    return next;
  });

  const base44 = {
    entities: {
      AccessKey: {
        filter: vi.fn().mockResolvedValue([
          { id: 'key-1', code: 'ACCESS-01', status: keyStatus, redeemed_by_member_profile_ids: [actorProfile.id] },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: createMemberProfileFilter(actorProfile),
        get: vi.fn(async (id: string) => profileStore.get(id) || null),
        update: vi.fn(),
      },
      Event: {
        get: vi.fn(async (id: string) => eventStore.get(id) || null),
        update: updateEventMock,
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
      VoiceNet: {
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `net-${voiceNetStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          voiceNetStore.push(row);
          return row;
        }),
      },
      EventParticipant: {
        filter: vi.fn(async (query: Record<string, unknown>) => {
          const eventId = String(query?.eventId || '');
          return eventParticipantStore.filter((row) => row.eventId === eventId);
        }),
      },
      EventReport: {
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `report-${eventReportStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          eventReportStore.push(row);
          return row;
        }),
      },
      MissionBoardPost: {
        get: vi.fn(async (id: string) => missionBoardPostStore.get(id) || null),
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
      },
    },
    __stores: {
      eventLogStore,
      voiceNetStore,
      eventReportStore,
    },
  };

  return { base44, updateEventMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateMissionControl', () => {
  const operation = {
    id: 'event-1',
    title: 'Focused Assault',
    host_id: 'member-1',
    assigned_user_ids: ['member-1', 'member-2'],
    start_time: '2026-02-07T18:00:00.000Z',
  };

  it('returns unauthorized when actor context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: operation,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_position_update',
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('logs live position updates', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'log_position_update',
        eventId: 'event-1',
        coordinates: { x: 112, y: 34, z: 998 },
        location: 'OM-2',
        note: 'Holding pattern',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'log_position_update',
      position: {
        event_id: 'event-1',
        location: 'OM-2',
      },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('triggers emergency beacon and sends notifications to assigned members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfiles = [{ id: 'member-2', callsign: 'Raven', rank: 'MEMBER' }];
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfiles,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'trigger_emergency_beacon',
        eventId: 'event-1',
        severity: 'CRITICAL',
        message: 'Hull breach on starboard side',
        location: 'Hangar C',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'trigger_emergency_beacon',
      beacon: { severity: 'CRITICAL' },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalled();
  });

  it('blocks role swap for other members without command privileges', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44, updateEventMock } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'swap_role_assignment',
        eventId: 'event-1',
        fromMemberProfileId: 'member-2',
        toMemberProfileId: 'member-3',
        role: 'lead-pilot',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      error: 'Command privileges required to swap roles for other members',
    });
    expect(updateEventMock).not.toHaveBeenCalled();
  });

  it('swaps assigned members with field fallback strategy', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44, updateEventMock } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    updateEventMock
      .mockRejectedValueOnce(new Error('Unknown field assigned_member_profile_ids'))
      .mockResolvedValueOnce({
        ...operation,
        assigned_user_ids: ['member-1', 'member-3'],
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'swap_role_assignment',
        eventId: 'event-1',
        fromMemberProfileId: 'member-2',
        toMemberProfileId: 'member-3',
        role: 'lead-pilot',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'swap_role_assignment',
      roleSwap: {
        from_member_profile_id: 'member-2',
        to_member_profile_id: 'member-3',
      },
    });
    expect(updateEventMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('updates pre-flight manifest entries', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'upsert_manifest_item',
        eventId: 'event-1',
        itemId: 'manifest-1',
        label: 'Fuel checks complete',
        checked: true,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'upsert_manifest_item',
      manifestItem: { item_id: 'manifest-1', checked: true },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('requires command privileges to award recognition', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const targetProfiles = [{ id: 'member-2', callsign: 'Raven', rank: 'MEMBER' }];
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfiles,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'award_recognition',
        eventId: 'event-1',
        targetMemberProfileId: 'member-2',
        badgeName: 'Operation Vanguard',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Command privileges required' });
  });

  it('awards recognition with notification', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const targetProfiles = [{ id: 'member-2', callsign: 'Raven', rank: 'MEMBER' }];
    const { base44 } = createBase44Mock({
      actorProfile,
      targetProfiles,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'award_recognition',
        eventId: 'event-1',
        targetMemberProfileId: 'member-2',
        badgeName: 'Operation Vanguard',
        commendation: 'Held flank under heavy fire',
        ribbon: 'Valor Ribbon',
        medal: 'Iron Star',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'award_recognition',
      recognition: {
        target_member_profile_id: 'member-2',
        badge_name: 'Operation Vanguard',
      },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });

  it('provisions operation voice topology for command staff', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'provision_operation_voice_topology',
        eventId: 'event-1',
        mode: 'focused',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'provision_operation_voice_topology',
      topology: { mode: 'focused' },
    });
    expect(Array.isArray(payload.topology?.nets)).toBe(true);
    expect(payload.topology.nets.length).toBeGreaterThanOrEqual(3);
    expect(base44.entities.VoiceNet.create).toHaveBeenCalled();
  });

  it('links contract posts and returns operation execution state', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: operation,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const linkResponse = await handler(
      buildRequest({
        action: 'link_contract_post',
        eventId: 'event-1',
        contractPostId: 'contract-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const linkPayload = await linkResponse.json();
    expect(linkResponse.status).toBe(200);
    expect(linkPayload).toMatchObject({
      success: true,
      action: 'link_contract_post',
      contract: { contract_post_id: 'contract-1' },
    });

    const stateResponse = await handler(
      buildRequest({
        action: 'get_operation_execution_state',
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const statePayload = await stateResponse.json();
    expect(stateResponse.status).toBe(200);
    expect(statePayload).toMatchObject({
      success: true,
      action: 'get_operation_execution_state',
    });
    expect(Array.isArray(statePayload.state?.contractLinks)).toBe(true);
    expect(statePayload.state.contractLinks[0]).toMatchObject({
      contract_post_id: 'contract-1',
    });
  });

  it('generates automated operation debrief with metrics', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      event: {
        ...operation,
        objectives: [
          { id: 'obj-1', text: 'Secure LZ', is_completed: true },
          { id: 'obj-2', text: 'Extract cargo', is_completed: false },
        ],
      },
      eventLogs: [
        {
          id: 'log-a',
          created_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          type: 'MISSION_CONTROL_TACTICAL_CALLOUT',
          details: { event_id: 'event-1', message: 'Contact north ridge', priority: 'HIGH' },
        },
        {
          id: 'log-b',
          created_date: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
          type: 'MISSION_CONTROL_BEACON',
          details: { event_id: 'event-1', severity: 'CRITICAL', message: 'Medic needed' },
        },
      ],
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateMissionControl.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'generate_operation_debrief',
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'generate_operation_debrief',
      metrics: {
        attendance_count: 2,
      },
    });
    expect(base44.entities.EventReport.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.EventLog.create).toHaveBeenCalled();
  });
});
