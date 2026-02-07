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
}: {
  actorProfile: any;
  keyStatus?: string;
}) => {
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
        get: vi.fn(async (id: string) => (id === actorProfile.id ? actorProfile : { id })),
        update: vi.fn(),
      },
      EventLog: {
        create: vi.fn(async () => ({ id: 'log-1' })),
      },
      Notification: {
        create: vi.fn(async () => ({ id: 'notif-1' })),
      },
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

describe('updateReportBuilder', () => {
  it('returns unauthorized when actor session cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateReportBuilder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'save_template',
        templateName: 'Weekly Ops',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('saves a report template', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateReportBuilder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'save_template',
        templateName: 'Weekly Ops',
        description: 'Standard ops pulse report',
        filters: { reportType: 'operations' },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'save_template',
      template: {
        name: 'Weekly Ops',
      },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('requires command privileges to schedule reports', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateReportBuilder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'schedule_report',
        reportName: 'Weekly Ops',
        cadence: 'weekly',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Command privileges required' });
  });

  it('schedules report automation for command member', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateReportBuilder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'schedule_report',
        reportName: 'Ops Weekly',
        cadence: 'weekly',
        nextRunAt: '2026-03-01T12:00:00.000Z',
        filters: { reportType: 'operations' },
        memberProfileIds: ['member-2', 'member-3'],
        emailRecipients: ['ops@nexus.test'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'schedule_report',
      schedule: {
        report_name: 'Ops Weekly',
        cadence: 'weekly',
        status: 'scheduled',
      },
    });
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('sends report distribution and queues notifications', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateReportBuilder.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'send_distribution',
        subject: 'Ops Summary',
        message: 'Review this week performance report.',
        memberProfileIds: ['member-2', 'member-3'],
        emailRecipients: ['command@nexus.test'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'send_distribution',
      distribution: {
        subject: 'Ops Summary',
        delivered_to_members: 2,
        queued_emails: 1,
      },
    });
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(2);
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });
});
