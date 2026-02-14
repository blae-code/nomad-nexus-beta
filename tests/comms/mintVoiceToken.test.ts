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

vi.mock('npm:livekit@2.0.0', () => {
  class AccessToken {
    apiKey: string;
    apiSecret: string;
    identity?: string;
    name?: string;
    metadata?: string;
    grant?: Record<string, unknown>;

    constructor(apiKey: string, apiSecret: string) {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
    }

    addGrant(grant: Record<string, unknown>) {
      this.grant = grant;
    }

    toJwt() {
      return JSON.stringify({
        identity: this.identity,
        name: this.name,
        metadata: this.metadata,
        grant: this.grant,
      });
    }
  }

  return { AccessToken };
});

const createBase44Mock = ({
  actorProfile,
  nets = [],
  events = [],
  eventLogs = [],
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  nets?: any[];
  events?: any[];
  eventLogs?: any[];
  keyStatus?: string;
}) => {
  const netStore = new Map<string, any>(nets.map((net) => [net.id, net]));
  const eventStore = new Map<string, any>(events.map((event) => [event.id, event]));
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
        get: vi.fn(async (id: string) => netStore.get(id) || null),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id) {
            const row = netStore.get(String(query.id));
            return row ? [row] : [];
          }
          return [];
        }),
      },
      Event: {
        get: vi.fn(async (id: string) => eventStore.get(id) || null),
        filter: vi.fn(async (query: Record<string, unknown>) => {
          if (query?.id) {
            const row = eventStore.get(String(query.id));
            return row ? [row] : [];
          }
          return [];
        }),
      },
      EventLog: {
        list: vi.fn(async () => [...eventLogs]),
      },
    },
  };
};

const testEnv = {
  BASE44_APP_ID: 'app',
  BASE44_SERVICE_ROLE_KEY: 'service-key',
  LIVEKIT_URL: 'https://livekit.example.com',
  LIVEKIT_API_KEY: 'key',
  LIVEKIT_API_SECRET: 'secret',
  NODE_ENV: 'production',
};

afterEach(() => {
  cleanupDeno();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('mintVoiceToken', () => {
  it('enforces focused membership from server net policy instead of client netType', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'SCOUT', membership: 'GUEST', roles: [] };
    mockState.base44 = createBase44Mock({
      actorProfile,
      nets: [{ id: 'net-focused', code: 'OPS-CMD', type: 'command', discipline: 'focused' }],
    });

    const handler = await loadHandler('../../functions/mintVoiceToken.ts', testEnv);
    const response = await handler(
      buildRequest({
        netId: 'net-focused',
        userId: 'member-1',
        netType: 'CASUAL',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      code: 'ACCESS_DENIED',
      reason: 'Focused nets require Member, Affiliate, or Partner membership.',
    });
  });

  it('blocks non-command users from joining event-bound nets when not assigned', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', membership: 'MEMBER', roles: [] };
    mockState.base44 = createBase44Mock({
      actorProfile,
      nets: [{ id: 'net-op', code: 'OPS-CMD', type: 'command', discipline: 'casual', event_id: 'event-1' }],
      events: [{ id: 'event-1', host_id: 'member-9', assigned_member_profile_ids: ['member-2'] }],
    });

    const handler = await loadHandler('../../functions/mintVoiceToken.ts', testEnv);
    const response = await handler(
      buildRequest({
        netId: 'net-op',
        userId: 'member-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      error: 'Voice net access denied for this operation',
    });
  });

  it('derives command-only discipline from server logs and withholds publish grant', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', membership: 'MEMBER', roles: [] };
    const now = Date.now();
    mockState.base44 = createBase44Mock({
      actorProfile,
      nets: [{ id: 'net-op', code: 'OPS-CMD', type: 'command', discipline: 'casual', event_id: 'event-1' }],
      events: [{ id: 'event-1', host_id: 'member-9', assigned_member_profile_ids: ['member-1'] }],
      eventLogs: [
        {
          id: 'log-1',
          type: 'COMMS_DISCIPLINE_MODE',
          created_date: new Date(now - 5000).toISOString(),
          details: { event_id: 'event-1', net_id: 'net-op', mode: 'COMMAND_ONLY' },
        },
      ],
    });

    const handler = await loadHandler('../../functions/mintVoiceToken.ts', testEnv);
    const response = await handler(
      buildRequest({
        netId: 'net-op',
        userId: 'member-1',
        disciplineMode: 'OPEN',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.policy).toMatchObject({
      disciplineMode: 'COMMAND_ONLY',
      canPublish: false,
    });
    const tokenPayload = JSON.parse(payload.token);
    expect(tokenPayload?.grant).toMatchObject({
      room: 'nexus-net-net-op',
      roomJoin: true,
      canPublish: false,
    });
  });

  it('allows request-to-speak publishing only after approved request state', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', membership: 'MEMBER', roles: [] };
    const now = Date.now();
    mockState.base44 = createBase44Mock({
      actorProfile,
      nets: [{ id: 'net-op', code: 'OPS-SQA', type: 'squad', discipline: 'casual', event_id: 'event-1' }],
      events: [{ id: 'event-1', host_id: 'member-9', assigned_member_profile_ids: ['member-1'] }],
      eventLogs: [
        {
          id: 'log-1',
          type: 'COMMS_DISCIPLINE_MODE',
          created_date: new Date(now - 8000).toISOString(),
          details: { event_id: 'event-1', net_id: 'net-op', mode: 'REQUEST_TO_SPEAK' },
        },
        {
          id: 'log-2',
          type: 'COMMS_SPEAK_REQUEST',
          created_date: new Date(now - 5000).toISOString(),
          details: { request_id: 'rts-1', event_id: 'event-1', net_id: 'net-op', requester_member_profile_id: 'member-1' },
        },
        {
          id: 'log-3',
          type: 'COMMS_SPEAK_REQUEST_STATE',
          created_date: new Date(now - 3000).toISOString(),
          details: { request_id: 'rts-1', event_id: 'event-1', net_id: 'net-op', status: 'APPROVED' },
        },
      ],
    });

    const handler = await loadHandler('../../functions/mintVoiceToken.ts', testEnv);
    const response = await handler(
      buildRequest({
        netId: 'net-op',
        userId: 'member-1',
        disciplineMode: 'OPEN',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.policy).toMatchObject({
      disciplineMode: 'REQUEST_TO_SPEAK',
      canPublish: true,
    });
  });
});
