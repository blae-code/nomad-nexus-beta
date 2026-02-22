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

function createBase44Mock(input: {
  events?: any[];
  voiceNets?: any[];
  eventLogs?: any[];
  userPresence?: any[];
  memberProfiles?: any[];
  dutyAssignments?: any[];
}) {
  const eventStore = [...(input.events || [])];
  const voiceNetStore = [...(input.voiceNets || [])];
  const eventLogStore = [...(input.eventLogs || [])];
  const userPresenceStore = [...(input.userPresence || [])];
  const memberProfiles = [...(input.memberProfiles || [])];
  const dutyAssignments = [...(input.dutyAssignments || [])];

  return {
    entities: {
      Event: {
        list: vi.fn(async () => [...eventStore]),
        get: vi.fn(async (id: string) => eventStore.find((entry) => entry.id === id) || null),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id) {
            const row = eventStore.find((entry) => entry.id === String(query.id));
            return row ? [row] : [];
          }
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
      UserPresence: {
        list: vi.fn(async () => [...userPresenceStore]),
      },
      MemberProfile: {
        list: vi.fn(async () => [...memberProfiles]),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id) {
            const row = memberProfiles.find((entry) => entry.id === String(query.id));
            return row ? [row] : [];
          }
          return [];
        }),
      },
      EventDutyAssignment: {
        filter: vi.fn(async (query: Record<string, unknown>) => {
          const eventId = String(query?.event_id || '');
          return dutyAssignments.filter((entry) => String(entry?.event_id || '') === eventId);
        }),
      },
    },
    __stores: {
      voiceNetStore,
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

describe('sweepVoiceNetLifecycle', () => {
  it('provisions planned operation nets ahead of activation window', async () => {
    const nowMs = Date.parse('2026-02-22T12:00:00.000Z');
    mockState.adminUser = { id: 'admin-1', role: 'admin', email: 'admin@example.com' };
    mockState.base44 = createBase44Mock({
      events: [
        {
          id: 'event-1',
          title: 'Focused Strike',
          event_type: 'focused',
          status: 'scheduled',
          start_time: new Date(nowMs + 30 * 60 * 1000).toISOString(),
          end_time: new Date(nowMs + 90 * 60 * 1000).toISOString(),
          host_id: 'member-host',
        },
      ],
      voiceNets: [],
    });

    const handler = await loadHandler('../../functions/sweepVoiceNetLifecycle.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        now: new Date(nowMs).toISOString(),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.provisionedNets)).toBe(true);
    expect(payload.provisionedNets.length).toBeGreaterThan(0);
    const statuses = payload.provisionedNets.map((entry: any) => entry.status);
    expect(statuses.every((status: string) => status === 'planned')).toBe(true);
  });

  it('transfers owner when absent and closes empty temporary nets after grace', async () => {
    const nowMs = Date.parse('2026-02-22T12:00:00.000Z');
    mockState.adminUser = { id: 'admin-1', role: 'admin', email: 'admin@example.com' };
    mockState.base44 = createBase44Mock({
      voiceNets: [
        {
          id: 'net-close',
          code: 'TEMP-CLOSE',
          label: 'Temp Close',
          lifecycle_scope: 'temp_adhoc',
          temporary: true,
          owner_member_profile_id: 'member-1',
          status: 'active',
          last_empty_at: new Date(nowMs - 10 * 60 * 1000).toISOString(),
        },
        {
          id: 'net-transfer',
          code: 'TEMP-TRANSFER',
          label: 'Temp Transfer',
          lifecycle_scope: 'temp_adhoc',
          temporary: true,
          owner_member_profile_id: 'member-1',
          status: 'active',
        },
      ],
      userPresence: [
        {
          id: 'presence-1',
          net_id: 'net-transfer',
          member_profile_id: 'member-2',
          last_activity: new Date(nowMs - 60 * 1000).toISOString(),
        },
      ],
      memberProfiles: [
        { id: 'member-2', rank: 'SCOUT', roles: [] },
      ],
    });

    const handler = await loadHandler('../../functions/sweepVoiceNetLifecycle.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        now: new Date(nowMs).toISOString(),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.closedNets.some((entry: any) => entry.net_id === 'net-close')).toBe(true);
    expect(payload.ownerTransfers.some((entry: any) => entry.net_id === 'net-transfer')).toBe(true);
  });
});
