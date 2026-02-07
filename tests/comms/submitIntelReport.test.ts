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
  event,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  event?: any;
  keyStatus?: string;
}) => {
  const eventLogCreate = vi.fn(async (payload: Record<string, unknown>) => ({
    id: 'log-1',
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
            redeemed_by_member_profile_ids: [actorProfile.id],
          },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: createMemberProfileFilter(actorProfile),
        list: vi.fn().mockResolvedValue([
          actorProfile,
          { id: 'commander-1', rank: 'COMMANDER' },
          { id: 'founder-1', rank: 'FOUNDER' },
        ]),
      },
      Event: {
        get: vi.fn().mockResolvedValue(event || null),
        filter: vi.fn().mockResolvedValue(event ? [event] : []),
      },
      Incident: {
        list: vi.fn().mockResolvedValue([]),
        filter: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'incident-1', severity: 'CRITICAL' }),
      },
      EventLog: {
        create: eventLogCreate,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    },
  };

  return { base44, eventLogCreate };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('submitIntelReport', () => {
  it('returns unauthorized when actor context is not resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
      event: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ title: 'Intel', summary: 'Hostile signature' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns validation error when title or summary is missing', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile, event: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        title: 'Intel Missing Summary',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'title and summary required' });
  });

  it('returns not found when operation id is unknown', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile, event: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        title: 'Pirate scout',
        summary: 'Observed at jump lane',
        eventId: 'missing-event',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Operation not found' });
  });

  it('creates intel report with risk score and command notifications', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const event = { id: 'event-1', title: 'Operation Arc' };
    const { base44, eventLogCreate } = createBase44Mock({ actorProfile, event });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        title: 'Hostile wing',
        summary: 'Three fighters staging near OM-5',
        threatLevel: 'HIGH',
        threatType: 'hostile',
        location: 'Stanton OM-5',
        tags: ['distress', 'blockade'],
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      report: {
        title: 'Hostile wing',
        threatLevel: 'HIGH',
      },
    });
    expect(payload.report.riskScore).toBeGreaterThan(70);
    expect(Array.isArray(payload.report.recommendedChannels)).toBe(true);
    expect(eventLogCreate).toHaveBeenCalledTimes(1);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(2);
  });

  it('falls back to minimal event log payload when details field fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44, eventLogCreate } = createBase44Mock({ actorProfile, event: null });
    eventLogCreate
      .mockRejectedValueOnce(new Error('Unknown field details'))
      .mockResolvedValueOnce({ id: 'log-2', type: 'INTEL_REPORT' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        title: 'Signal intercept',
        summary: 'Encrypted traffic on relay band',
        threatLevel: 'MEDIUM',
        threatType: 'comms',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true });
    expect(eventLogCreate).toHaveBeenCalledTimes(2);
  });

  it('creates incident record for critical threats', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile, event: null });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/submitIntelReport.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        title: 'Capital signature',
        summary: 'Possible heavy vessel translation',
        threatLevel: 'CRITICAL',
        threatType: 'hostile',
        createIncident: true,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true });
    expect(base44.entities.Incident.create).toHaveBeenCalledTimes(1);
  });
});
