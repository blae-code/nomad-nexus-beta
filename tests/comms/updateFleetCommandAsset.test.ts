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

const encodeState = (state: Record<string, unknown>) =>
  `[fleet_command_state]${JSON.stringify(state)}[/fleet_command_state]`;

const createBase44Mock = ({
  actorProfile,
  asset,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  asset?: any;
  keyStatus?: string;
}) => {
  const updateMock = vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...asset,
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
      },
      FleetAsset: {
        get: vi.fn().mockResolvedValue(asset || null),
        update: updateMock,
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
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

describe('updateFleetCommandAsset', () => {
  it('returns unauthorized when actor context cannot be resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      asset: null,
      keyStatus: 'REVOKED',
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(buildRequest({ assetId: 'asset-1', action: 'reserve_asset' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns not found when fleet asset does not exist', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const { base44 } = createBase44Mock({
      actorProfile,
      asset: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        assetId: 'missing-asset',
        action: 'reserve_asset',
        start_time: '2026-02-10T10:00:00.000Z',
        end_time: '2026-02-10T11:00:00.000Z',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ error: 'Fleet asset not found' });
  });

  it('reserves asset and logs event updates', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const asset = {
      id: 'asset-1',
      name: 'RSI Andromeda',
      status: 'OPERATIONAL',
      owner_member_profile_id: 'member-1',
      maintenance_notes: '',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, asset });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        assetId: 'asset-1',
        action: 'reserve_asset',
        reservation: {
          start_time: '2026-02-12T14:00:00.000Z',
          end_time: '2026-02-12T16:00:00.000Z',
          operation_mode: 'focused',
          purpose: 'Operation convoy cover',
        },
        eventId: 'event-1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      action: 'reserve_asset',
    });
    expect(updateMock).toHaveBeenCalledWith(
      'asset-1',
      expect.objectContaining({
        maintenance_notes: expect.stringContaining('[fleet_command_state]'),
      })
    );
    expect(base44.entities.EventLog.create).toHaveBeenCalledTimes(1);
  });

  it('blocks overlapping reservation for non-command staff', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const asset = {
      id: 'asset-2',
      name: 'Cutlass Blue',
      status: 'OPERATIONAL',
      owner_member_profile_id: 'member-1',
      maintenance_notes: encodeState({
        schema_version: 1,
        reservations: [
          {
            reservation_id: 'res-1',
            start_time: '2026-02-12T12:00:00.000Z',
            end_time: '2026-02-12T14:00:00.000Z',
            operation_mode: 'casual',
            purpose: 'Patrol',
            status: 'scheduled',
            created_by_member_profile_id: 'member-1',
            created_at: '2026-02-01T00:00:00.000Z',
          },
        ],
        loadout_library: [],
        active_loadout_id: null,
        engineering_queue: [],
      }),
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, asset });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        assetId: 'asset-2',
        action: 'reserve_asset',
        reservation: {
          start_time: '2026-02-12T13:30:00.000Z',
          end_time: '2026-02-12T15:00:00.000Z',
          operation_mode: 'focused',
          purpose: 'Escort',
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ error: 'Reservation window overlaps existing reservation' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects loadout updates for users who do not manage the asset', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER' };
    const asset = {
      id: 'asset-3',
      name: 'Caterpillar',
      owner_member_profile_id: 'member-99',
      assigned_member_profile_id: 'member-88',
      maintenance_notes: '',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, asset });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        assetId: 'asset-3',
        action: 'save_loadout',
        loadout: {
          name: 'Boarding Setup',
          profile: { weapon: 'FS-9', utility: 'medpens' },
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Only assigned crew or command staff can manage loadouts' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('falls back when structured field update fails', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER' };
    const asset = {
      id: 'asset-4',
      name: 'Redeemer',
      owner_member_profile_id: 'member-9',
      maintenance_notes: '',
    };
    const { base44, updateMock } = createBase44Mock({ actorProfile, asset });
    updateMock
      .mockRejectedValueOnce(new Error('Unknown field fleet_command_state'))
      .mockResolvedValueOnce({
        ...asset,
        maintenance_notes: '[fleet_command_state]{"schema_version":1}[/fleet_command_state]',
      });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/updateFleetCommandAsset.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        assetId: 'asset-4',
        action: 'reserve_asset',
        reservation: {
          start_time: '2026-02-15T10:00:00.000Z',
          end_time: '2026-02-15T12:00:00.000Z',
        },
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});
