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

const createMemberProfileFilter = (memberProfile: any) =>
  vi.fn(async (query: Record<string, unknown>) => {
    if (query?.id && query.id === memberProfile.id) return [memberProfile];
    if (query?.callsign && query.callsign === memberProfile.callsign) return [memberProfile];
    if (query?.display_callsign && query.display_callsign === memberProfile.display_callsign) return [memberProfile];
    return [];
  });

const createBase44Mock = ({
  memberProfile,
  command,
  members = [],
  keyStatus = 'ACTIVE',
}: {
  memberProfile: any;
  command?: any;
  members?: any[];
  keyStatus?: string;
}) => {
  const tacticalUpdate = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...command,
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
            redeemed_by_member_profile_ids: [memberProfile.id],
          },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: createMemberProfileFilter(memberProfile),
        list: vi.fn().mockResolvedValue(members),
      },
      TacticalCommand: {
        get: vi.fn().mockResolvedValue(command || null),
        update: tacticalUpdate,
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    },
  };

  return { base44, tacticalUpdate };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('escalateTacticalOrder', () => {
  it('returns unauthorized when no actor context is available', async () => {
    const memberProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ memberProfile, command: null, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/escalateTacticalOrder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ commandId: 'cmd-1' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when command does not exist', async () => {
    const memberProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ memberProfile, command: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/escalateTacticalOrder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({ commandId: 'missing', code: 'ACCESS-01', callsign: 'Nomad' })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Command not found' });
  });

  it('escalates command, logs event, and notifies command staff', async () => {
    const memberProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const command = {
      id: 'cmd-1',
      event_id: 'event-1',
      message: 'Hold line',
      status: 'ISSUED',
      priority: 'STANDARD',
      target_type: 'member',
      target_ids: ['member-2'],
      target_member_profile_ids: ['member-2'],
      issued_by_member_profile_id: 'member-3',
      requires_ack: true,
      escalation_count: 0,
      escalation_history: [],
    };
    const members = [
      { id: 'member-2', rank: 'MEMBER', roles: [] },
      { id: 'member-9', rank: 'PIONEER', roles: [] },
    ];
    const { base44, tacticalUpdate } = createBase44Mock({ memberProfile, command, members });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/escalateTacticalOrder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        commandId: 'cmd-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
        reason: 'No acknowledgement from assigned squad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      eventLogCreated: true,
      notificationsSent: 2,
    });
    expect(tacticalUpdate).toHaveBeenCalledWith(
      'cmd-1',
      expect.objectContaining({
        status: 'ESCALATED',
        priority: 'CRITICAL',
        escalation_count: 1,
        escalation_reason: 'No acknowledgement from assigned squad',
        escalated_by_member_profile_id: 'member-1',
      })
    );
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(2);
  });

  it('rejects escalation for non-command members that are not issuers', async () => {
    const memberProfile = { id: 'member-7', callsign: 'Scout', rank: 'MEMBER', roles: [] };
    const command = {
      id: 'cmd-2',
      event_id: 'event-2',
      message: 'Move to waypoint',
      status: 'ISSUED',
      target_member_profile_ids: ['member-2'],
      issued_by_member_profile_id: 'member-1',
      escalation_count: 0,
      escalation_history: [],
    };
    const { base44 } = createBase44Mock({ memberProfile, command });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/escalateTacticalOrder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        commandId: 'cmd-2',
        code: 'ACCESS-01',
        callsign: 'Scout',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
  });
});
