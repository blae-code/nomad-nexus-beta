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

function createBase44Mock(actorProfile: any) {
  const eventLogStore: any[] = [];
  const notificationStore: any[] = [];

  const base44 = {
    integrations: {
      Core: {
        InvokeLLM: vi.fn(async () => ({
          draft_type: 'SITREP',
          summary: 'Draft generated from radio traffic.',
          sections: [{ heading: 'CONTACT', content: 'Hostiles spotted at marker C4.', citations: ['entry-1'] }],
          confidence: 0.82,
        })),
      },
    },
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
      },
      MemberProfile: {
        filter: createMemberProfileFilter(actorProfile),
        get: vi.fn(async (id: string) => (id === actorProfile.id ? actorProfile : null)),
      },
      EventLog: {
        list: vi.fn(async () => [...eventLogStore]),
        create: vi.fn(async (payload: any) => {
          const row = { id: `log-${eventLogStore.length + 1}`, created_date: new Date().toISOString(), ...payload };
          eventLogStore.push(row);
          return row;
        }),
      },
      Notification: {
        create: vi.fn(async (payload: any) => {
          const row = { id: `notif-${notificationStore.length + 1}`, created_date: new Date().toISOString(), ...payload };
          notificationStore.push(row);
          return row;
        }),
      },
      VoiceNet: {
        list: vi.fn(async () => []),
      },
      UserPresence: {
        list: vi.fn(async () => []),
        filter: vi.fn(async () => []),
      },
      BridgeSession: {
        list: vi.fn(async () => []),
      },
      Event: {
        get: vi.fn(async () => null),
      },
      Channel: {
        get: vi.fn(async () => ({ id: 'channel-1', name: 'ops' })),
      },
      Message: {
        create: vi.fn(async (payload: any) => ({ id: 'msg-1', created_date: new Date().toISOString(), ...payload })),
      },
    },
    __stores: {
      eventLogStore,
      notificationStore,
    },
  };

  return base44;
}

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateCommsConsole advanced voice controls', () => {
  it('sets discipline mode and handles request-to-speak lifecycle', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock(actorProfile);

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const setModeResp = await handler(buildRequest({
      action: 'set_voice_discipline_mode',
      netId: 'net-command',
      mode: 'REQUEST_TO_SPEAK',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const setModePayload = await setModeResp.json();
    expect(setModeResp.status).toBe(200);
    expect(setModePayload.discipline.mode).toBe('REQUEST_TO_SPEAK');

    const requestResp = await handler(buildRequest({
      action: 'request_to_speak',
      netId: 'net-command',
      reason: 'Need to call target',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const requestPayload = await requestResp.json();
    expect(requestResp.status).toBe(200);
    expect(requestPayload.request.status).toBe('PENDING');

    const resolveResp = await handler(buildRequest({
      action: 'resolve_speak_request',
      requestId: requestPayload.request.request_id,
      state: 'APPROVED',
      netId: 'net-command',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const resolvePayload = await resolveResp.json();
    expect(resolveResp.status).toBe(200);
    expect(resolvePayload.resolution.status).toBe('APPROVED');
  });

  it('captures radio log, voice clip, and generates structured AI draft', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock(actorProfile);

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const entryResp = await handler(buildRequest({
      action: 'append_radio_log_entry',
      netId: 'net-ops',
      speaker: 'Nomad',
      transcript: 'Contact front, heavy fighter at C4.',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    expect(entryResp.status).toBe(200);

    const clipResp = await handler(buildRequest({
      action: 'capture_voice_clip',
      netId: 'net-ops',
      clipSeconds: 60,
      ttlHours: 24,
      visibility: 'COMMAND',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const clipPayload = await clipResp.json();
    expect(clipResp.status).toBe(200);
    expect(clipPayload.clip.clip_seconds).toBe(60);

    const draftResp = await handler(buildRequest({
      action: 'generate_voice_structured_draft',
      netId: 'net-ops',
      draftType: 'SITREP',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const draftPayload = await draftResp.json();
    expect(draftResp.status).toBe(200);
    expect(draftPayload.draft.is_ai_draft).toBe(true);
    expect(draftPayload.draft.requires_confirmation).toBe(true);
  });

  it('sends command whisper and tracks receipt states', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock(actorProfile);

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const sendResp = await handler(buildRequest({
      action: 'send_command_whisper',
      targetMemberProfileId: 'member-2',
      voiceInstruction: 'Break right and hold low profile.',
      textSummary: 'Break right and hold.',
      eventId: 'event-1',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const sendPayload = await sendResp.json();
    expect(sendResp.status).toBe(200);
    expect(sendPayload.whisper.target_member_profile_id).toBe('member-2');

    const ackResp = await handler(buildRequest({
      action: 'acknowledge_command_whisper',
      whisperId: sendPayload.whisper.whisper_id,
      state: 'ACK',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    expect(ackResp.status).toBe(200);

    const listResp = await handler(buildRequest({
      action: 'list_command_whispers',
      eventId: 'event-1',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const listPayload = await listResp.json();
    expect(listResp.status).toBe(200);
    expect(Array.isArray(listPayload.whispers)).toBe(true);
    expect(listPayload.whispers[0].status).toBe('ACK');
  });

  it('publishes command bus actions and configures secure mode', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock(actorProfile);

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const secureResp = await handler(buildRequest({
      action: 'set_voice_secure_mode',
      netId: 'net-command',
      enabled: true,
      keyVersion: 'kv-42',
      recordingsDisabled: true,
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const securePayload = await secureResp.json();
    expect(secureResp.status).toBe(200);
    expect(securePayload.secureMode.enabled).toBe(true);
    expect(securePayload.secureMode.recordings_disabled).toBe(true);

    const busResp = await handler(buildRequest({
      action: 'publish_command_bus_action',
      netId: 'net-command',
      busAction: 'PRIORITY_OVERRIDE',
      payload: { level: 'CRITICAL' },
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    expect(busResp.status).toBe(200);

    const listResp = await handler(buildRequest({
      action: 'list_command_bus_actions',
      netId: 'net-command',
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const listPayload = await listResp.json();
    expect(listResp.status).toBe(200);
    expect(Array.isArray(listPayload.actions)).toBe(true);
    expect(listPayload.actions[0].action).toBe('PRIORITY_OVERRIDE');
  });

  it('executes map command macros and returns structured effects', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    mockState.base44 = createBase44Mock(actorProfile);

    const handler = await loadHandler('../../functions/updateCommsConsole.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({
      action: 'execute_map_command_macro',
      macroId: 'REQUEST_SITREP_BURST',
      eventId: 'event-1',
      netId: 'net-command',
      lane: 'COMMAND',
      targetMemberProfileIds: ['member-2', 'member-3'],
      code: 'ACCESS-01',
      callsign: 'Nomad',
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.macroId).toBe('REQUEST_SITREP_BURST');
    expect(Array.isArray(payload.effects)).toBe(true);
    expect(payload.effects.some((entry: string) => entry.includes('SITREP'))).toBe(true);
    expect(Array.isArray(payload.logIds)).toBe(true);
  });
});
