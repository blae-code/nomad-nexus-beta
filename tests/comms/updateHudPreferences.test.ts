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
  const updateMock = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...actorProfile,
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
        update: updateMock,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    },
  };

  return { base44, updateMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('updateHudPreferences', () => {
  it('returns unauthorized when no actor context is resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHudPreferences.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ preferences: { showOrders: true } }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('requires preferences object', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44 } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHudPreferences.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: 'preferences object required' });
  });

  it('rejects member attempting to update another member profile', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44, updateMock } = createBase44Mock({ actorProfile });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHudPreferences.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        targetMemberProfileId: 'member-2',
        preferences: { showOrders: false },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('persists preferences using fallback field when primary field fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const { base44, updateMock } = createBase44Mock({ actorProfile });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field hud_preferences'))
      .mockResolvedValueOnce({
        ...actorProfile,
        hud_mode_preferences: {
          showOrders: false,
          showAlerts: true,
          compactMap: false,
        },
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateHudPreferences.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        preferences: {
          showOrders: false,
          showAlerts: true,
          compactMap: false,
          orderLimit: 99,
          alertLimit: 1,
          alertSeverityFilter: 'high',
          textSize: 'lg',
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      updatedField: 'hud_mode_preferences',
      preferences: {
        showOrders: false,
        showAlerts: true,
        compactMap: false,
        orderLimit: 50,
        alertLimit: 5,
        alertSeverityFilter: 'HIGH',
        textSize: 'lg',
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(base44.entities.Notification.create).toHaveBeenCalledTimes(1);
  });
});
