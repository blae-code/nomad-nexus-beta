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
}: {
  actorProfile: any;
  targetProfiles?: any[];
  event: any;
  keyStatus?: string;
}) => {
  const profileStore = new Map<string, any>();
  profileStore.set(actorProfile.id, actorProfile);
  for (const profile of targetProfiles) {
    profileStore.set(profile.id, profile);
  }

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
        create: vi.fn(async () => ({ id: 'log-1' })),
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
      },
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
});
