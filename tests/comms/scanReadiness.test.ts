import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

const mockState: { base44: any } = {
  base44: null,
};

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClient: () => mockState.base44,
  createClientFromRequest: () => ({
    auth: {
      me: vi.fn().mockResolvedValue(null),
    },
  }),
}));

function createBase44Mock({
  events = [],
  participantsByEvent = {},
  statusesByEvent = {},
  llmResponses = [],
}: {
  events?: any[];
  participantsByEvent?: Record<string, any[]>;
  statusesByEvent?: Record<string, any[]>;
  llmResponses?: any[];
}) {
  const agentLogs: any[] = [];
  const notifications: any[] = [];
  const llmQueue = [...llmResponses];
  const invokeLLM = vi.fn(async () => {
    if (llmQueue.length > 0) return llmQueue.shift();
    return {
      status: 'YELLOW',
      concerns: ['Ambiguous readiness posture.'],
      recommendations: ['Confirm readiness states with flight leads.'],
      requires_attention: true,
    };
  });

  const base44 = {
    asServiceRole: {
      entities: {
        Event: {
          filter: vi.fn(async () => [...events]),
        },
        EventParticipant: {
          filter: vi.fn(async ({ eventId }: { eventId: string }) => [...(participantsByEvent[eventId] || [])]),
        },
        PlayerStatus: {
          filter: vi.fn(async ({ event_id }: { event_id: string }) => [...(statusesByEvent[event_id] || [])]),
        },
        AIAgentLog: {
          create: vi.fn(async (payload: any) => {
            agentLogs.push(payload);
            return payload;
          }),
        },
        Notification: {
          create: vi.fn(async (payload: any) => {
            notifications.push(payload);
            return payload;
          }),
        },
      },
      integrations: {
        Core: {
          InvokeLLM: invokeLLM,
        },
      },
    },
    __stores: {
      agentLogs,
      notifications,
    },
    __mocks: {
      invokeLLM,
    },
  };

  return base44;
}

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
});

describe('scanReadiness', () => {
  it('returns no-op response when there are no active events', async () => {
    mockState.base44 = createBase44Mock({ events: [] });

    const handler = await loadHandler('../../functions/scanReadiness.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      scanned: 0,
      findings: 0,
      llmInvocations: 0,
      deterministicFindings: 0,
      message: 'No active events',
    });
  });

  it('creates deterministic RED alerts without invoking LLM', async () => {
    const event = {
      id: 'event-red',
      title: 'Red Event',
      objectives: ['Secure target'],
      assigned_asset_ids: ['asset-1'],
      command_staff: { commander_id: 'commander-1' },
    };

    mockState.base44 = createBase44Mock({
      events: [event],
      participantsByEvent: {
        [event.id]: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      },
      statusesByEvent: {
        [event.id]: [
          { status: 'READY' },
          { status: 'READY' },
          { status: 'DOWN' },
          { status: 'ENGAGED' },
        ],
      },
    });

    const handler = await loadHandler('../../functions/scanReadiness.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      READINESS_LLM_MODE: 'auto',
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      scanned: 1,
      findings: 1,
      llmInvocations: 0,
      deterministicFindings: 1,
      truncated: false,
    });
    expect(mockState.base44.__mocks.invokeLLM).toHaveBeenCalledTimes(0);
    expect(mockState.base44.__stores.agentLogs).toHaveLength(1);
    expect(mockState.base44.__stores.notifications).toHaveLength(1);
  });

  it('uses LLM refinement for ambiguous YELLOW posture in auto mode', async () => {
    const event = {
      id: 'event-yellow',
      title: 'Yellow Event',
      objectives: ['Hold route'],
      assigned_asset_ids: ['asset-2'],
      command_staff: { commander_id: 'commander-2' },
    };

    mockState.base44 = createBase44Mock({
      events: [event],
      participantsByEvent: {
        [event.id]: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      },
      statusesByEvent: {
        [event.id]: [
          { status: 'READY' },
          { status: 'READY' },
          { status: 'ENGAGED' },
          { status: 'IN_QUANTUM' },
        ],
      },
      llmResponses: [
        {
          status: 'YELLOW',
          concerns: ['Coordination friction on ingress.'],
          recommendations: ['Re-brief lane owners and tighten check-ins.'],
          requires_attention: true,
        },
      ],
    });

    const handler = await loadHandler('../../functions/scanReadiness.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      READINESS_LLM_MODE: 'auto',
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      scanned: 1,
      findings: 1,
      llmInvocations: 1,
      deterministicFindings: 0,
    });
    expect(mockState.base44.__mocks.invokeLLM).toHaveBeenCalledTimes(1);
    expect(mockState.base44.__stores.notifications).toHaveLength(0);
    expect(payload.details[0]).toMatchObject({
      event_id: 'event-yellow',
      status: 'YELLOW',
      assessment_mode: 'hybrid',
    });
  });

  it('honors READINESS_LLM_MODE=off and remains deterministic', async () => {
    const event = {
      id: 'event-off',
      title: 'Deterministic Event',
      objectives: ['Hold position'],
      assigned_asset_ids: ['asset-3'],
      command_staff: { commander_id: 'commander-3' },
    };

    mockState.base44 = createBase44Mock({
      events: [event],
      participantsByEvent: {
        [event.id]: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      },
      statusesByEvent: {
        [event.id]: [
          { status: 'READY' },
          { status: 'READY' },
          { status: 'ENGAGED' },
          { status: 'IN_QUANTUM' },
        ],
      },
    });

    const handler = await loadHandler('../../functions/scanReadiness.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      READINESS_LLM_MODE: 'off',
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      scanned: 1,
      findings: 1,
      llmInvocations: 0,
      deterministicFindings: 1,
    });
    expect(mockState.base44.__mocks.invokeLLM).toHaveBeenCalledTimes(0);
    expect(payload.details[0]).toMatchObject({
      event_id: 'event-off',
      assessment_mode: 'deterministic',
    });
  });
});
