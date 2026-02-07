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
  reports = [],
  logs = [],
}: {
  actorProfile: any;
  keyStatus?: string;
  reports?: any[];
  logs?: any[];
}) => {
  const reportStore = [...reports];
  const logStore = [...logs];

  const eventReportCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const id = `report-${reportStore.length + 1}`;
    const record = { id, created_date: new Date().toISOString(), ...payload };
    reportStore.push(record);
    return record;
  });

  const eventLogCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const id = `log-${logStore.length + 1}`;
    const record = { id, created_date: new Date().toISOString(), ...payload };
    logStore.push(record);
    return record;
  });

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
      },
      EventReport: {
        create: eventReportCreateMock,
        list: vi.fn(async () => [...reportStore]),
      },
      EventLog: {
        create: eventLogCreateMock,
        list: vi.fn(async () => [...logStore]),
      },
    },
  };

  return { base44, reportStore, logStore, eventReportCreateMock, eventLogCreateMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateDataVault', () => {
  it('returns unauthorized when actor context is not resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'create_knowledge_entry' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('creates knowledge entry with vault event log', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_knowledge_entry',
        title: 'Cargo lane doctrine',
        content: 'Use paired escorts for focused lanes',
        category: 'logistics',
        tags: ['convoy', 'focused'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'create_knowledge_entry',
      entry: { title: 'Cargo lane doctrine' },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
  });

  it('creates document and falls back to secondary payload on schema rejection', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44, eventReportCreateMock } = createBase44Mock({ actorProfile });
    eventReportCreateMock
      .mockRejectedValueOnce(new Error('Unknown field title'))
      .mockResolvedValueOnce({
        id: 'report-1',
        report_type: 'VAULT',
        content: 'Directive body',
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'create_document',
        title: 'Directive Archive',
        content: 'Directive body',
        documentType: 'VAULT',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'create_document',
    });
    expect(eventReportCreateMock).toHaveBeenCalledTimes(2);
  });

  it('blocks auto-archive action for non-curator members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_auto_archive',
        days: 30,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Curator privileges required' });
  });

  it('archives and unarchives records for curator members', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['archivist'] };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const archiveResponse = await handler(
      buildRequest({
        action: 'archive_record',
        recordType: 'event_report',
        recordId: 'report-22',
        reason: 'Historical',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const archivePayload = await archiveResponse.json();
    expect(archiveResponse.status).toBe(200);
    expect(archivePayload).toMatchObject({
      success: true,
      action: 'archive_record',
      archiveState: { status: 'archived', record_id: 'report-22' },
    });

    const unarchiveResponse = await handler(
      buildRequest({
        action: 'unarchive_record',
        recordType: 'event_report',
        recordId: 'report-22',
        reason: 'Reopened',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const unarchivePayload = await unarchiveResponse.json();
    expect(unarchiveResponse.status).toBe(200);
    expect(unarchivePayload).toMatchObject({
      success: true,
      action: 'unarchive_record',
      archiveState: { status: 'active', record_id: 'report-22' },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(2);
  });

  it('runs auto archive for stale reports and skips already archived records', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['archivist'] };
    const now = Date.now();
    const oldDate = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const logs = [
      {
        id: 'log-existing-1',
        type: 'DATA_VAULT_ARCHIVE_STATE',
        created_date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        details: {
          record_type: 'event_report',
          record_id: 'report-2',
          status: 'archived',
        },
      },
    ];
    const reports = [
      { id: 'report-1', created_date: oldDate, content: 'Old report 1' },
      { id: 'report-2', created_date: oldDate, content: 'Old report 2' },
    ];
    const { base44 } = createBase44Mock({ actorProfile, reports, logs });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateDataVault.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'run_auto_archive',
        days: 30,
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'run_auto_archive',
      archivedCount: 1,
      archivedIds: ['report-1'],
    });
  });
});
