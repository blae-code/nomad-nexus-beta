import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

const mockState: { base44: any; adminUser: any } = {
  base44: null,
  adminUser: null,
};

function createMemberToken(input: { code: string; callsign: string; memberProfileId: string }) {
  return Buffer.from(
    JSON.stringify({
      code: input.code,
      callsign: input.callsign,
      memberProfileId: input.memberProfileId,
      timestamp: Date.now(),
    }),
    'utf-8'
  ).toString('base64');
}

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClient: () => mockState.base44,
  createClientFromRequest: () => ({
    auth: {
      me: vi.fn().mockResolvedValue(mockState.adminUser),
    },
  }),
}));

function createBase44Mock(input: {
  actorProfile: any;
  keyStatus?: string;
  voiceNets?: any[];
  events?: any[];
  eventDutyAssignments?: any[];
  eventLogs?: any[];
}) {
  const actorProfile = input.actorProfile;
  const keyStatus = input.keyStatus || 'ACTIVE';
  const voiceNetStore = [...(input.voiceNets || [])];
  const eventStore = new Map<string, any>((input.events || []).map((entry) => [entry.id, entry]));
  const dutyAssignments = [...(input.eventDutyAssignments || [])];
  const eventLogs = [...(input.eventLogs || [])];

  const key = {
    id: 'key-1',
    code: 'ACCESS-01',
    status: keyStatus,
    redeemed_by_member_profile_ids: [actorProfile.id],
  };

  return {
    entities: {
      AccessKey: {
        filter: vi.fn(async (query: Record<string, unknown>) => (query?.code === key.code ? [key] : [])),
        update: vi.fn(),
      },
      MemberProfile: {
        get: vi.fn(async (id: string) => (id === actorProfile.id ? actorProfile : null)),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id && query.id === actorProfile.id) return [actorProfile];
          if (query?.callsign && query.callsign === actorProfile.callsign) return [actorProfile];
          if (query?.display_callsign && query.display_callsign === actorProfile.display_callsign) return [actorProfile];
          return [];
        }),
      },
      VoiceNet: {
        list: vi.fn(async () => [...voiceNetStore]),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (!query || Object.keys(query).length === 0) return [...voiceNetStore];
          return voiceNetStore.filter((entry) =>
            Object.entries(query).every(([key, value]) => String(entry?.[key] || '') === String(value || ''))
          );
        }),
        get: vi.fn(async (id: string) => voiceNetStore.find((entry) => entry.id === id) || null),
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `net-${voiceNetStore.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          voiceNetStore.push(row);
          return row;
        }),
        update: vi.fn(async (id: string, payload: any) => {
          const index = voiceNetStore.findIndex((entry) => entry.id === id);
          if (index < 0) throw new Error('Voice net not found');
          voiceNetStore[index] = { ...voiceNetStore[index], ...payload };
          return voiceNetStore[index];
        }),
      },
      Event: {
        get: vi.fn(async (id: string) => eventStore.get(id) || null),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id && eventStore.has(String(query.id))) return [eventStore.get(String(query.id))];
          return [];
        }),
      },
      EventDutyAssignment: {
        filter: vi.fn(async (query: Record<string, unknown>) => {
          const eventId = String(query?.event_id || '');
          return dutyAssignments.filter((entry) => String(entry?.event_id || '') === eventId);
        }),
      },
      EventLog: {
        list: vi.fn(async () => [...eventLogs]),
        create: vi.fn(async (payload: any) => {
          const row = {
            id: `log-${eventLogs.length + 1}`,
            created_date: new Date().toISOString(),
            ...payload,
          };
          eventLogs.push(row);
          return row;
        }),
      },
    },
    __stores: {
      voiceNetStore,
      eventLogs,
    },
  };
}

afterEach(() => {
  cleanupDeno();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('manageVoiceNets', () => {
  it('denies permanent net creation for non-system-admin and non-pioneer', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    mockState.base44 = createBase44Mock({ actorProfile });

    const handler = await loadHandler('../../functions/manageVoiceNets.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_net',
        scope: 'permanent',
        code: 'PERM-1',
        label: 'Permanent One',
        memberToken: createMemberToken({ code: 'ACCESS-01', callsign: 'Nomad', memberProfileId: 'member-1' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      blockedReason: 'INSUFFICIENT_PERMISSIONS',
    });
  });

  it('enforces one active temp ad hoc channel per non-admin user', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    mockState.base44 = createBase44Mock({
      actorProfile,
      voiceNets: [
        {
          id: 'net-existing',
          code: 'TEMP-A',
          label: 'Temp Existing',
          lifecycle_scope: 'temp_adhoc',
          temporary: true,
          owner_member_profile_id: 'member-1',
          status: 'active',
        },
      ],
    });

    const handler = await loadHandler('../../functions/manageVoiceNets.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_net',
        scope: 'temp_adhoc',
        code: 'TEMP-B',
        label: 'Temp Two',
        memberToken: createMemberToken({ code: 'ACCESS-01', callsign: 'Nomad', memberProfileId: 'member-1' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      blockedReason: 'TEMP_LIMIT_REACHED',
    });
  });

  it('allows operation temp net creation when user holds operation role authority', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    mockState.base44 = createBase44Mock({
      actorProfile,
      events: [
        {
          id: 'event-1',
          title: 'Focused Raid',
          event_type: 'focused',
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          host_id: 'member-9',
          status: 'scheduled',
        },
      ],
      eventDutyAssignments: [
        {
          id: 'duty-1',
          event_id: 'event-1',
          member_profile_id: 'member-1',
          role_name: 'Squad Leader',
        },
      ],
    });

    const handler = await loadHandler('../../functions/manageVoiceNets.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_net',
        scope: 'temp_operation',
        eventId: 'event-1',
        code: 'OPS-A',
        label: 'Ops Lead',
        type: 'squad',
        discipline: 'focused',
        memberToken: createMemberToken({ code: 'ACCESS-01', callsign: 'Nomad', memberProfileId: 'member-1' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      net: {
        event_id: 'event-1',
        lifecycle_scope: 'temp_operation',
      },
    });
  });
});
