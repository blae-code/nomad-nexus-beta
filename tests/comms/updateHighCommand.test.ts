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
  const pollStore = new Map<string, any>();
  const voteStore: any[] = [];
  const logStore: any[] = [];
  const memberStore = new Map<string, any>();
  memberStore.set(actorProfile.id, actorProfile);
  memberStore.set('member-council-2', { id: 'member-council-2', rank: 'COMMANDER', roles: ['command'] });

  const pollCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const id = `poll-${pollStore.size + 1}`;
    const record = { id, ...payload };
    pollStore.set(id, record);
    return record;
  });

  const pollFilterMock = vi.fn(async (query: Record<string, unknown>) => {
    const all = Array.from(pollStore.values());
    return all.filter((poll) =>
      Object.entries(query || {}).every(([key, value]) => poll?.[key] === value)
    );
  });

  const pollVoteFilterMock = vi.fn(async (query: Record<string, unknown>) =>
    voteStore.filter((vote) =>
      Object.entries(query || {}).every(([key, value]) => vote?.[key] === value)
    )
  );

  const pollVoteCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const id = `vote-${voteStore.length + 1}`;
    const record = { id, ...payload };
    voteStore.push(record);
    return record;
  });

  const eventLogCreateMock = vi.fn(async (payload: Record<string, unknown>) => {
    const id = `log-${logStore.length + 1}`;
    const record = { id, ...payload };
    logStore.push(record);
    return record;
  });

  const notificationCreateMock = vi.fn(async () => ({ id: 'notif-1' }));

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
        list: vi.fn(async () => Array.from(memberStore.values())),
      },
      Poll: {
        create: pollCreateMock,
        get: vi.fn(async (id: string) => pollStore.get(id) || null),
        filter: pollFilterMock,
      },
      PollVote: {
        create: pollVoteCreateMock,
        filter: pollVoteFilterMock,
      },
      EventLog: {
        create: eventLogCreateMock,
      },
      Notification: {
        create: notificationCreateMock,
      },
    },
  };

  return {
    base44,
    pollStore,
    voteStore,
    logStore,
    pollCreateMock,
    pollVoteCreateMock,
    eventLogCreateMock,
    notificationCreateMock,
  };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateHighCommand', () => {
  it('returns unauthorized when actor context is missing', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({ actorProfile, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ action: 'issue_directive' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('blocks directive creation for non-council member', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_directive',
        title: 'Sector lock',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Council privileges required' });
  });

  it('issues directive for council member and fanout notification', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['command'] };
    const { base44, eventLogCreateMock, notificationCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'issue_directive',
        title: 'Priority doctrine update',
        summary: 'Focused operations receive first logistics allocation',
        policyArea: 'operations',
        priority: 'HIGH',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'issue_directive',
      directive: { title: 'Priority doctrine update', priority: 'HIGH' },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(1);
    expect(notificationCreateMock).toHaveBeenCalledTimes(1);
  });

  it('requires at least two options to open vote', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['command'] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        action: 'open_vote',
        question: 'Approve revised standing orders?',
        options: ['Approve'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'At least two vote options are required' });
  });

  it('opens vote and supports cast_vote with duplicate guard', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['command'] };
    const { base44, pollStore, pollVoteCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const openResponse = await handler(
      buildRequest({
        action: 'open_vote',
        question: 'Ratify convoy doctrine revision?',
        options: ['Yes', 'No', 'Abstain'],
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const openPayload = await openResponse.json();
    expect(openResponse.status).toBe(200);
    expect(openPayload).toMatchObject({ success: true, action: 'open_vote' });
    expect(pollStore.size).toBe(1);

    const poll = Array.from(pollStore.values())[0];
    const validOption = poll.options?.[0]?.id;

    const badVoteResponse = await handler(
      buildRequest({
        action: 'cast_vote',
        pollId: poll.id,
        optionId: 'opt_invalid',
        userId: 'user-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const badVotePayload = await badVoteResponse.json();
    expect(badVoteResponse.status).toBe(400);
    expect(badVotePayload).toMatchObject({ error: 'Invalid vote option' });

    const goodVoteResponse = await handler(
      buildRequest({
        action: 'cast_vote',
        pollId: poll.id,
        optionId: validOption,
        userId: 'user-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const goodVotePayload = await goodVoteResponse.json();
    expect(goodVoteResponse.status).toBe(200);
    expect(goodVotePayload).toMatchObject({ success: true, action: 'cast_vote' });
    expect(pollVoteCreateMock).toHaveBeenCalledTimes(1);

    const dupVoteResponse = await handler(
      buildRequest({
        action: 'cast_vote',
        pollId: poll.id,
        optionId: validOption,
        userId: 'user-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const dupVotePayload = await dupVoteResponse.json();
    expect(dupVoteResponse.status).toBe(400);
    expect(dupVotePayload).toMatchObject({ error: 'Vote already submitted' });
  });

  it('records diplomacy and alliance workflows', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: ['diplomat'] };
    const { base44, eventLogCreateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHighCommand.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const diplomacyResponse = await handler(
      buildRequest({
        action: 'register_diplomatic_entry',
        partnerName: 'Aegis Accord',
        stance: 'allied',
        status: 'active',
        terms: 'Shared rescue corridors',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const diplomacyPayload = await diplomacyResponse.json();
    expect(diplomacyResponse.status).toBe(200);
    expect(diplomacyPayload).toMatchObject({
      success: true,
      action: 'register_diplomatic_entry',
      entry: { partner_name: 'Aegis Accord', stance: 'allied' },
    });

    const allianceResponse = await handler(
      buildRequest({
        action: 'register_alliance',
        allianceName: 'Northern Pact',
        partners: ['Aegis Accord', 'Cinder Guild'],
        status: 'active',
        terms: 'Mutual defense',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const alliancePayload = await allianceResponse.json();
    expect(allianceResponse.status).toBe(200);
    expect(alliancePayload).toMatchObject({
      success: true,
      action: 'register_alliance',
      alliance: { alliance_name: 'Northern Pact', status: 'active' },
    });

    const updateResponse = await handler(
      buildRequest({
        action: 'update_alliance_status',
        allianceName: 'Northern Pact',
        status: 'suspended',
        reason: 'Escalation review',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const updatePayload = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updatePayload).toMatchObject({
      success: true,
      action: 'update_alliance_status',
      update: { alliance_name: 'Northern Pact', status: 'suspended' },
    });
    expect(eventLogCreateMock).toHaveBeenCalledTimes(3);
  });
});
